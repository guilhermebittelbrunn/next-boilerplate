# Análise e blueprint — Último acesso do usuário

- **Spec**: [`specs/user-activity-tracking.md`](../../../../specs/user-activity-tracking.md)
- **Rodada**: autônoma (`/cycle`). Ninguém foi consultado; as decisões estão no fim, com a alternativa
  descartada em cada uma.
- **Dependência**: `session-refresh`, entregue e mergeada em `cc93229` (PR #20).

---

## Aviso de abertura: as duas recomendações da spec não cabem juntas

A spec recomenda duas coisas que se excluem, e isso muda o desenho.

Ela pede janela de gravação de **15 minutos** (Perguntas em aberto, item 2) e, no mesmo documento, aponta
o ramo `{ refreshed: true }` de `sessionRefreshPOST` como a janela "que já tem um candidato natural"
(Riscos, item 4). Medido no código:

| medida | valor | evidência |
|--------|-------|-----------|
| fração da vida do cookie que dispara a renovação | `0.5` | `packages/auth/session.ts:30` |
| vida padrão do cookie | 5 dias | `packages/auth/session.ts:24` |
| idade mínima do cookie para `shouldRefreshSession` devolver `true` | **2,5 dias** | `packages/auth/session.ts:137-140` |

O ramo `{ refreshed: true }` (`packages/auth/session-routes.ts:108-122`) dispara **uma vez a cada 2,5
dias por usuário**, não a cada 15 minutos. Carimbar ali entregaria uma coluna com precisão de dois dias e
meio — o admin não conseguiria distinguir quem entrou hoje de quem entrou anteontem, que é a pergunta
operacional da spec.

O que de fato move o caminho, medido:

- `sessionRefreshPOST` tem um único chamador: `refreshSessionCookie` em `packages/auth/provider.tsx:204-232`,
  invocado por `applySignedInUser` (`provider.tsx:270`) a partir da assinatura `subscribeToIdTokenState`
  (`provider.tsx:310`).
- O QA de `session-refresh` mediu o driver: `onIdTokenChanged` dispara **de hora em hora**
  ([`test/report.md:271-273`](../../session-refresh/test/report.md)). Ou seja, o ramo `{ refreshed: false }`
  roda ~1×/hora por aba montada, e o ramo `{ refreshed: true }` ~1×/2,5 dias.

**Adotei a janela de 15 minutos e descartei o gancho no `{ refreshed: true }`.** O que a spec queria daquele
ramo era a garantia de custo, e ela sai de graça nos guards da `apps/api`, que já leem o perfil em toda
requisição autenticada. A justificativa completa está em 4.1.

---

## 1. Contexto da tarefa

**Em uma frase**: a listagem de usuários do admin passa a mostrar quando cada pessoa acessou o produto pela
última vez, a partir de um instante que a API carimba no perfil no máximo uma vez a cada 15 minutos.

### Objetivos

- Responder "quem ainda está usando isto" na tela onde o operador já está.
- Criar o instante que os KPIs de [`admin-analytics-dashboard`](../../../../specs/admin-analytics-dashboard.md)
  vão agregar depois.
- Manter o custo de escrita sob controle. O campo existe para ser gravado com frequência, então o limite de
  escrita é restrição de projeto, e não uma otimização para depois.

### Fora de escopo

Herdado da spec, sem alteração: histórico de acessos, IP, user-agent, dispositivo, geolocalização, presença
em tempo real, backfill retroativo, e os KPIs/gráfico construídos sobre o campo. Acrescento um item que a
spec não cita e que ficou de fora por custo: **ordenação da coluna**, nem no servidor (decisão da spec) nem
no cliente (minha — ver Perguntas em aberto, item 4).

### Corte de MVP

A menor fatia vertical que entrega valor observável:

1. `UserDTO` ganha `lastAccessAt`, opcional.
2. Os dois guards da API carimbam o perfil de quem age, com janela de 15 minutos.
3. A listagem do admin ganha a coluna, com estado explícito para quem nunca acessou.
4. Chaves nos 3 idiomas.
5. Finalidade e retenção em `docs/PRE-PRODUCTION.md`.

O que tornou a fatia pequena foi descobrir que **o dado já é lido**: os dois guards resolvem o perfil
Firestore do chamador em toda requisição autenticada (`common-panel.ts:44-46`, `admin.ts:44`). Carimbar ali
não custa leitura nova, só a escrita que a janela limita.

### Apps impactados

| Camada | Muda? | O quê |
|--------|-------|-------|
| `packages/sdk` | sim | uma linha em `UserDTO` |
| `apps/api` | sim | um módulo novo, um método de repositório, duas linhas nos guards |
| `apps/app` | sim | uma coluna em `UsersListClient.tsx` |
| `packages/internationalization` | sim | 3 chaves × 3 idiomas |
| `apps/web` | não | — |
| `packages/auth` | **não** | ver 4.1 |
| `firestore.indexes.json` / `firestore.rules` | não | ver 12 |

### Área do painel

A **leitura** é admin (`(admin)/admin/(pages)/users/`). A **escrita** não tem área: acontece nos dois
guards, então qualquer requisição autenticada de qualquer painel carimba. É de propósito — um usuário comum
que nunca abre o admin precisa ser carimbado igual.

### Modo de produto

Indiferente. No modo `simple` o usuário comum opera na `apps/web`, mas a `apps/web` fala com a mesma
`apps/api` através dos mesmos guards. Como o gancho está na API e não num app de front, o comportamento não
depende de `NEXT_PUBLIC_PRODUCT_MODE`. Nenhum caminho da feature lê essa variável.

### Assinatura/plano

Sem dependência. O carimbo não olha plano, e a coluna aparece independente de assinatura ativa.

### Dependências externas e env

Nenhuma. Nenhum serviço novo, nenhuma variável nova.

### Genérico ou específico

Específico do app, e essa é a decisão de desenho central desta tarefa — ver 4.1.

### 1.1 Fontes

A spec é a fonte de requisitos e foi lida por inteiro. Também li os artefatos de `session-refresh`
([`develop/handoff.md`](../../session-refresh/develop/handoff.md),
[`test/report.md`](../../session-refresh/test/report.md)), que descrevem o caminho de sessão medido.
Nenhum link externo, Figma ou print. **Nenhuma referência ficou por ler.**

---

## 2. Dados (Firestore)

### 2.1 Coleção e documento

Coleção existente: `user` (`apps/api/(shared)/repositories/user.repository.ts:13`).

| campo | tipo no documento | tipo no DTO | default | `null`? | justificativa |
|-------|-------------------|-------------|---------|---------|---------------|
| `lastAccessAt` | `Timestamp` | `Date \| null`, opcional | ausente | sim | instante do último acesso ao produto, carimbado pela API |

**Nome.** Três candidatos, e a escolha não é óbvia:

- `lastAccessAt` — **escolhido**. Casa com o título da spec e com o rótulo da coluna, e segue o padrão
  `<verbo>At` dos instantes do repo (`createdAt`, `updatedAt`, `deletedAt` em `user.ts:15-18`).
- `lastSeenAt` — descartado. O nome já existe no repositório como **fixture inventada**, aninhado em
  `audit: { lastSeenAt }` (`apps/api/__tests__/userProfileSerialization.test.ts:48-53`). Adotá-lo no nível
  raiz criaria dois `lastSeenAt` com significados diferentes no mesmo app.
- `lastActiveAt` — descartado. "Ativo" já é o rótulo da coluna de `disabled` na mesma tabela
  (`translations/apps/app/pages/admin/users.ts`, `columns.status: "Ativo"`).

**Opcional (`?`) e não obrigatório**, porque o documento antigo não tem o campo e a spec pede explicitamente
que o tipo não quebre quem já o consome. `UserWithAuthDTO` herda de `UserDTO` (`user.ts:48`), então a
listagem do admin recebe o campo sem mudança própria.

**Ownership**: o campo mora no documento do próprio titular. Não há `userId` a filtrar — o dono é o
documento.

**Soft delete**: `userRepository.delete(id)` carimba `deletedAt` e não apaga nada
(`base.repository.ts:205-207`). Isso tem consequência de retenção, tratada em 6.3.

**`createdAt`/`updatedAt`/`deletedAt`** continuam vindo do `BaseRepository`. O carimbo **não** passa por
`BaseRepository.update` — ver 4.3.

### 2.2 Consultas

Nenhuma consulta nova. Repito com evidência, porque a spec afirma isso e o enunciado pediu confirmação:

- A listagem do admin é `userRepository.list()` (`user.repository.ts:33-44`), que chama `findAll()`
  (`base.repository.ts:91-100`). `findAll` faz `where("deletedAt", "==", null)` e mais nada: um filtro de
  igualdade em campo único, servido pelo índice automático. Filtro por `type` e ordenação são em memória
  (`user.repository.ts:35-37`) ou no `Table` do cliente.
- A escrita é `doc(id).update({ lastAccessAt })` — escrita por id, que não usa índice de consulta.

**Nenhum índice composto novo.** `firestore.indexes.json` fica intacto, e `apps/api/__tests__/firestoreIndexes.test.ts`
continua passando sem edição. A afirmação da spec está confirmada.

**Regras do Firestore**: sem mudança. `firestore.rules` nega todo acesso direto de cliente
(`allow read, write: if false`) e o Admin SDK ignora as regras, como o próprio cabeçalho do arquivo
documenta.

### 2.3 Dados existentes

Documento sem `lastAccessAt` é o caso normal no dia da entrega, e não quebra nada:

- No back, o campo simplesmente não aparece no objeto que `findByReferenceId` devolve
  (`user.repository.ts:27-30`), e `serializeFirestoreData` itera as chaves presentes
  (`user.mapper.ts:49-57`) — chave ausente não vira `undefined` no JSON, ela some.
- No front, a coluna cai no modo degradado (5.4).

**Sem backfill.** A spec coloca em "Fora do corte", e o comportamento correto é que quem nunca acessou
depois da entrega apareça como "nunca acessou".

---

## 3. Contrato — `@repo/sdk`

Uma linha. Nenhuma action nova, nenhuma mudança em `packages/sdk/src/client/index.ts`.

```ts
// packages/sdk/src/types/user/user.ts
export type UserDTO = {
    id: string;
    type: UserType;
    reference_id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    phone?: string | null;
    avatar?: string | null;
    preferences?: UserPreferences | null;
    lastAccessAt?: Date | null;   // ← novo
};
```

**Quem quebra**: ninguém. O campo é opcional e aditivo; nenhum consumidor faz destructuring exaustivo de
`UserDTO`.

**Contenção declarada pela spec**: `packages/sdk/src/types/user/user.ts` é disputado com
[`billing-subscription`](../../../../specs/billing-subscription.md) e
[`onboarding-flow`](../../../../specs/onboarding-flow.md), que também acrescentam campo ao `UserDTO`. Como
os três são acréscimos de campo opcional em pontos diferentes do mesmo type, o conflito é textual, não
semântico — resolve-se no merge.

---

## 4. API (`apps/api`)

### 4.1 A decisão de desenho: onde o carimbo mora

A pergunta é como o carimbo chega ao repositório de usuário sem o `packages/auth` passar a conhecer o
domínio do produto. **A resposta é que ele não passa: `packages/auth` não é tocado.**

Por que o gancho no pacote foi descartado, com evidência:

1. `packages/auth/session.ts` é `server-only` e importa exatamente `next/headers` e `./server`
   (`session.ts:1-3`). Ele não conhece Firestore, nem a coleção `user`, nem o conceito de perfil. Levar o
   carimbo para lá significaria importar o repositório da `apps/api` num pacote — o que nem é possível
   (pacote não depende de app, `packages/CLAUDE.md`) — ou duplicar o repositório dentro do pacote.
2. A alternativa sem duplicação seria injetar um callback (`sessionRefreshPOST(request, { onRefreshed })`) e
   deixar o arquivo de rota do app preencher. Mas os arquivos de rota são re-exports de uma linha em
   **dois** apps (`apps/app/app/api/auth/session/refresh/route.ts` e o gêmeo na `apps/web`), e nenhum dos
   dois tem acesso ao Firestore: teriam de chamar a `apps/api` por HTTP, dentro do mesmo request em que o
   cookie está sendo reescrito. Três camadas para gravar um campo.
3. E, independente da camada, o gatilho estaria errado: 2,5 dias de precisão, como medido no aviso de
   abertura.

**O gancho fica nos guards da `apps/api`**, que é onde o perfil já é lido:

| guard | linha em que o perfil do ator é lido | contexto exposto |
|-------|--------------------------------------|------------------|
| `requireCommonPanelApi` | `common-panel.ts:44-46` | `actorProfile` (variável local) |
| `requireAdminApi` | `admin.ts:44` | `actorProfile` (no ctx) |

Isso resolve quatro coisas de uma vez:

- **Camada.** O carimbo é dado de perfil, gravado por quem é dono do perfil. Zero mudança em `packages/*`
  além da linha do DTO.
- **Custo de leitura.** Zero. O documento já foi lido, e é nele que está o `lastAccessAt` atual — a decisão
  de gravar ou não sai do dado em mãos.
- **Cobertura.** Todo tráfego autenticado passa por um dos dois guards, comum e admin, `apps/app` e
  `apps/web`, qualquer modo de produto.
- **Precedente.** É exatamente onde `recordImpersonationSession` já roda (`common-panel.ts:85-94`), com o
  mesmo formato: janela de 15 minutos alinhada ao piso (`audit-recorder.ts:56-67`), cache de dedupe em
  memória (`audit-recorder.ts:39-50`) e a promessa de nunca lançar (`audit-recorder.ts:162-169`). Não estou
  inventando mecanismo; estou copiando um que a `audit-log` já validou.

**Sem rota nova, sem action nova no SDK, sem código de erro novo, sem entrada em `apiErrors`.** O efeito é
colateral de requisições que já existem.

### 4.2 Guard, autorização e impersonação

Nenhum guard novo e nenhuma rota nova, então não há guard a escolher. O que precisa de decisão é **quem é
carimbado durante impersonação**.

Os dois guards distinguem ator e sujeito: `authRequest.isImpersonating` é `requestUserId !== uid`
(`auth-request-context.ts:141`), e em `requireCommonPanelApi` o `actorProfile` (`:44-46`) e o
`subjectProfile` (`:72-74`) são documentos diferentes quando um admin personifica.

**Carimbo sempre o `actorProfile`, nunca o `subjectProfile`.** O admin que abre a tela de outra pessoa está
usando o produto; a outra pessoa não está. Carimbar o sujeito faria a coluna mentir exatamente no caso em
que o operador mais precisa dela — decidir quem abandonou o produto —, porque um admin investigando contas
inativas as marcaria como ativas ao abrir cada uma. É uma regra que precisa de teste próprio (7).

Consequência boa e gratuita: `ctx.actorProfile` do `requireCommonPanelApi` durante impersonação é um perfil
`ADMIN`, e o carimbo funciona nele igual. Os dois guards cobrem os dois tipos de usuário.

### 4.3 Persistência

Duas peças novas.

**Método no repositório.** `UserRepository` estende `BaseRepository<UserDTO>` sem mapper
(`user.repository.ts:11-14`), e o `update` herdado **sempre** reescreve `updatedAt`
(`base.repository.ts:183-195`). Usá-lo faria `updatedAt` do perfil andar a cada 15 minutos e deixar de
significar "perfil editado pela última vez" — um campo que a tela de conta e a trilha de auditoria leem com
esse sentido. Então o carimbo escreve direto:

```ts
// apps/api/(shared)/repositories/user.repository.ts
async touchLastAccess(id: string, at: Date): Promise<void> {
    // Deliberadamente fora do `update` do BaseRepository: ele carimba `updatedAt` junto,
    // e o último acesso não é uma edição do perfil.
    await this.db.collection(this.table).doc(id).update({ lastAccessAt: at });
}
```

**Módulo de janela.** `apps/api/(shared)/lib/activity-recorder.ts`, modelado em `audit-recorder.ts`.
Blueprint completo em 10.2.

**Mapper**: sem mudança. `serializeFirestoreValue` já converte `Timestamp` → ISO recursivamente
(`user.mapper.ts:30-33`), e `mergeAuthAndFirestore` preserva campos do Firestore que o Auth não tem
(`user.mapper.ts:59-68` — o spread do Auth sobrescreve só as chaves dele, e `lastAccessAt` não é uma
delas). A afirmação da spec está confirmada.

**Tipo gravado**: `new Date()` do processo Node, seguindo a convenção vigente
(`base.repository.ts:149-151`, `:191`, `:206`). **Não** uso `FieldValue.serverTimestamp()`: seria o primeiro
uso no repositório, e o valor sentinela não é `Date` nem `Timestamp` no retorno do write, o que diverge do
pipeline de serialização existente.

### 4.4 Erros

**Nenhum código de erro novo.** O carimbo nunca lança e nunca altera a resposta da requisição, pelo mesmo
motivo do `recordAuditEvent`: a requisição do usuário já foi autorizada e vai ser servida; falhar a leitura
de uma lista porque uma escrita de telemetria foi recusada seria trocar um efeito colateral por um incidente.
Falha vai para o log estruturado.

`logEvent` tem lista fechada de escopos (`packages/shared/utils/helpers/log.ts:5-15`), e `"activity"` não
está nela. Uso o escopo **`"account"`**, que já existe e descreve o assunto, em vez de editar um pacote
compartilhado por causa de uma string.

---

## 5. Front-end (`apps/app`)

### 5.1 Rotas e renderização

Nenhuma rota nova, nenhum arquivo novo. A mudança é uma coluna em
`apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx`,
que já é `"use client"` (`:1`).

O prefetch RSC da página (`.../users/(pages)/(home)/page.tsx`) não muda: a mesma `queryKey`, o mesmo
`user.list`, e o campo novo vem junto no payload.

### 5.2 Dados

Sem `queryKeys` novo, sem hook novo. `useListUsers` (`apps/app/shared/hooks/useListUsers.ts`) já devolve
`UserWithAuthDTO[]`, e o campo aparece por herança do `UserDTO`.

### 5.3 Posição e forma da coluna

A tabela declara 6 colunas hoje (`UsersListClient.tsx:33-106`). A nova entra em **7ª posição, entre
`status` e `actions`**: é informativa, e empurrá-la para antes do `status` afastaria o `Switch` de toggle da
borda onde o operador já o procura.

Sem `sorter`, sem entrada em `searchFields` (buscar por data formatada não é um caso real).

### 5.4 Modo degradado

O valor exibido tem três estados, nesta precedência:

| estado | origem | como aparece |
|--------|--------|--------------|
| carimbado | `record.lastAccessAt` | data e hora, cor normal |
| não carimbado, com dado do provedor | `record.metadata.lastRefreshTime` | data e hora, cor atenuada + `title` explicando que é aproximação |
| nenhum dos dois | — | rótulo "Nunca acessou" |

O segundo estado é a recomendação da spec, adotada: sem ele, a coluna nasce inteiramente vazia no dia da
entrega e o operador conclui que não funciona. `metadata.lastRefreshTime` já atravessa a rede hoje
(`packages/sdk/src/types/user/user.ts:59`, preenchido em `user.mapper.ts:16`) e não custa nada.

**O que eu não medi, e por isso não afirmo**: não exercitei `lastRefreshTime` contra o provedor. O que sei é
que ele vem cru do `UserRecord` do firebase-admin (`user.mapper.ts:13-17`), é tipado como opcional
(`user.ts:59`), e que o driver de token deste repo dispara de hora em hora conforme o QA de `session-refresh`
mediu ([`test/report.md:271-273`](../../session-refresh/test/report.md)). É por isso que ele é **valor de
exibição de transição**, não fonte da verdade — e é por isso que ele aparece visualmente distinto.

A distinção visual custa uma chave de i18n e evita que alguém leia um instante de refresh de token do
Firebase Auth como se fosse uso do produto.

### 5.5 Formatação

`formatDisplayDateTime` (`apps/app/shared/lib/formatDisplayDateTime.ts:20`) já resolve locale e formato
(`dateStyle: "medium"`, `timeStyle: "short"`), aceita ISO/`Date`/`Timestamp` e é usado em três telas
(`EntitiesListClient.tsx:90`, `EntityFormFields.tsx:86`, `AuditListClient.tsx:44`). É `"use client"`, e o
`UsersListClient` é cliente. Serve sem alteração.

---

## 6. Autorização, segurança e dado pessoal

### 6.1 Autorização

Não há superfície nova a autorizar: o carimbo roda **dentro** do guard, depois de toda recusa, e a leitura da
coluna está numa tela que `requireAdminApi` já protege (`users/route.ts:23-34`). Nenhum id vem do body.

### 6.2 Impersonação

Tratado em 4.2: carimba o ator, nunca o sujeito. Ponto de atenção para o `/develop`: o carimbo deve ficar
**depois** de `assertReadOnlyWhileImpersonating` (`common-panel.ts:64-70`, `admin.ts:64-70`) para não
registrar acesso a partir de uma requisição que o guard recusou.

### 6.3 Dado pessoal

O que a spec exige escrito, e que vai para `docs/PRE-PRODUCTION.md`:

- **Finalidade**: medir uso do produto para operação da base (identificar conta inativa, decidir contato).
  Nada além disso.
- **Natureza**: carimbo de data e hora **sem IP**. Não é registro de acesso no sentido do Marco Civil, art.
  5º, VIII, que define o termo como data e hora de uso a partir de um determinado endereço IP — logo o prazo
  de 6 meses do art. 15 não se aplica. O regime é o finalístico da LGPD (arts. 15, 16 e 6º, III), sem prazo
  fixo, com o Decreto 8.771/2016, art. 13, § 2º mandando reter o mínimo.
- **Retenção**: enquanto a conta existir. É estado atual, não série.
- **Honestidade sobre a exclusão, que a spec não previu**: hoje `DELETE /users/[id]` é **soft delete**
  (`base.repository.ts:205-207`), então o documento permanece no Firestore com `deletedAt` preenchido e o
  `lastAccessAt` junto. "Some com a exclusão da conta" só vira verdade quando
  [`data-rights-lgpd`](../../data-rights-lgpd/spec.md) entregar a exclusão coordenada — essa spec
  está `status: proposed`, não implementada.

### 6.4 Costura com `data-rights-lgpd`, declarada

A costura é de forma, não de código: **`lastAccessAt` é um campo raiz do documento de perfil, sem coleção
própria, sem cópia e sem derivado**. Consequência declarada para quem implementar aquela spec:

- **Exportação** — um export que serialize o documento de perfil já inclui o campo. Só falha se o export for
  construído sobre uma whitelist de campos; nesse caso, `lastAccessAt` precisa entrar na whitelist.
- **Exclusão** — uma exclusão que remova o documento de perfil já remove o campo. Não há segundo lugar a
  limpar.

Os critérios 15 e 16 (9) fixam isso de forma verificável agora, antes de `data-rights-lgpd` existir.

---

## 7. Testes

Nível mais barato que prova cada comportamento.

| # | arquivo | nível | o que prova |
|---|---------|-------|-------------|
| 1 | `apps/api/__tests__/activityRecorder.test.ts` | unit, timers falsos | a janela: uma escrita por janela, duas ao cruzar a borda, e **a garantia sobrevive ao cache frio** |
| 2 | `apps/api/__tests__/activityRecorder.test.ts` | unit | falha de escrita não lança e cai no log |
| 3 | `apps/api/__tests__/guardsStampActivity.test.ts` | rota com `vi.mock` do repositório | carimba o ator; sob impersonação **não** carimba o sujeito; requisição recusada pelo guard não carimba |
| 4 | `apps/app/__tests__/usersListLastAccess.test.tsx` | componente | os três estados de exibição (carimbado, degradado, nunca) |
| 5 | paridade i18n | já existe | as chaves novas nos 3 idiomas (`packages/internationalization/__tests__/parity.test.ts`) |

O teste 1 é o que prova o risco nº 1 e merece detalhe. Ele tem duas metades:

- **Cache quente**: chama `recordUserActivity` 50 vezes dentro da mesma janela e cobra `touchLastAccess`
  chamado uma vez. Prova o caminho comum.
- **Cache frio**: chama `resetActivityDedupeCache()` entre cada chamada — simulando processos serverless
  distintos, que é a situação real na Vercel — passando um perfil cujo `lastAccessAt` já está na janela
  corrente, e cobra **zero** escritas. Esta é a metade que importa: o cache em memória sozinho não garante
  nada num ambiente de N instâncias, e o que segura o custo é a comparação contra o documento.

**Um teste com emulador, e só um.** `apps/api/__tests__/` roda em `node` sem emulador. O que o unitário não
prova é que `new Date()` escrito pelo Admin SDK volta do Firestore como `Timestamp` e atravessa
`serializeFirestoreValue` (`user.mapper.ts:30-33`) até chegar ISO no `GET /users`. Isso é serialização
contra o documento real — o caso que o guia (§7) admite como objeto legítimo de teste de infra. Roteiro em
11.

Nenhum teste existente precisa ser editado.

---

## 8. Validação visual

Fluxos, com `agent-browser`, comandos em sequência:

1. Login como `admin@example.com`, abrir `/pt-br/admin/users`. Screenshot da tabela com a coluna nova.
2. Um usuário do seed com `lastAccessAt` gravado, outro sem — as duas formas de exibição na mesma tela.
3. **Prova de custo observável**: anotar o valor exibido para um usuário, navegar ~10 páginas ao longo de
   ~3 minutos com aquela conta, voltar e atualizar a listagem. O valor não pode ter mudado.
4. Light, dark e mobile (390×844). O `Table` é antd — conferir que a coluna nova respeita o tema e que a
   7ª coluna não estoura a largura no mobile.
5. Os 3 idiomas, com o rótulo e o estado "nunca acessou" em cada um.

---

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **A listagem do admin mostra o último acesso de cada usuário**
  Em `/{locale}/admin/users`, a tabela apresenta uma coluna de último acesso entre a coluna de status e a de
  ações, com data e hora formatadas pelo idioma ativo. O valor exibido vem de `lastAccessAt` do perfil
  quando ele existe. A coluna não altera a busca por nome/e-mail nem a paginação já existentes.

- [ ] **Quem nunca acessou aparece com rótulo, não com célula vazia**
  Um perfil sem `lastAccessAt` e sem `metadata.lastRefreshTime` renderiza o texto traduzido de "nunca
  acessou". A célula nunca fica em branco, nunca mostra `—` sozinho, nunca mostra `Invalid Date` e nunca
  mostra a época Unix (1970), que é o que `normalizeFirestoreInstant` devolve para valor ausente
  (`packages/shared/utils/helpers/normalizeFirestoreInstant.ts:6-8`) — o componente precisa checar a
  ausência antes de formatar.

- [ ] **Perfil ainda não carimbado cai no valor do provedor, visualmente distinto**
  Quando `lastAccessAt` está ausente mas `metadata.lastRefreshTime` existe, a coluna mostra esse instante com
  estilo atenuado e um `title` traduzido dizendo que é aproximação. Um perfil com `lastAccessAt` presente
  **nunca** usa o valor do provedor, mesmo que o do provedor seja mais recente: a fonte da verdade é o campo
  próprio.

- [ ] **Navegar durante minutos não produz mais de uma escrita de perfil por janela**
  Com a janela em 15 minutos, uma sequência de requisições autenticadas do mesmo usuário dentro da mesma
  janela produz exatamente uma chamada a `touchLastAccess`. Requisições na janela seguinte produzem mais uma.
  A garantia vale mesmo com o cache de dedupe em memória vazio a cada chamada, porque a decisão de gravar sai
  da comparação com o `lastAccessAt` do documento já lido — é esse o caso que o teste precisa exercitar, não
  só o do cache quente.

- [ ] **A janela está num único lugar e é o valor documentado**
  `ACTIVITY_WINDOW_MINUTES` é exportada de um módulo só e vale 15. Nenhum outro arquivo redeclara o número.
  O valor aparece em `docs/PRE-PRODUCTION.md` junto da declaração de finalidade, porque é ele que define a
  precisão de tudo que for derivado do campo.

- [ ] **O carimbo registra quem age, não quem é representado**
  Com um admin personificando um usuário comum, uma requisição `GET` autorizada carimba o perfil do admin e
  deixa o perfil do usuário comum inalterado. Na listagem do admin depois desse percurso, o `lastAccessAt` do
  usuário personificado continua exatamente como estava. Este é o caso que faz a coluna mentir se for
  implementado ao contrário.

- [ ] **Requisição recusada pelo guard não carimba**
  Um `POST` durante impersonação é recusado com 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`
  (`apps/api/(shared)/lib/impersonation-read-only.ts:19-31`) e não deve gravar nada. O mesmo vale para token
  inválido (401 `AUTH_INVALID_TOKEN`), perfil inexistente (403 `COMMON_PANEL_FORBIDDEN`) e não-admin batendo
  em rota admin (403 `ADMIN_FORBIDDEN`). O carimbo roda depois de todas as recusas.

- [ ] **Usuário comum e admin são carimbados**
  Uma requisição de usuário comum passando por `requireCommonPanelApi` e uma requisição de admin passando por
  `requireAdminApi` carimbam cada uma o seu próprio perfil. Nenhum tipo de usuário fica sem carimbo, e a
  coluna na listagem mostra valor tanto para linhas `common` quanto para linhas `admin`.

- [ ] **Falha ao gravar o carimbo não derruba a requisição**
  Se `touchLastAccess` rejeitar (permissão negada, indisponibilidade, quota), a requisição original responde
  normalmente com o seu 200 e o corpo esperado. A falha vai para o log estruturado no escopo `account`, sem
  vazar caminho de documento nem payload — só nome do erro e status gRPC, como `audit-recorder.ts:69-83` já
  faz.

- [ ] **O carimbo não move `updatedAt` do perfil**
  Depois de uma sequência de acessos, o `updatedAt` do documento de perfil permanece com o valor da última
  edição real do perfil. Um acesso não é uma edição, e `BaseRepository.update` carimbaria `updatedAt` junto
  (`base.repository.ts:191`) se o caminho passasse por ele.

- [ ] **O valor chega ao cliente como instante serializado, não como objeto vazio**
  `GET /users` devolve `lastAccessAt` como string ISO. Um `Timestamp` do Firestore que não passasse por
  `serializeFirestoreValue` (`user.mapper.ts:30-33`) chegaria ao JSON como `{"_seconds":…}` ou `{}`, e a
  coluna mostraria `Invalid Date`. Verificar contra o documento real, não só contra fixture.

- [ ] **Nenhum índice novo é exigido e nenhuma consulta degrada**
  `firestore.indexes.json` permanece com as 6 entradas atuais, `apps/api/__tests__/firestoreIndexes.test.ts`
  passa sem edição, e `GET /users` não responde `503` em nenhum momento. A coluna não ordena nem filtra no
  servidor, então não há `where` + `orderBy` em campos diferentes.

- [ ] **A coluna existe nos 3 idiomas**
  O rótulo da coluna, o texto de "nunca acessou" e o `title` de aproximação existem em `pt-br`, `en` e `es`
  com a mesma estrutura de chave, e `pnpm --filter @repo/internationalization test` passa. Nenhuma string
  literal de interface aparece no JSX.

- [ ] **Data e hora seguem o formato do idioma**
  O mesmo instante renderiza no formato de cada idioma via `formatDisplayDateTime`
  (`apps/app/shared/lib/formatDisplayDateTime.ts:20`), que mapeia `pt-br` → `pt-BR`, `es` → `es` e o resto
  para `en`. Não é aceitável ISO cru na célula em nenhum idioma.

- [ ] **O campo é um campo raiz do perfil, sem cópia em outro lugar**
  `lastAccessAt` existe apenas como chave de primeiro nível no documento da coleção `user`. Não há coleção
  nova, não há subcoleção, não há espelho em `auditEvent` e não há derivado gravado. É isso que faz a
  exportação e a exclusão de conta de `data-rights-lgpd` cobrirem o campo sem trabalho extra.

- [ ] **A finalidade e a retenção estão escritas antes da entrega**
  `docs/PRE-PRODUCTION.md` declara para que o campo serve, que ele não carrega IP e por isso não é registro
  de acesso do Marco Civil art. 5º VIII, que a retenção é a vida da conta, e que a exclusão hoje é soft
  delete — ou seja, o documento permanece até `data-rights-lgpd` entregar a exclusão coordenada. Um fork que
  herde o campo sem essa declaração fica em posição pior do que sem o campo.

- [ ] **Temas e viewports**
  A coluna é legível em light e dark, e no mobile (390×844) a tabela continua utilizável — sétima coluna não
  pode quebrar o layout do `Table` antd nem esconder a coluna de ações.

- [ ] **Nada regride na listagem**
  Busca por nome e e-mail, toggle de status, editar, excluir, botão de atualizar e paginação continuam
  funcionando como antes. O prefetch RSC da página segue hidratando sem waterfall, com a mesma `queryKey`.

---

## 10. Blueprint técnico

### 10.1 Ordem de implementação e commits

| # | commit | arquivos |
|---|--------|----------|
| 1 | `feat(sdk): add last access instant to the user profile contract` | `packages/sdk/src/types/user/user.ts` |
| 2 | `feat(api): stamp profile activity within a fixed window` | `(shared)/lib/activity-recorder.ts`, `(shared)/repositories/user.repository.ts`, `__tests__/activityRecorder.test.ts` |
| 3 | `feat(api): record the acting user's activity in the auth guards` | `app/(guards)/common-panel.ts`, `app/(guards)/admin.ts`, `__tests__/guardsStampActivity.test.ts` |
| 4 | `feat(app): show last access in the admin user listing` | `UsersListClient.tsx`, `__tests__/usersListLastAccess.test.tsx` |
| 5 | `feat(internationalization): add last access column copy` | `translations/apps/app/pages/admin/users.ts` |
| 6 | `docs: declare purpose and retention for the last access stamp` | `docs/PRE-PRODUCTION.md` |
| 7 | `docs(features): user-activity-tracking` | `docs/features/user-activity-tracking/` |

A branch é do `revisor-codigo`. O `/develop` não cria branch e não commita.

### 10.2 `apps/api/(shared)/lib/activity-recorder.ts` (novo)

```ts
import { normalizeFirestoreInstant } from "@repo/shared/utils";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { userRepository } from "@/(shared)/repositories/user.repository";

const MINUTE_MS = 60_000;

/**
 * O carimbo de último acesso é gravado no máximo uma vez por janela, por usuário. A janela
 * define a precisão de tudo que for derivado do campo: com 15 minutos, "último acesso" pode
 * estar 15 minutos desatualizado.
 */
export const ACTIVITY_WINDOW_MINUTES = 15;
export const ACTIVITY_WINDOW_MS = ACTIVITY_WINDOW_MINUTES * MINUTE_MS;

const DEDUPE_CACHE_MAX = 500;

const stampedWindows = new Map<string, number>();

function rememberWindow(key: string): void {
    stampedWindows.set(key, Date.now());
    while (stampedWindows.size > DEDUPE_CACHE_MAX) {
        const oldest = stampedWindows.keys().next();
        if (oldest.done) {
            return;
        }
        stampedWindows.delete(oldest.value);
    }
}

export function activityWindowStartMs(atMs: number): number {
    return Math.floor(atMs / ACTIVITY_WINDOW_MS) * ACTIVITY_WINDOW_MS;
}

export function isStampedInWindow(
    lastAccessAt: unknown,
    windowStartMs: number
): boolean {
    if (lastAccessAt == null) {
        return false;
    }
    return Date.parse(normalizeFirestoreInstant(lastAccessAt)) >= windowStartMs;
}

/**
 * Nunca lança. A requisição que dispara o carimbo já foi autorizada e vai ser servida:
 * recusar a resposta porque uma escrita de telemetria falhou trocaria um efeito colateral
 * por um incidente.
 */
export async function recordUserActivity(profile: {
    id: string;
    lastAccessAt?: unknown;
}): Promise<void> {
    const now = Date.now();
    const windowStartMs = activityWindowStartMs(now);
    const key = `act_${profile.id}_${windowStartMs}`;

    if (stampedWindows.has(key)) {
        return;
    }

    // O cache só poupa a ida ao Firestore: ele aquece e esfria com o processo serverless.
    // O que garante uma escrita por janela é o instante que veio no documento já lido.
    if (isStampedInWindow(profile.lastAccessAt, windowStartMs)) {
        rememberWindow(key);
        return;
    }

    try {
        await userRepository.touchLastAccess(profile.id, new Date(now));
        rememberWindow(key);
        logEvent("account", "activity-stamped", {
            userId: profile.id,
            windowStartMs,
        });
    } catch (error) {
        logEvent("account", "activity-stamp-failed", {
            userId: profile.id,
            reason: error instanceof Error ? error.name : "unknown",
            status:
                typeof (error as { code?: unknown })?.code === "number"
                    ? (error as { code: number }).code
                    : undefined,
        });
    }
}

/** Test seam: o cache de dedupe sobrevive a um único request de propósito. */
export function resetActivityDedupeCache(): void {
    stampedWindows.clear();
}
```

Duas notas para o `/develop`:

- `logEvent("account", "activity-stamped", …)` no **sucesso** é um desvio proposital em relação ao
  `audit-recorder.ts`, que só loga falha. A razão é o risco nº 1 da spec: sem uma linha por escrita, ninguém
  consegue verificar em produção que a janela está segurando o custo. Os campos são um id de documento e um
  número — nada de payload.
- `profile` é tipado estruturalmente (`{ id; lastAccessAt? }`) e não como `UserDTO` para o teste poder montar
  o mínimo sem fabricar um perfil inteiro.

### 10.3 Pseudo-diff — `apps/api/(shared)/repositories/user.repository.ts`

```diff
     async findByReferenceId(referenceId: string): Promise<UserDTO | null> {
         …
     }
 
+    async touchLastAccess(id: string, at: Date): Promise<void> {
+        // Fora do `update` do BaseRepository de propósito: ele carimba `updatedAt` junto,
+        // e um acesso não é uma edição do perfil.
+        await this.db.collection(this.table).doc(id).update({ lastAccessAt: at });
+    }
+
     async list(options?: { type?: UserType }): Promise<UserDTO[]> {
```

### 10.4 Pseudo-diff — `apps/api/app/(guards)/common-panel.ts`

```diff
 import { recordImpersonationSession } from "@/(shared)/lib/audit-recorder";
+import { recordUserActivity } from "@/(shared)/lib/activity-recorder";
@@
         if (!subjectProfile || subjectProfile.type !== UserType.COMMON) {
             …
         }
 
+        await recordUserActivity(actorProfile);
+
         // Recorded on the server, from the headers the impersonation needs anyway, so the
         // admin has no way of operating on someone's account without leaving the window.
         if (resolved.data.isImpersonating) {
```

`actorProfile`, não `subjectProfile` — a regra de 4.2.

### 10.5 Pseudo-diff — `apps/api/app/(guards)/admin.ts`

```diff
+import { recordUserActivity } from "@/(shared)/lib/activity-recorder";
@@
         const readOnlyRefusal = assertReadOnlyWhileImpersonating(
             req,
             resolved.data
         );
         if (readOnlyRefusal) {
             return readOnlyRefusal;
         }
 
+        await recordUserActivity(profile);
+
         const enrichedContext = {
```

### 10.6 Pseudo-diff — `UsersListClient.tsx`

```diff
+import { formatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
@@
     const adminUsersList = dictionary.apps.app.pages.admin.users.list;
+    const lastAccessLabels = adminUsersList.lastAccess;
+
+    const renderLastAccess = (record: UserWithAuthDTO) => {
+        if (record.lastAccessAt) {
+            return <span>{formatDisplayDateTime(record.lastAccessAt)}</span>;
+        }
+        const fromProvider = record.metadata?.lastRefreshTime;
+        if (fromProvider) {
+            return (
+                <span className="text-muted-foreground" title={lastAccessLabels.approximate}>
+                    {formatDisplayDateTime(fromProvider)}
+                </span>
+            );
+        }
+        return <span className="text-muted-foreground">{lastAccessLabels.never}</span>;
+    };
@@
         {
             title: adminUsersList.columns.status,
             …
         },
+        {
+            title: adminUsersList.columns.lastAccess,
+            dataIndex: "lastAccessAt",
+            render: (_: unknown, record: UserWithAuthDTO) => renderLastAccess(record),
+        },
         {
             title: adminUsersList.columns.actions,
```

### 10.7 Resposta de exemplo — `GET /users`

Nenhum contrato novo; o que muda é uma chave a mais por item.

```json
{
  "data": [
    {
      "id": "p1",
      "type": "common",
      "reference_id": "uid-1",
      "createdAt": "2026-08-02T12:00:00.000Z",
      "updatedAt": "2026-09-10T08:31:00.000Z",
      "deletedAt": null,
      "lastAccessAt": "2026-09-17T22:45:00.000Z",
      "uid": "uid-1",
      "email": "user@example.com",
      "displayName": "Ana",
      "disabled": false,
      "metadata": {
        "creationTime": "Sat, 02 Aug 2026 12:00:00 GMT",
        "lastSignInTime": "Tue, 15 Sep 2026 09:12:00 GMT",
        "lastRefreshTime": "Wed, 17 Sep 2026 21:58:00 GMT"
      }
    },
    {
      "id": "p2",
      "type": "common",
      "reference_id": "uid-2",
      "createdAt": "2026-09-16T10:00:00.000Z",
      "updatedAt": "2026-09-16T10:00:00.000Z",
      "deletedAt": null,
      "uid": "uid-2",
      "email": "nunca@example.com",
      "displayName": null,
      "disabled": false,
      "metadata": {
        "creationTime": "Wed, 16 Sep 2026 10:00:00 GMT",
        "lastSignInTime": "Wed, 16 Sep 2026 10:00:00 GMT",
        "lastRefreshTime": null
      }
    }
  ]
}
```

`p1` renderiza o valor próprio; `p2` renderiza "nunca acessou". Um terceiro caso — sem `lastAccessAt` e com
`lastRefreshTime` preenchido — renderiza o valor do provedor atenuado.

### 10.8 Tabela `error.code` → status

Vazia. Nenhum código novo, nenhuma entrada em `apiErrors`, nenhuma mudança em
`translations/packages/shared/utils.ts`.

### 10.9 i18n

Arquivo: `packages/internationalization/translations/apps/app/pages/admin/users.ts`, dentro de `list`, nos
três idiomas.

```ts
list: {
    columns: {
        …,
        lastAccess: "Último acesso",     // en: "Last access"       · es: "Último acceso"
    },
    lastAccess: {
        never: "Nunca acessou",          // en: "Never accessed"    · es: "Nunca accedió"
        approximate: "Valor aproximado, do provedor de autenticação",
        // en: "Approximate value, from the authentication provider"
        // es: "Valor aproximado, del proveedor de autenticación"
    },
},
```

### 10.10 Env nova

Nenhuma. `ACTIVITY_WINDOW_MINUTES` é constante de módulo, não variável de ambiente — a spec pede um único
lugar, não um botão por fork.

---

## 11. Pré-requisitos manuais de infra

O `/develop` não consegue satisfazer estes itens, e o `/test` não deve reprovar código por causa deles.

| item | bloqueia? | quem faz |
|------|-----------|----------|
| índice do Firestore | **não é necessário** (confirmado em 2.2) | — |
| variável de ambiente | nenhuma | — |
| `firestore.rules` | sem mudança (2.2) | — |
| serviço externo a ativar | nenhum | — |
| backfill | fora do corte (2.3) | — |
| seção em `docs/PRE-PRODUCTION.md` | não bloqueia a entrega, mas é item do corte | `/develop`, commit 6 |
| emulador de Firestore para o teste de serialização (7) | não bloqueia | `/test`, opcional |

**A lista de bloqueadores de produção não cresce com esta entrega.** A fila de índices continua com as
mesmas 6 entradas em `firestore.indexes.json` e os mesmos itens §1.1, §1.2, §1.5 e §1.6 de
`docs/PRE-PRODUCTION.md`.

O que entra em `docs/PRE-PRODUCTION.md` é **declaração**, não pendência — uma seção em "Higiene" com:
finalidade, ausência de IP e a consequência jurídica disso (6.3), retenção, o valor de
`ACTIVITY_WINDOW_MINUTES` e a precisão que ele impõe a qualquer métrica derivada, e o fato de a exclusão
hoje ser soft delete.

Roteiro do teste com emulador, para o `/test` decidir se vale:

```bash
pnpm emulators        # JAVA_HOME no openjdk@21; o JDK 17 do sistema não serve para o Firestore
pnpm seed
# percorrer uma requisição autenticada, ler o documento de perfil e conferir que
# lastAccessAt é Timestamp; depois GET /users e conferir que chega como string ISO.
```

Prova o que o unitário não prova: a ida e volta do `Timestamp` pelo `serializeFirestoreValue`
(`user.mapper.ts:30-33`) contra o documento real.

---

## 12. Pós-entrega e rollback

**Rollback**: reverter os commits basta. O campo gravado fica órfão nos documentos, sem consumidor e sem
custo de leitura — o `serializeFirestoreData` itera as chaves presentes e um campo a mais no JSON não quebra
nenhum consumidor. Se o fork quiser limpá-lo, é uma passada de script, não uma migração.

**O que um fork precisa ajustar**: nada para funcionar. Para operar de forma responsável, ler a seção nova
de `docs/PRE-PRODUCTION.md` e decidir se 15 minutos serve para o caso dele.

---

## Perguntas em aberto

Decisões tomadas sem consulta, nesta rodada autônoma. Cada uma traz a alternativa descartada para você poder
discordar sem ter acompanhado.

1. **O gancho do carimbo ficou nos guards da `apps/api`, não no ramo `{ refreshed: true }` de
   `sessionRefreshPOST`.**
   *Opções*: (a) guards da API; (b) ramo `{ refreshed: true }` do `packages/auth`, como a spec sugeria.
   **Adotada: (a).** A (b) entregaria precisão de 2,5 dias (`session.ts:24` + `:30` + `:137-140`), o que
   contradiz a própria recomendação de 15 minutos da spec, e exigiria um callback no pacote mais uma chamada
   HTTP entre apps para alcançar o Firestore. Este é o desvio mais relevante do plano em relação à spec — se
   você discordar, é aqui.

2. **Janela de 15 minutos, como a spec recomenda, mas garantida pelo documento e não pelo cache.**
   *Opções*: (a) 15 min; (b) 5 min, mais preciso e mais caro; (c) 60 min, mais barato e quase inútil para
   "quem está usando hoje". **Adotada: (a)**, com o precedente interno de `audit-recorder.ts:12` (a trilha de
   auditoria usa a mesma janela). A garantia de custo vem da comparação com o `lastAccessAt` do documento já
   lido, não do cache em memória, porque o cache não sobrevive a um processo serverless novo.

3. **Nome do campo: `lastAccessAt`.**
   *Opções*: (a) `lastAccessAt`; (b) `lastSeenAt`; (c) `lastActiveAt`. **Adotada: (a).** A (b) colide com a
   fixture `audit: { lastSeenAt }` de `userProfileSerialization.test.ts:48-53`, e a (c) colide com o rótulo
   "Ativo" da coluna de `disabled` na mesma tabela.

4. **A coluna não é ordenável, nem no servidor nem no cliente.**
   *Opções*: (a) nenhuma ordenação; (b) só no cliente, com `sorter` do `Table`; (c) no servidor.
   **Adotada: (a).** A (c) é decisão da spec (pede índice composto, e a fila já tem 6 entradas não
   publicadas). A (b) seria barata, mas ordenaria apenas o que está em memória e misturaria valores próprios
   com valores do provedor na mesma ordenação — uma ordenação que mente é pior que nenhuma enquanto a coluna
   tiver dois tipos de origem. Revisitar quando a base estiver toda carimbada.

5. **O valor degradado aparece visualmente distinto, e isso não estava na spec.**
   *Opções*: (a) fallback silencioso para `metadata.lastRefreshTime`, como a spec descreve; (b) fallback com
   estilo atenuado e `title` explicativo. **Adotada: (b)**, ao custo de uma chave de i18n. `lastRefreshTime`
   mede refresh de token do Firebase Auth, não uso do produto; exibi-lo indistinguível do carimbo próprio
   faria o operador tomar decisão sobre um número que não significa o que o cabeçalho da coluna promete.

6. **O carimbo registra quem age, nunca quem é personificado.**
   *Opções*: (a) carimbar o ator; (b) carimbar o sujeito; (c) não carimbar durante impersonação.
   **Adotada: (a).** A (b) faria um admin investigando contas inativas marcá-las como ativas ao abri-las. A
   (c) perderia o acesso real do admin. Não perguntei porque (b) e (c) tornam a coluna incorreta, não apenas
   diferente.

7. **A retenção declarada admite que a exclusão hoje é soft delete.**
   A spec afirma que o campo "some com a exclusão da conta". Medido: `DELETE /users/[id]` chama
   `BaseRepository.delete`, que carimba `deletedAt` e mantém o documento (`base.repository.ts:205-207`).
   Registrei a afirmação como **dependente de [`data-rights-lgpd`](../../data-rights-lgpd/spec.md)**,
   que está `status: proposed`. Não mudei o corte — só não escrevi no `PRE-PRODUCTION.md` algo que o código
   ainda não faz.

8. **Log no sucesso da escrita, além do log na falha.**
   *Opções*: (a) só falha, como `audit-recorder.ts`; (b) falha e sucesso. **Adotada: (b).** Sem uma linha por
   escrita, a garantia de custo — que é o risco nº 1 da spec — só é verificável em teste, nunca em produção.
   Se você achar o ruído de log caro, é o item mais fácil de remover.
