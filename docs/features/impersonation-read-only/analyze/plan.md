# Análise — Impersonação é somente leitura, em todos os painéis

> Origem: **achado 🔴 de segurança** do `specs/BACKLOG.md:113` ("Achados da varredura que não viraram
> spec"). Não é spec — é correção de **autorização**, entra direto como tarefa.
> Feature precedente e obrigatória de contexto: `docs/features/auth-panel-context/` (introduziu o
> contexto de painel/impersonação). Fonte única da regra de negócio: `docs/AUTH-PANEL.md`.
>
> **Estado: decisões de escopo consolidadas** (ver "Decisões tomadas", no fim). O blueprint abaixo já
> reflete todas elas — não há nada pendente de aprovação para o `/develop` começar, exceto o item único
> de "Perguntas em aberto".

---

## 1. Contexto da tarefa

### 1.1 O problema, com evidência

A regra "**admin personificando não escreve**" existe, está escrita em três lugares e é aplicada em
**um** só:

| Onde | O que diz / faz |
|------|-----------------|
| `docs/AUTH-PANEL.md:52-56` | "Admin impersonando **não escreve** na área admin" — a redação já revela o escopo estreito |
| `apps/api/app/(guards)/admin.ts:13` | `const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);` |
| `apps/api/app/(guards)/admin.ts:70-79` | `requestRole !== ADMIN && !SAFE_METHODS.has(req.method)` → 403 `AUTH_REQUEST_PANEL_FORBIDDEN` |
| `apps/api/__tests__/adminGuard.test.ts:97-110` | teste "refuses writes while the admin acts as a common user" |
| **`apps/api/app/(guards)/common-panel.ts`** | **nenhuma verificação de método nem de impersonação** — do `resolveAuthRequestContext` (`:52`) ele vai direto resolver o `subjectProfile` (`:61`) e chamar o handler (`:82`) |

Resultado prático hoje: um admin que entra no painel comum personificando o usuário X **cria, edita,
alterna e exclui os dados de X** pelas rotas comuns, com resposta 200/201/204 e sem qualquer registro.
`apps/api/app/(routes)/entities/route.ts:11` (`POST`), `entities/[id]/route.ts:27` (`PUT`) e `:60`
(`DELETE`) são todos alcançáveis nessa condição.

A assimetria não é uma decisão: é uma lacuna. Ela nasceu no `/review` da feature anterior
(`docs/features/auth-panel-context/review/review.md:131-135`, "Decisões em aberto" #2), onde o
`requireAdminApi` foi endurecido — e o guard comum, que já existia, não foi revisitado.

### 1.2 Por que importa mais do que o raio de impacto atual sugere

Hoje o único consumidor de `requireCommonPanelApi` é o CRUD de exemplo `entity` (4 usos em 2 arquivos).
Corrigir o guard não conserta "uma tela": conserta **o contrato que todo fork deste boilerplate herda**.
Cada MVP gerado a partir daqui vai pendurar o seu domínio inteiro nesse guard, e a falha se replica
silenciosamente em cada um. É exatamente o tipo de defeito que um boilerplate deve pagar uma vez.

### 1.3 Objetivos

1. **Impersonação é somente leitura, em qualquer painel.** Mesma regra, mesmo conjunto de métodos
   seguros, mesmo `error.code`, nos dois guards — e **por construção**, não por disciplina.
2. **Falhar com uma mensagem que explica.** Um 403 seco com copy genérica ("Painel não permitido para
   este usuário") é pior que o bloqueio: o admin não entende se errou de painel, se perdeu permissão ou
   se é um bug.
3. **A UI não oferece o que a API recusa.** Regra de ouro 4 é "UI oculta nunca é a única proteção"; o
   inverso também vale — botão que só existe para produzir 403 é defeito de produto.
4. **A regra fica verificável no browser.** A feature anterior nunca foi validada visualmente por falta
   de um admin de DEV; esta tarefa **cria esse caminho** (§8.1) em vez de herdar o bloqueio.

### 1.4 Fora de escopo

- **Registro/auditoria** das tentativas bloqueadas → é a spec `audit-log`. O achado é explícito: isto
  é autorização, não auditoria, e não espera aquela spec.
- **Escape hatch por rota** (permitir mutação legítima de suporte) → **decidido: não existe**, nem como
  opção de código. Ver §6.3.
- Qualquer mudança no fluxo de **entrar/sair** da impersonação (seletor, cookies, `router.refresh()`).
- Área admin (`/admin/users`) — já coberta por `admin.ts:70-79` + o redirect de
  `(admin)/admin/layout.tsx:28`.
- **Firestore Security Rules** — o acesso ao Firestore é 100% server-side; a regra vive no guard.
- **Emulador do Firebase, seed de dados e reset de ambiente** → spec `firebase-emulator-seed`. Desta
  tarefa entra **só** o bootstrap do primeiro admin (§8.1), delimitado em §8.2.

### 1.5 Corte de MVP

**Dentro:**

1. O bloqueio na API, num helper compartilhado consumido pelos dois guards (§4.1–4.2).
2. O código de erro novo `AUTH_REQUEST_IMPERSONATION_READ_ONLY` nos **dois** guards + i18n nos 3
   idiomas (§4.4).
3. Um teste que varre `app/(guards)/` e falha se um guard novo não chamar o helper (§4.6) — a
   mitigação do único risco residual do desenho.
4. Remoção do `authGuard` morto (§4.5).
5. O sinal `isImpersonating` no contexto de painel (§5.2) e a supressão das 5 afordâncias mutantes de
   `entities` (§5.3).
6. Um aviso **nas telas que têm ação mutante**, citando o usuário personificado (§5.4).
7. O **bootstrap do admin de DEV** (§8.1) — sem ele a validação visual não roda.

**Fora, registrado:** banner global do painel comum; extensão para outros recursos (não existem);
telemetria; permissão granular por rota; emulador/seed completos.

O corte é honesto porque as 5 afordâncias custam ~1 linha cada — `Footer` já aceita `disabled`
(`apps/app/shared/components/ui/Footer.tsx:22`), `AddButton` herda `ButtonProps`
(`packages/design-system/components/ui/add-button.tsx:9`) e `ActionsMenu` já trata `onDelete` como
opcional (`packages/design-system/components/ui/action-menu.tsx:18-19`). Não há motivo para adiar.

### 1.6 Apps impactados

| App / pacote | Impacto |
|---|---|
| `apps/api` | 🔴 núcleo — guard comum, helper compartilhado, guard admin (unificação), remoção do `authGuard`, script de bootstrap + `firebase-admin` como devDependency |
| `apps/app` | 🟡 espelho de UI — 1 flag no contexto de painel + 5 afordâncias em `entities` + 1 aviso |
| `packages/internationalization` | 🟡 1 código em `apiErrors` ×3 idiomas + 1 namespace de copy ×3 |
| `packages/sdk` | ⚪ **nenhum** — sem DTO, sem action, sem contrato novo |
| `docs/` | 🟡 `AUTH-PANEL.md` (fonte única declarada) + uma subseção em `SETUP.md` |
| `apps/web`, `packages/design-system`, `@repo/auth` | ⚪ nenhum |

**Modo de produto** (`subscription` × `simple`): indiferente. **Dependência de plano/assinatura**: nenhuma.

---

## 2. Dados (Firestore)

**Nenhuma coleção, campo, índice ou migração de produto.** O sinal já existe em memória
(`isImpersonating`, `apps/api/(shared)/lib/auth-request-context.ts:141`) e é derivado por request.
Sem persistência, o limite conhecido do `BaseRepository` (sem paginação, sem `orderBy`, filtro em
memória) não é tocado.

A única escrita no Firestore que a tarefa produz é **operacional, fora do runtime**: o script de §8.1
grava um documento na coleção `user` já existente, com a forma exata que `BaseRepository.create`
produz (`base.repository.ts:78-98`) — `{ reference_id, type, createdAt, updatedAt, deletedAt: null }`.

> ⚠️ `deletedAt: null` é **obrigatório**, não decorativo: `userRepository.findByReferenceId` filtra
> `where("deletedAt", "==", null)` (`user.repository.ts:20-24`), então um documento sem o campo é
> **invisível** para a API — o admin criado nunca seria reconhecido.

---

## 3. Contrato — `@repo/sdk`

**N/A.** Nenhum DTO, `Create/UpdateRequest` ou action muda. O SDK já envia os headers de contexto
(`packages/sdk/src/client/base.ts`) e já propaga `error.code` para o `FormattedError`. **Ninguém quebra**
no contrato de tipos.

O que muda é **comportamento em runtime**: `apiClient.entity.create/update/delete` passam a poder
retornar 403 num cenário em que antes retornavam 2xx. É mudança de contrato de *runtime*, e é o ponto do
plano — registrada aqui de propósito.

---

## 4. API (`apps/api`)

### 4.1 Onde a regra mora — decisão fechada (D5)

Quatro opções foram consideradas:

| # | Opção | Custo | Veredito |
|---|---|---|---|
| A | Duplicar o `if` + `SAFE_METHODS` em `common-panel.ts` | menor diff | ❌ duas cópias da mesma regra; o próximo guard que um fork criar esquece de novo — é literalmente o defeito que estamos corrigindo |
| **B** | **Helper explícito consumido pelos dois guards** | +1 arquivo pequeno | ✅ **decidido** |
| C | Mover a regra para dentro de `resolveAuthRequestContext` | reescreve o contrato de um resolver com 15 testes | ❌ |
| B' | Wrapper `resolveGuardedAuthRequestContext` (= C, mas em função nova) | igual a B | ❌ esconde autorização atrás de "resolver contexto" |

**Decidido: B, helper explícito.** Novo arquivo `apps/api/(shared)/lib/impersonation-read-only.ts`
exportando `assertReadOnlyWhileImpersonating(req, resolved)`; os dois guards chamam a mesma linha logo
após `resolveAuthRequestContext`. Uma definição de método seguro, uma definição de `error.code`, um
comentário explicando por que a leitura fica aberta. A assimetria some porque **não há duas regras** —
há uma, importada duas vezes.

> Nota de nomenclatura: apesar do prefixo `assert`, a função **não lança** — devolve `Response | null`,
> igual ao `resolved.response` de `resolveAuthRequestContext`. Isso mantém os dois guards no mesmo
> formato de early-return que já usam, sem `try/catch` num caminho de autorização. O nome foi escolhido
> para deixar claro, no ponto de chamada, que ali se afirma uma invariante — não que se "resolve" algo.

**Por que não B'/C** (embora sejam tentadores): `resolveAuthRequestContext` recebe o `req` e já calcula
`isImpersonating` (`auth-request-context.ts:141`), então tecnicamente daria. Mas (i) ela é um
*resolver/validador de headers*, e enfiar uma decisão baseada em método HTTP ali mistura camadas que o
`apps/api/CLAUDE.md` separa de propósito ("Guards: auth/session antes da lógica"); (ii) muda o contrato
de uma função com 15 testes (`authRequestContext.test.ts`) que hoje só rejeita por incoerência de
contexto; (iii) uma decisão de autorização escondida atrás de um nome que diz "resolver contexto" é
exatamente o tipo de coisa que a próxima pessoa não vê ao ler o guard.

**Verificação de equivalência (importante — B não muda o comportamento do `admin.ts`):**
o predicado atual do admin é `requestRole !== ADMIN`. Em `requireAdminApi` o ator é sempre ADMIN (o perfil
é checado antes, `admin.ts:48-56`), e `validateAdminProfile` (`auth-request-context.ts:56-73`) garante que
`requestRole === COMMON` só passa com `requestUserId !== uid`. Logo, para um ator admin,
`requestRole !== ADMIN` ⟺ `isImpersonating`. Trocar um pelo outro é **refactor puro** no `admin.ts`, e o
predicado unificado ainda é o correto no guard comum (onde `validateCommonProfile` força
`requestUserId === uid` para atores comuns, `auth-request-context.ts:43-54`).

### 4.2 O bloqueio

Método seguro: `GET`, `HEAD`, `OPTIONS` — **idêntico ao de hoje**, sem discussão. Tudo o mais (`POST`,
`PUT`, `PATCH`, `DELETE`, e qualquer verbo desconhecido) é recusado enquanto `isImpersonating`.

**A leitura continua aberta de propósito**, pela mesma razão documentada em `admin.ts:66-69`: o próprio
seletor de impersonação é alimentado por `GET /users`. Fechar a leitura tranca o admin no primeiro
usuário acessado. No guard comum a razão é ainda mais direta: **ler os dados do usuário é o objetivo
inteiro do modo de suporte.**

### 4.3 O bypass óbvio já falha fechado (verificado)

Um admin poderia tentar escapar do bloqueio **omitindo** os headers de impersonação. Não funciona, e é
bom deixar registrado com evidência:

| Tentativa | O que acontece | Onde |
|---|---|---|
| admin, sem `x-request-user-id` (`requestUserId = uid`) | `subjectProfile` = o próprio admin → `type !== COMMON` → 403 `COMMON_PANEL_FORBIDDEN` | `common-panel.ts:61-70` |
| admin, `x-request-role: admin` + `x-request-user-id: <alvo>` | 403 `AUTH_REQUEST_ADMIN_TARGET_INVALID` | `auth-request-context.ts:58-61` |
| admin, `x-user-id` forjado como o do alvo | 403 `AUTH_REQUEST_USER_ID_MISMATCH` (cross-check com o uid do token) | `auth-request-context.ts:100-106` |

Ou seja: `isImpersonating` **não é um sinal em que se confia por cortesia** — as três rotas de fuga já
estão fechadas antes dele. Isso vira caso de teste (§7).

### 4.4 Erros — decisão fechada (D2)

**Decidido: código novo `AUTH_REQUEST_IMPERSONATION_READ_ONLY` (403), aplicado aos DOIS guards**,
substituindo o `AUTH_REQUEST_PANEL_FORBIDDEN` no `admin.ts:77`.

Razões:

1. **A copy atual está errada para este caso.** `AUTH_REQUEST_PANEL_FORBIDDEN` traduz como *"Painel não
   permitido para este usuário."* (`translations/packages/shared/utils.ts:12-13`). No guard comum isso é
   simplesmente falso: o painel **é** permitido — o que não é permitido é escrever.
2. **O código já está sobrecarregado.** `AUTH_REQUEST_PANEL_FORBIDDEN` é emitido em 3 lugares com
   significados distintos (`auth-request-context.ts:48`, `:77`, `admin.ts:77`). Um quarto sentido torna o
   código inútil para triagem em log e impossível de traduzir com precisão.
3. **Aplicar nos dois guards é o que produz a simetria observável.** Se o admin recebesse um código e o
   comum outro, teríamos trocado a assimetria de comportamento por uma assimetria de contrato.

**O que acontece com o `AUTH_REQUEST_PANEL_FORBIDDEN` — verificado por grep, não inferido.**
Ele **não fica órfão** e **não deve ser removido**. Depois da troca no `admin.ts:77`, continuam
emitindo-o:

| Emissor | Sentido |
|---|---|
| `apps/api/(shared)/lib/auth-request-context.ts:48` | ator **comum** pedindo painel admin (`validateCommonProfile`) |
| `apps/api/(shared)/lib/auth-request-context.ts:77` | `requestRole` desconhecido / fora do enum |

E continuam consumindo-o: `apps/api/__tests__/authRequestContext.test.ts:110` e as 3 entradas de
`apiErrors` (`translations/packages/shared/utils.ts:12`, `:53`, `:90`). **Conclusão: manter a chave nos
3 idiomas, sem alterar a copy** — que passa a ser precisa, porque sobra só o sentido original ("painel
incoerente com o perfil"). A `docs/AUTH-PANEL.md:195` é que precisa perder a ambiguidade.

**Custo já mapeado da troca** (é o preço integral, não uma amostra):

| Arquivo | O que muda |
|---|---|
| `apps/api/app/(guards)/admin.ts:77` | emite o código novo (via helper) |
| `apps/api/__tests__/adminGuard.test.ts:106` | asserção `AUTH_REQUEST_PANEL_FORBIDDEN` → `AUTH_REQUEST_IMPERSONATION_READ_ONLY` |
| `packages/internationalization/translations/packages/shared/utils.ts:9-45` (pt-br), `:50-84` (en), `:87-121` (es) | +1 entrada em cada bloco `apiErrors` |
| `docs/AUTH-PANEL.md:50`, `:195` | tabela de erros e a frase que descreve o guard admin |
| `docs/features/auth-panel-context/test/criterios-aceite.md:86`, `:97` | **não editar** — é registro histórico de outra feature, e reescrevê-lo apagaria o histórico |

Nenhum fork externo é consumidor conhecido; nenhuma outra referência ao código existe no repo (grep
completo em `*.ts`/`*.tsx`/`*.md`).

**Status HTTP: 403.** Não 405 — o método *é* suportado pela rota; o que o proíbe é o contexto do ator.
Um 405 exigiria header `Allow` e faria o cliente concluir que o endpoint não aceita o verbo.

Tabela final:

| `error.code` | HTTP | Quando |
|---|---|---|
| `AUTH_REQUEST_IMPERSONATION_READ_ONLY` | 403 | **novo** — método mutante enquanto o admin atua como outro usuário (qualquer painel) |
| `AUTH_REQUEST_PANEL_FORBIDDEN` | 403 | mantido, com o sentido **original** e agora único: painel incoerente com o perfil |
| `COMMON_PANEL_FORBIDDEN` | 403 | inalterado — sem perfil, ou sujeito resolvido não é comum |

### 4.5 `authGuard` — remoção confirmada (D4)

`apps/api/app/(guards)/auth.ts` é um guard cru: resolve o ator e entrega, **sem** contexto de
auth-request, sem papel e sem qualquer noção de impersonação. Também responde
`{ message: "Invalid token" }` em vez do envelope `{ error: { code } }` do repo.

**Confirmado por grep repo-wide** (`*.ts`, `*.tsx`, `*.js`, `*.json`, `*.md`, excluindo `node_modules` e
`.next`), buscando `authGuard`, `guards/auth` e as formas de import: a **única** ocorrência do símbolo é
a própria declaração em `apps/api/app/(guards)/auth.ts:10`. **Zero** importadores — nenhuma rota, nenhum
teste, nenhum outro app ou pacote. É código morto com valor negativo: uma armadilha na forma exata do
defeito que estamos corrigindo, esperando o fork com pressa que quiser "só proteger a rota".

**Decidido: remover o arquivo**, em **commit separado** (é uma limpeza independente do bloqueio — se
alguém quiser reverter uma das duas coisas, deve conseguir).

### 4.6 A mitigação do risco residual — o teste de varredura dos guards

O desenho B tem um risco assumido e único: **um guard novo que esqueça de chamar o helper**. É o mesmo
esquecimento que produziu o defeito original, então tratá-lo é obrigatório.

**Decidido: um teste que varre o diretório de guards.** Em `apps/api/__tests__/impersonationReadOnly.test.ts`,
ler `apps/api/app/(guards)/` com `fs.readdirSync`, e para cada arquivo `.ts` que exporte um wrapper de
guard (`export function require<...>Api`), afirmar que o texto-fonte contém
`assertReadOnlyWhileImpersonating`. ~15 linhas, determinístico, sem dependência nova.

Por que este e não uma nota no `apps/api/CLAUDE.md`: uma nota depende de alguém ler antes de escrever, e
o histórico deste próprio repo mostra que a documentação da regra **já existia em três lugares** e ainda
assim o segundo guard nasceu sem ela (§1.1). Num boilerplate cujo propósito é que forks herdem a
invariante, ela precisa **falhar no CI**, não pedir atenção. O custo de um scan de texto (frágil a
renomeações) é aceitável porque a renomeação quebra o teste de forma barulhenta e óbvia, que é
precisamente o comportamento desejado.

> O teste é um **piso**, não um teto: ele prova que a chamada existe, não que está no lugar certo. Quem
> prova o lugar certo são os testes de comportamento de §7.2 — os dois são complementares.

---

## 5. Front-end (`apps/app`)

### 5.1 Rotas e renderização

Nenhuma rota nova. As páginas afetadas são as já existentes de `entities`:

```
app/[locale]/(authenticated)/(common)/(pages)/entities/
  (pages)/(home)/EntitiesListClient.tsx     ← "use client"  (criar · toggle · excluir)
  (pages)/create/page.tsx                   ← "use client"  (submit)
  (pages)/edit/[id]/EditEntityClient.tsx    ← "use client"  (submit)
```

O prefetch RSC dessas páginas **já** é desligado sob impersonação
(`entities/(pages)/(home)/page.tsx:16`, `edit/[id]/page.tsx:20`, via
`lib/server/panelSnapshot.ts:47`) — regra 6 de `docs/AUTH-PANEL.md`. Nada a mudar ali.

### 5.2 O sinal no cliente

Hoje o contexto de painel **não** expõe um booleano de impersonação: `useAuthRequestPanel()` devolve
`profileKind`, `panelRequestRole`, `impersonatedFirebaseUid`, `impersonatedLabel` e as duas ações
(`AuthRequestPanelContext.tsx:242-248`). O consumidor teria de recombinar as três primeiras — e é assim
que o cliente diverge do servidor.

Mas a função pura **já existe**: `isImpersonatingSnapshot(snapshot)` (`shared/lib/panelState.ts:98-104`),
usada pelos dois layouts (`(common)/layout.tsx:31`, `(admin)/admin/layout.tsx:28`). E como
`PanelState = PanelSnapshot & {...}` (`shared/stores/panelStore.ts:16`), ela serve **diretamente** como
seletor do store.

→ Adicionar `isImpersonating: boolean` ao `AuthRequestPanelContextValue`, calculado com
`usePanelState(isImpersonatingSnapshot)`. Zero lógica nova, mesma função que o servidor usa, sem risco
de deriva. É a peça mais importante do lado do cliente.

### 5.3 As afordâncias a suprimir

| # | Onde | Hoje | Passa a ser |
|---|---|---|---|
| 1 | `EntitiesListClient.tsx:128` | `<AddButton onClick=… />` | `disabled={isImpersonating}` |
| 2 | `EntitiesListClient.tsx:85-97` | `<Switch disabled={isPending && …} />` | `… \|\| isImpersonating` |
| 3 | `EntitiesListClient.tsx:110-111` | `<ActionsMenu onDelete={…} />` | `onDelete={isImpersonating ? undefined : …}` — o item some do menu (`action-menu.tsx:58-59`) |
| 4 | `create/page.tsx:77-81` | `<Footer isLoading=… />` | `disabled={isImpersonating}` |
| 5 | `edit/[id]/EditEntityClient.tsx:116-121` | `disabled={isPending \|\| !entity}` | `… \|\| isImpersonating` |

`onEdit` (`EntitiesListClient.tsx:112`) **permanece**: navegar para o formulário é leitura, e o admin de
suporte precisa ver o registro. O que ele não consegue é salvar (#5).

> **Observação de arquitetura, deliberadamente fora do MVP.** O repo tem
> `shared/hooks/useAuthorizedQuery.ts` como gate obrigatório de **leitura** (regra de
> `docs/AUTH-PANEL.md`), mas **não existe equivalente para mutação** — `useEntityCrud` e `useUserCrud`
> usam `useMutation` cru. Um `useGuardedMutation` que recusasse o disparo sob impersonação seria a
> versão "por construção" do espelho de UI, análoga ao helper de §4.1 na API. Não é o MVP: hoje há um
> único hook de mutação de painel comum, e abstrair antes do segundo caso contraria a regra do repo.
> Registrado para quando o segundo recurso aparecer.

### 5.4 O aviso — escopo e conteúdo (D3)

**Decidido: o aviso aparece só nas telas que têm ação mutante** — não é banner global do painel comum.
Ele existe para explicar um controle desabilitado; onde não há controle desabilitado, é ruído. As 3 telas
são exatamente as de §5.1 (lista, create, edit de `entities`).

Componente compartilhado `apps/app/shared/components/ui/ImpersonationReadOnlyNotice.tsx`: renderiza
`null` quando `isImpersonating === false`, e um `Alert` (`packages/design-system/components/ui/alert.tsx`)
caso contrário. Fica num lugar só, e o fork ganha um componente pronto para pendurar nas telas dele.

**De onde sai o nome.** `impersonatedLabel` do store de painel
(`shared/stores/panelStore.ts:18`, exposto em `AuthRequestPanelContext.tsx:246`) — o mesmo campo que o
seletor do navbar já usa (`PanelNavbarControls.tsx:39`). É o `displayName` ou o e-mail do usuário-alvo,
gravado quando o admin o seleciona (`setImpersonatedUser`, `panelStore.ts:76-90`).

⚠️ **É client-only e pode ser `null`** — está escrito no próprio tipo: *"Display name of the impersonated
user. Client-only; the server never knows it."* (`panelStore.ts:17`). O store nasce com
`impersonatedLabel: null` (`:46`) e só é preenchido depois do mount por `hydrateLabelFromMirror` (`:51-60`),
que lê o `localStorage`; se o storage estiver indisponível (aba anônima, quota — o `writePanelMirror`
engole a falha, `panelState.ts`), o valor nunca chega. O `impersonatedFirebaseUid`, esse sim, é garantido
não-nulo sempre que `isImpersonating` é `true` (`isImpersonatingSnapshot`, `panelState.ts:98-104`).

→ **Fallback**: `impersonatedLabel ?? impersonatedFirebaseUid.slice(0, 8)`, exatamente o mesmo recurso
que o navbar já aplica (`PanelNavbarControls.tsx:26,91`, `REFERENCE_ID_PREVIEW_LENGTH = 8`). Ver a
pergunta em aberto no fim do documento.

> Alternativa considerada e descartada: `Tooltip` em cada botão desabilitado. Além de sumir no toque em
> mobile e triplicar a superfície de copy, ela **não funciona sem uma gambiarra**: o `Button` aplica
> `disabled:pointer-events-none` (`packages/design-system/components/ui/button.tsx:8`), então um
> `TooltipTrigger asChild` sobre um botão desabilitado nunca recebe hover — seria preciso envolver cada
> um num `<span tabIndex={0}>`. O Alert entrega a informação uma vez, tem `role="alert"`
> (`alert.tsx:30`), e é responsivo de graça.

### 5.5 i18n — chaves e a forma da interpolação

**Constatação que determina o desenho (verificada, não assumida):** o `@repo/internationalization`
**não tem nenhuma infraestrutura de interpolação**. Uma varredura por tokens `{alguma-coisa}` em
`packages/internationalization/translations` retorna **zero** ocorrências, e não há em `apps/app` nenhum
caso de `.replace()` compondo uma string do dictionary com um valor dinâmico. Introduzir `{user}` seria
criar, nesta tarefa, a **primeira convenção de placeholder do pacote** — uma convenção que todo fork
herda, que o `parity.test.ts` não valida, e que um tradutor pode quebrar silenciosamente.

**Decidido: citar o nome sem inventar interpolação**, no formato *rótulo + valor* que o repo já usa —
e que reaproveita uma chave órfã:

```
Alert
├─ title:       "Modo somente leitura"
├─ description: "Ações de criação, edição e exclusão ficam bloqueadas enquanto você atua como outro usuário."
└─ rodapé:      "{navbar.actingAsUserLabel}: <strong>{nome ou uid}</strong>"
```

`navbar.actingAsUserLabel` ("Atuando como" / "Acting as" / "Actuando como") já está declarada nos 3
idiomas (`translations/apps/app/pages/navbar/index.ts:6,13,20`) e **não é usada em nenhum código de
produção** — a única referência é o mock de `apps/app/__tests__/panelNavbarControls.test.tsx:37`.
Reusá-la resolve a citação do nome com zero chave nova, é segura em ordem de palavras nos 3 idiomas
(diferente de partir uma frase em dois pedaços) e não cria convenção nova.

Árvores a criar, mesma estrutura nos 3 idiomas (pt-br · en · es):

```
apiErrors.AUTH_REQUEST_IMPERSONATION_READ_ONLY
    pt-br "Somente leitura: você está atuando como outro usuário."
    en    "Read-only: you are acting as another user."
    es    "Solo lectura: estás actuando como otro usuario."

apps.app.pages.impersonation.readOnly.title
    pt-br "Modo somente leitura"
    en    "Read-only mode"
    es    "Modo solo lectura"

apps.app.pages.impersonation.readOnly.description
    pt-br "Ações de criação, edição e exclusão ficam bloqueadas enquanto você atua como outro usuário."
    en    "Create, edit and delete actions are blocked while you act as another user."
    es    "Las acciones de crear, editar y eliminar están bloqueadas mientras actúas como otro usuario."
```

Arquivos: `packages/internationalization/translations/packages/shared/utils.ts` (`apiErrors`, nos 3
blocos: `:9-45`, `:50-84`, `:87-121`) e um novo
`translations/apps/app/pages/impersonation/index.ts` registrado em
`translations/apps/app/pages/index.ts` (que hoje agrega `signIn`, `signUp`, `common`, `admin`, `navbar`).

> Namespace: `pages.impersonation` e não `pages.navbar` — a copy do aviso não é do navbar. `navbar`
> continua dono do seletor (`environmentAdmin`, `actingAsUserLabel`, …); o aviso apenas **consome**
> `actingAsUserLabel`, que é o rótulo genérico correto para os dois usos.

Use `/i18n-sync`. `packages/internationalization/__tests__/parity.test.ts` falha se faltar um idioma.

### 5.6 Acessibilidade

Botão desabilitado não recebe foco nem é anunciado; por isso o `Alert` (com `role="alert"`) precisa vir
**antes** da tabela/formulário na ordem do DOM, e não depois. O `ActionsMenu` simplesmente não renderiza
o item de excluir — nada de item "fantasma" desabilitado.

---

## 6. Autorização e segurança

### 6.1 Matriz de decisão (estado alvo)

| Ator | Painel | Sujeito | `GET` comum | Mutação comum | `GET` admin | Mutação admin |
|---|---|---|---|---|---|---|
| comum | comum | ele mesmo | ✅ | ✅ | 403 `ADMIN_FORBIDDEN` | 403 `ADMIN_FORBIDDEN` |
| admin | admin | ele mesmo | 403 `COMMON_PANEL_FORBIDDEN` | 403 `COMMON_PANEL_FORBIDDEN` | ✅ | ✅ |
| **admin** | **comum** | **outro (impersonando)** | ✅ | 🔴 **403 `…READ_ONLY`** ← muda | ✅ | 403 `…READ_ONLY` (era `PANEL_FORBIDDEN`) |
| anônimo | — | — | 401 `AUTH_INVALID_TOKEN` | 401 | 401 | 401 |

Só a célula 🔴 muda de comportamento. A célula à direita dela muda apenas de `error.code`.

### 6.2 Ownership

Inalterado. `entities` já compara `row.userId !== ctx.subjectProfile.id` → 404
(`entities/[id]/route.ts:16-22`, `:32-38`, `:66-72`). A mudança é **ortogonal**: o guard barra antes, por
método; o ownership continua barrando por dono.

### 6.3 Escape hatch — decisão fechada (D1)

**Decidido: bloqueio absoluto. Nenhuma mutação durante impersonação no painel comum, sem exceção por
rota — e o ponto de extensão não existe como código.**

1. **Não existe caso de uso.** Nenhuma rota atual precisa disso, e a regra do repo é não abstrair antes
   do segundo caso.
2. **Quando surgir, a resposta é outra.** "O suporte precisa corrigir o dado do cliente" é um caso para
   um **endpoint admin sob `requireAdminApi`, executado no painel admin**, com o admin assinando o ato
   como ele mesmo — não para uma escrita comum disfarçada de usuário. Abrir a exceção no guard comum
   destrói a atribuição de autoria justamente onde ela mais importa.
3. **O ponto de extensão fica nomeado aqui e só aqui.** Se um dia houver motivo, o lugar é um parâmetro
   opcional na fábrica do guard (`requireCommonPanelApi(handler, { allowImpersonatedMutation: true })`),
   consumido pelo helper de §4.1 — uma linha, quando houver motivo. **Não escrever esse parâmetro
   agora**, nem "preparado", nem comentado, nem como campo ignorado: um hatch que existe no código é um
   hatch que alguém usa. Ele também **não vai** para o `docs/AUTH-PANEL.md`, que não deve anunciar uma
   API inexistente — lá entra apenas a não-feature ("impersonação é somente leitura; escrita de suporte
   é endpoint admin no painel admin").

### 6.4 Superfície não coberta (honestidade)

- Um admin **com credencial de dev** que chame a API por `curl` continua barrado (o bloqueio é server-side).
- Um admin que **saia da impersonação, altere o dado no painel admin** e volte não é barrado — e nem deve
  ser: ali ele age como ele mesmo, sob `requireAdminApi`. **Quem** fez a mudança fica rastreável só
  quando existir a spec `audit-log`.
- Impersonação continua sem **registro** de nenhum tipo. Este plano remove a capacidade de escrever, não
  cria a trilha. Está correto e é explicitamente fora de escopo.
- O script de §8.1 cria um admin com senha escolhida por quem roda. Ele é ferramenta de **desenvolvimento**;
  rodá-lo contra um projeto de produção cria um administrador real. O aviso vai na documentação e na
  própria saída do script.

---

## 7. Testes (Vitest)

### 7.1 O que existe

`apps/api/__tests__/adminGuard.test.ts` (5 casos) é o **único** teste de guard. Não existe
`commonPanelGuard.test.ts` — o guard que serve o slice de referência tem **cobertura zero**. Essa lacuna
é irmã do defeito: o que não é testado dos dois lados diverge dos dois lados.

`apps/api/__tests__/authRequestContext.test.ts` (15 casos) cobre o resolver, incluindo
`isImpersonating: true` (`:274`) — o sinal já é testado, só não era consumido.

### 7.2 `apps/api` — obrigatórios

**`apps/api/__tests__/commonPanelGuard.test.ts`** (novo, espelhando a estrutura e os mocks de
`adminGuard.test.ts:7-21`):

| # | Caso | Esperado |
|---|---|---|
| 1 | comum titular, `GET`/`POST`/`PUT`/`PATCH`/`DELETE` | 200, handler chamado — **a regressão que mais importa**: o bloqueio não pode pegar o dono |
| 2 | admin impersonando, `GET`/`HEAD`/`OPTIONS` | 200, handler chamado |
| 3 | admin impersonando, `POST`/`PUT`/`PATCH`/`DELETE` | 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, handler **não** chamado |
| 4 | admin sem headers de impersonação (bypass §4.3) | 403 `COMMON_PANEL_FORBIDDEN` |
| 5 | ator sem perfil no Firestore | 403 `COMMON_PANEL_FORBIDDEN` |
| 6 | anônimo | 401 `AUTH_INVALID_TOKEN` |

**`apps/api/__tests__/adminGuard.test.ts`** — atualizar a asserção de `:106` para o código novo; o resto
passa inalterado (§4.1 prova a equivalência do predicado).

**`apps/api/__tests__/impersonationReadOnly.test.ts`** (novo, 3 blocos):

| Bloco | O que prova |
|---|---|
| unidade do helper | `SAFE_METHODS` liberam; verbos mutantes recusam; devolve `null` quando `isImpersonating === false`; devolve 403 + o código correto quando `true` |
| **simetria** | a **mesma** request mutante de admin impersonando, rodada pelos **dois** guards, devolve o mesmo status e o mesmo `error.code` — é o único teste que falha se alguém endurecer ou afrouxar um lado só |
| **varredura de guards** (§4.6) | todo arquivo de `app/(guards)/` que exporta um wrapper `require*Api` contém a chamada ao helper |

> Como a remoção do `authGuard` (§4.5) acontece na mesma branch, a varredura passa a ver 2 arquivos.
> O filtro é por "exporta wrapper de guard", não por "é um arquivo do diretório", justamente para que a
> ordem dos commits não importe.

### 7.3 `apps/app` — obrigatórios (D6)

- **Exposição do sinal**: estender `apps/app/__tests__/panelState.test.ts` **não** basta —
  `isImpersonatingSnapshot` já é testado lá (`:108-135`). O que falta é a **exposição**:
  `useAuthRequestPanel().isImpersonating` acompanha o store. Teste curto de render do provider
  (`authRequestPanel.test.tsx` já monta essa composição).
- **Componente da lista sob impersonação — obrigatório.** Renderizar `EntitiesListClient` com o painel em
  modo impersonação e afirmar: `AddButton` desabilitado, `Switch` da coluna `enabled` desabilitado, item
  "Excluir" **ausente** do `ActionsMenu`, item "Editar" **presente**, e o aviso renderizado. É o único
  teste que trava a regressão de UI — sem ele, a próxima pessoa que mexer na lista remove um `disabled`
  e nada acusa.
- **Fallback do nome**: no mesmo teste de componente, um caso com `impersonatedLabel: null` afirmando que
  o aviso ainda renderiza (com o uid truncado) em vez de quebrar ou mostrar "null".

### 7.4 i18n

Nenhum teste novo. `packages/internationalization/__tests__/parity.test.ts` já falha se a chave nova
faltar em qualquer idioma.

### 7.5 Gate

`pnpm --filter api test` · `pnpm --filter app test` · `pnpm --filter @repo/internationalization test` ·
`pnpm check` · `pnpm --filter {api,app} typecheck`. A baseline da feature anterior era **148 testes**.

---

## 8. Bootstrap do admin de DEV + validação visual

### 8.1 O admin de DEV é entregável desta tarefa (D7)

Sem um admin não há impersonação, e sem impersonação nada em §8.3 pode ser executado. A feature anterior
travou exatamente aqui (`docs/features/auth-panel-context/STATE.md`, Notas). Desta vez o caminho é
construído.

**O impasse, em código** (o mesmo que a spec `firebase-emulator-seed` documenta):
`apps/api/app/(routes)/auth/sign-up/route.ts:34` cria todo perfil com `type: UserType.COMMON` fixo, e a
única rota que cria usuário com outro tipo (`apps/api/app/(routes)/users/route.ts:34`) está atrás de
`requireAdminApi`. **Para criar um admin é preciso já ser admin.**

**O que existe hoje** (verificado): **nada**. `apps/api/scripts/` contém só `skip-ci.js`; não há seed,
fixture, comando de bootstrap nem menção a emulador em `firebase.json`; `docs/SETUP.md:111-114` manda
provisionar no console.

**Entregável — `apps/api/scripts/create-dev-admin.mjs`**, ESM puro rodado por `node` (mesmo formato do
`skip-ci.js` vizinho; **nenhum runner de TypeScript entra no repo**), exposto como
`pnpm --filter api create-dev-admin`. O que faz:

1. Lê e-mail e senha de `argv`/env — **nunca** valores embutidos no arquivo.
2. Inicializa o `firebase-admin` com `FIREBASE_ADMIN_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY`
   (as mesmas de `packages/auth/keys.ts:5-8`, já presentes no `apps/api/.env` local).
3. `getUserByEmail` → se não existir, `createUser({ email, password, emailVerified: true })`.
4. Procura o documento em `user` com `reference_id == uid`: cria com
   `{ reference_id, type: "admin", createdAt, updatedAt, deletedAt: null }` ou promove o `type` do
   existente. A forma vem de `BaseRepository.create` (`base.repository.ts:78-98`), e o `deletedAt: null`
   é obrigatório (§2).
5. Imprime uid e id do documento. **Nunca imprime a senha.**

Três checagens que sustentam esse desenho, todas verificadas:

- **`@repo/auth/server` não pode ser reusado por um script.** Ele começa com `import "server-only"`
  (`packages/auth/server.ts:1`), e o `server-only` resolve, fora da condição `react-server`, para um
  módulo que **lança no import** (`node_modules/server-only/index.js`). O mesmo vale para
  `@repo/auth/keys` e, por tabela, para `(shared)/lib/firebase-identity-toolkit.ts`. Por isso o script
  fala com o `firebase-admin` diretamente.
- **`firebase-admin` não resolve a partir de `apps/api`** (`apps/api/node_modules/firebase-admin` não
  existe; só `packages/auth/node_modules/firebase-admin` e a raiz). → adicionar
  `"firebase-admin": "^13.0.2"` às **devDependencies** de `apps/api`. É a mesma versão já travada por
  `packages/auth/package.json:23`, então nenhum pacote novo entra na árvore.
- **Usar o Admin SDK aqui não antecipa a spec `firestore-admin-access`.** Aquela spec é sobre migrar a
  **conexão de runtime da API** (`apps/api/(shared)/infra/dabatase.ts`, hoje client SDK). O script não
  toca nesse arquivo; ele é ferramenta operacional avulsa. Bônus: como o Admin SDK ignora as security
  rules, o bootstrap funciona independentemente do estado das rules publicadas.

**Higiene de credencial** (nada vaza para o repositório):

| Item | Onde vive | Versionado? |
|---|---|---|
| `FIREBASE_ADMIN_*` | `apps/api/.env` (já existe) | ❌ — `.gitignore:144` (`.env`) e `:64` (`.env*.local`) |
| e-mail/senha do admin de DEV | `argv` ou env na hora de rodar | ❌ nunca gravados |
| nomes das variáveis | `apps/api/.env.example` | ✅ **só os nomes**, sem valores |
| a credencial usada na validação visual | combinada na conversa do `/develop` | ❌ **nunca** em `docs/features/**`, print ou roteiro de teste |

**Documentação**: uma subseção curta em `docs/SETUP.md`, logo após "Firestore" (`:111-114`), com o
comando e o aviso de que é bootstrap de **desenvolvimento**.

**O que o script NÃO faz** (e por quê): não cria o usuário comum nem os registros de `entity`. Esses o
produto já sabe criar — cadastro pela UI de sign-up e o CRUD de `entities`. O script cobre **só** o caso
impossível hoje.

### 8.2 Delimitação explícita contra a spec `firebase-emulator-seed`

Esta tarefa entrega **apenas o terceiro bullet** do corte de MVP daquela spec
(`specs/firebase-emulator-seed.md:64-65`: "caminho de código para criar o primeiro admin"), e contra um
projeto Firebase **real**. Fica **tudo o mais** para a spec:

| Da spec | Aqui? |
|---|---|
| bloco de emuladores no `firebase.json`, stack local sem conta/internet | ❌ |
| seed de usuário comum + registros de `entity` | ❌ |
| comando de reset do ambiente | ❌ |
| `docs/SETUP.md` reestruturado com o emulador como caminho padrão | ❌ — aqui entra **uma subseção**, não a reescrita |
| caminho de código para o primeiro admin | ✅ **só isto** |

A spec continua válida e **não muda de status**; quando ela for implementada, este script vira o passo
de bootstrap que o seed chama. O `depends_on: firestore-admin-access` dela também segue intacto, porque
não mexemos na conexão da API.

> O `/spec --sync` decide, na entrega, se a spec ganha uma nota de "parcialmente coberto". **Não editar
> `specs/firebase-emulator-seed.md` nesta tarefa.**

### 8.3 Roteiro visual (obrigatório)

Skill `agent-browser`, sequencialmente (nunca em paralelo — o daemon embaralha as abas).
Pré-requisito: §8.1 executado, mais um usuário comum criado pela UI com ao menos 2 registros de `entity`.

| # | Fluxo | Evidência |
|---|---|---|
| 1 | Admin → painel comum, selecionar usuário → `/entities` | aviso visível **com o nome do usuário**; "Adicionar" desabilitado; `Switch` desabilitado; menu de ações **sem** "Excluir" e **com** "Editar" |
| 2 | Abrir `/entities/create` por URL enquanto impersona | formulário renderiza, aviso visível, botão salvar desabilitado |
| 3 | Abrir `/entities/edit/[id]` enquanto impersona | dados carregam (leitura funciona), salvar desabilitado |
| 4 | `POST /entities` por `curl` com os headers de impersonação | 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY` — prova que o bloqueio é da API, não da UI |
| 5 | Voltar ao painel admin e mutar em `/admin/users` | funciona normalmente (o admin agindo como ele mesmo não é afetado) |
| 6 | Usuário **comum** logado direto | nenhum aviso, todas as ações habilitadas — **prova de que não houve dano colateral** |

Temas **light + dark** e viewports **desktop + mobile** nos fluxos 1–3 e 6.

---

## 9. Critérios de aceite

Gerados pelo `/test` no formato §9.1 do guia. Os casos de origem estão em §6.1 (matriz), §7.2 (tabela de
guard) e §8.3 (fluxos). Destaques que o `/test` não pode perder: o **caso 1 de §7.2** (o dono não pode
ser barrado), o **bypass de §4.3**, o **caso 4 de §8.3** (bloqueio na API, não na UI) e o **caso 6**
(usuário comum intocado).

---

## 10. Blueprint técnico (Etapa 2)

### 10.1 Helper — `apps/api/(shared)/lib/impersonation-read-only.ts` (novo)

```ts
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import type { ResolvedAuthRequestContext } from "@/(shared)/lib/auth-request-context";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Reads stay open on purpose: seeing the user's data is the whole point of acting as
// them, and the impersonation picker itself is fed by `GET /users` — refusing reads
// would lock the admin into the first user they switched to, with no way back.
export function assertReadOnlyWhileImpersonating(
    req: NextRequest,
    resolved: ResolvedAuthRequestContext
): Response | null {
    if (!resolved.isImpersonating || SAFE_METHODS.has(req.method)) {
        return null;
    }
    return Response.json(
        { error: { code: "AUTH_REQUEST_IMPERSONATION_READ_ONLY" } },
        { status: HTTP_STATUS.FORBIDDEN }
    );
}
```

`SAFE_METHODS` fica privado; o teste de unidade exercita os verbos pela função pública.

### 10.2 Pseudo-diff — `apps/api/app/(guards)/common-panel.ts`

```diff
+import { assertReadOnlyWhileImpersonating } from "@/(shared)/lib/impersonation-read-only";

         const resolved = await resolveAuthRequestContext(req, userRecord, actorProfile);   // :52
         if (!resolved.ok) {
             return resolved.response;
         }
+
+        const readOnlyRefusal = assertReadOnlyWhileImpersonating(req, resolved.data);
+        if (readOnlyRefusal) {
+            return readOnlyRefusal;
+        }

         const subjectProfile = await userRepository.findByReferenceId(              // :61
             resolved.data.requestUserId
         );
```

> Posição importa: **antes** da leitura do `subjectProfile`. Uma request que já vai ser recusada não
> deve custar um round-trip ao Firestore.

### 10.3 Pseudo-diff — `apps/api/app/(guards)/admin.ts`

```diff
-import { UserRoleLevel } from "@repo/auth/types";
-import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
+import { assertReadOnlyWhileImpersonating } from "@/(shared)/lib/impersonation-read-only";

-const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);            // :13  → some
-
-        // (comentário de 8 linhas)                                   // :66-69 → migra p/ o helper
-        if (
-            resolved.data.requestRole !== UserRoleLevel.ADMIN &&
-            !SAFE_METHODS.has(req.method)
-        ) {
-            return Response.json(
-                { error: { code: "AUTH_REQUEST_PANEL_FORBIDDEN" } },
-                { status: HTTP_STATUS.FORBIDDEN }
-            );
-        }
+        const readOnlyRefusal = assertReadOnlyWhileImpersonating(req, resolved.data);
+        if (readOnlyRefusal) {
+            return readOnlyRefusal;
+        }
```

⚠️ `UserRoleLevel` continua sendo usado em `users/route.ts` mas **neste arquivo** pode ficar órfão —
conferir antes de remover os imports (o hook de format do Biome remove import não usado entre edições;
se sumir cedo demais, reaplicar).

### 10.4 Resposta de exemplo

```
POST /entities
Authorization: Bearer <token do admin>
x-user-id: admin-1
x-user-role: admin
x-request-role: common
x-request-user-id: common-9
```
```json
HTTP/1.1 403 Forbidden
{ "error": { "code": "AUTH_REQUEST_IMPERSONATION_READ_ONLY" } }
```
Com `GET` na mesma request: `200 { "data": [ … dados de common-9 … ] }`.

### 10.5 Esqueleto — `apps/api/scripts/create-dev-admin.mjs` (novo)

```js
// node --env-file=.env scripts/create-dev-admin.mjs <email> <senha>
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [email, password] = process.argv.slice(2);
// e-mail/senha por argumento ou env; abortar com instrução de uso se faltarem.
// abortar também se FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY faltarem.

initializeApp({ credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") }) });

// 1) getUserByEmail → auth/user-not-found → createUser({ email, password, emailVerified: true })
// 2) db.collection("user").where("reference_id", "==", uid).limit(1).get()
//    vazio  → add({ reference_id: uid, type: "admin", createdAt: now, updatedAt: now, deletedAt: null })
//    existe → update({ type: "admin", updatedAt: now })
// 3) log do uid + id do documento + aviso "development bootstrap". Nunca logar a senha.
```

Registrar em `apps/api/package.json`:
`"create-dev-admin": "node --env-file=.env scripts/create-dev-admin.mjs"`
(Node 22.12 — o `/develop` confirma se vale usar `--env-file-if-exists` para tolerar a ausência do
arquivo.) E `firebase-admin` nas devDependencies do mesmo arquivo.

### 10.6 Pseudo-diff — `apps/app` (contexto de painel)

```diff
 // shared/providers/AuthRequestPanelContext.tsx
 export type AuthRequestPanelContextValue = {
     profileKind: ProfileKind | null;
     panelRequestRole: UserRoleLevel;
+    /** Admin acting as a common user: every write is refused by the API. */
+    isImpersonating: boolean;
     impersonatedFirebaseUid: string | null;
     …
 };

+import { isImpersonatingSnapshot } from "@/shared/lib/panelState";
+    const isImpersonating = usePanelState(isImpersonatingSnapshot);

     return {                                                      // :242
         profileKind,
+        isImpersonating,
         …
```

### 10.7 Árvore de arquivos

```
apps/api/(shared)/lib/
  impersonation-read-only.ts                            ← novo (helper)
apps/api/app/(guards)/
  common-panel.ts                                       ← + chamada do helper
  admin.ts                                              ← predicado local → helper
  auth.ts                                               ← REMOVIDO
apps/api/scripts/
  create-dev-admin.mjs                                  ← novo (bootstrap de DEV)
apps/api/__tests__/
  commonPanelGuard.test.ts                              ← novo
  impersonationReadOnly.test.ts                         ← novo (unidade + simetria + varredura)
  adminGuard.test.ts                                    ← asserção de :106 atualizada

apps/app/shared/components/ui/
  ImpersonationReadOnlyNotice.tsx                       ← novo (Alert + isImpersonating + nome/uid)
apps/app/shared/providers/
  AuthRequestPanelContext.tsx                           ← + isImpersonating
apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/
  (pages)/(home)/EntitiesListClient.tsx                 ← aviso + 3 afordâncias
  (pages)/create/page.tsx                               ← aviso + Footer disabled
  (pages)/edit/[id]/EditEntityClient.tsx                ← aviso + Footer disabled

packages/internationalization/translations/
  packages/shared/utils.ts                              ← apiErrors ×3
  apps/app/pages/impersonation/index.ts                 ← novo namespace ×3
  apps/app/pages/index.ts                               ← registra o namespace
```

Nenhum `queryKeys` novo, nenhum hook de dados novo, nenhum campo de formulário novo.

### 10.8 Ordem de implementação / commits

Não há mudança no SDK, então a ordem começa na API. Um commit por app/pacote, pulverizado por
funcionalidade:

| # | Escopo | Commit |
|---|---|---|
| 1 | helper + `common-panel.ts` + `admin.ts` | `fix(api): make impersonation read-only across every panel guard` |
| 2 | `commonPanelGuard.test.ts` + `impersonationReadOnly.test.ts` + asserção do `adminGuard.test.ts` | `test(api): cover read-only impersonation on both panel guards` |
| 3 | remoção de `app/(guards)/auth.ts` | `chore(api): drop the unused context-less auth guard` |
| 4 | `create-dev-admin.mjs` + devDependency + script no `package.json` | `chore(api): add a development bootstrap for the first admin` |
| 5 | `isImpersonating` no contexto + `ImpersonationReadOnlyNotice` + 5 afordâncias | `feat(app): hide mutating actions while acting as another user` |
| 6 | teste do provider + teste de componente da lista (incl. fallback do nome) | `test(app): cover the read-only impersonation UI` |
| 7 | `apiErrors` ×3 + namespace `impersonation` ×3 + registro no barrel | `feat(internationalization): add the read-only impersonation copy` |
| 8 | `docs/AUTH-PANEL.md` + subseção do `docs/SETUP.md` | `docs: record impersonation as read-only` |
| 9 | `docs/features/impersonation-read-only/` | `docs(features): impersonation-read-only` |

**Duas consequências assumidas da ordem canônica do repo** (`sdk → api → app/web → i18n`), ambas
transitórias e nenhuma delas sai da branch:

- O commit 1 introduz o `error.code` antes de a copy existir (commit 7): entre os dois, um 403 nesse
  caminho cai no fallback genérico do `handleClientError`.
- Os commits 5–6 referenciam chaves de dictionary que só nascem no 7, então **o commit 5 isolado não
  passa no `typecheck`**. É o preço de manter i18n como último commit; se o `/review` preferir um
  histórico bissectável, a alternativa é mover o commit 7 para antes do 5 — e essa é decisão do
  `/review`, não do plano.

> ⛔ Não é o `planejador-tarefa` quem cria branch nem commita. A branch atual
> (`restrict-admin-impersonation-mutations`) não é protegida; o `revisor-codigo` confirma o nome no
> padrão `<project>/<type>/<title>`.

### 10.9 Env / config

Nenhuma variável **nova**. O script de §8.1 consome as `FIREBASE_ADMIN_*` que já existem
(`packages/auth/keys.ts:5-8`) e que a API já exige. Sem índice de Firestore, sem webhook, sem migração
de dado. Rollback = reverter os commits; nenhum dado gravado fica órfão (o admin de DEV criado é dado de
ambiente local, não de produção).

**Para um fork**: herda o comportamento automaticamente ao pendurar as rotas em
`requireCommonPanelApi` / `requireAdminApi`, e o teste de varredura (§4.6) cobra isso de guards novos. A
única ação do fork é reusar o `ImpersonationReadOnlyNotice` e o padrão `disabled={isImpersonating}` nas
telas próprias.

### 10.10 Documentação a atualizar (não opcional)

`docs/AUTH-PANEL.md` é declarado fonte única e termina com *"Ao mudar qualquer regra desta página,
atualize esta página."*:

- **§3** (`:52-56`) — "Admin impersonando não escreve **na área admin**" → "**em nenhum painel**".
- **§5** — nova regra 9: impersonação é somente leitura; escrita de suporte é endpoint admin no painel
  admin (a não-feature de §6.3). **Sem** citar o parâmetro de extensão, que não existe em código.
- **§7** — a linha do `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, e o `AUTH_REQUEST_PANEL_FORBIDDEN`
  (`:50`, `:195`) reduzido ao seu sentido único.
- **§9** — o helper novo na tabela "Onde mexer".

`docs/SETUP.md` — subseção nova após "Firestore" (`:111-114`): como criar o primeiro admin de DEV, com
o aviso de que é bootstrap de desenvolvimento.

`specs/BACKLOG.md:113` — o achado sai da lista quando o `/spec --sync` rodar (**não** editar agora).
`specs/firebase-emulator-seed.md` — **não** editar (§8.2).

---

## Decisões tomadas

| # | Decisão | Por quê, em uma linha | Onde no plano |
|---|---|---|---|
| **D1** | **Bloqueio absoluto**, sem escape hatch por rota — e o ponto de extensão fica **só nomeado neste plano**, nunca em código nem no `AUTH-PANEL.md` | Escrita legítima de suporte pertence a um endpoint admin no painel admin, onde a autoria é do admin; um hatch que existe no código é um hatch que alguém usa | §1.4, §6.3, §10.10 |
| **D2** | **`AUTH_REQUEST_IMPERSONATION_READ_ONLY` (403) nos dois guards**, substituindo o `AUTH_REQUEST_PANEL_FORBIDDEN` no `admin.ts:77` | Só assim a simetria é observável no contrato, não só no comportamento; e a copy antiga era falsa para este caso | §4.4 |
| **D2a** | **`AUTH_REQUEST_PANEL_FORBIDDEN` permanece** (chave e copy inalteradas nos 3 idiomas) | Verificado: não fica órfão — `auth-request-context.ts:48` e `:77` continuam emitindo-o, e `authRequestContext.test.ts:110` o consome. Sobra com o sentido original, que passa a ser o único | §4.4 |
| **D3** | Aviso **só nas telas com ação mutante**, citando o usuário personificado | Ele existe para explicar um controle desabilitado; onde não há controle desabilitado é ruído | §5.4 |
| **D3a** | O nome sai de `impersonatedLabel` (store de painel), com fallback para o uid truncado, e é composto como **rótulo + valor** reusando `navbar.actingAsUserLabel` — **sem** criar interpolação | Verificado: o `@repo/internationalization` não tem nenhum placeholder hoje; criar o primeiro seria uma convenção que todo fork herda e que o teste de paridade não valida. E `impersonatedLabel` é `null` até a hidratação | §5.4, §5.5 |
| **D4** | **Remover `apps/api/app/(guards)/auth.ts`**, em commit separado | Confirmado por grep repo-wide: **zero** importadores em código, testes, apps e pacotes — a única ocorrência é a própria declaração (`auth.ts:10`) | §4.5, commit 3 |
| **D5** | Helper explícito **`assertReadOnlyWhileImpersonating()`** em `(shared)/lib/impersonation-read-only.ts`, chamado pelos dois guards | Uma regra, importada duas vezes; nada de wrapper que esconda autorização atrás de "resolver contexto" | §4.1, §10.1 |
| **D5a** | Mitigação do risco de esquecimento: **um teste que varre `app/(guards)/`** e exige a chamada ao helper em todo wrapper `require*Api` | A regra já estava documentada em três lugares quando o segundo guard nasceu sem ela — precisa **falhar no CI**, não pedir atenção | §4.6, §7.2 |
| **D6** | Teste de componente da lista sob impersonação é **obrigatório** | É o único que trava a regressão de UI: sem ele, remover um `disabled` não acusa nada | §7.3, commit 6 |
| **D7** | **Criar o admin de DEV nesta tarefa**: script `apps/api/scripts/create-dev-admin.mjs` (ESM puro, `firebase-admin` como devDependency de `apps/api`), credenciais por argv/env, documentado em `docs/SETUP.md` | Sem admin não há impersonação e a validação visual repete o furo da feature anterior; o script cobre só o caso que o produto não sabe fazer (o primeiro admin) | §8.1, commit 4 |
| **D7a** | Delimitado contra a spec `firebase-emulator-seed`: entrega **só** o bullet do "primeiro admin", contra projeto real. Sem emulador, sem seed de dados, sem reset, sem reescrever o `SETUP.md`. A spec **não** muda de status aqui | Não antecipar uma spec de esforço M por causa de um pré-requisito de QA; e o `depends_on: firestore-admin-access` dela fica intacto porque não tocamos a conexão da API | §8.2 |

---

## Perguntas em aberto

Uma só, surgida da consolidação (verificação do D3a):

**Q — Quando o nome do usuário personificado não está disponível, o aviso mostra o UID truncado. Serve?**
`impersonatedLabel` é **client-only** e nasce `null` a cada carga: o store é semeado com `null`
(`panelStore.ts:46`) e só recebe o nome depois do mount, via `hydrateLabelFromMirror` lendo o
`localStorage` (`:51-60`). Ou seja, num reload duro há um instante — e, em aba anônima ou com storage
indisponível, permanentemente — em que o aviso diria *"Atuando como: 3f9a21bc"* em vez do nome.

- **Recomendação (default se não houver resposta): aceitar o UID truncado.** É exatamente o que o
  seletor do navbar já faz na mesma situação (`PanelNavbarControls.tsx:91`), custa zero, e o aviso
  continua correto no que importa — a mensagem de bloqueio.
- Alternativa: o aviso consumir `useListUsers` para resolver o nome, como o navbar faz. Custa uma
  chamada de rede num componente que hoje é puro, e ainda assim tem janela de carregamento.
