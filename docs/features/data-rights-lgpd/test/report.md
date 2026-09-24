# Relatório de QA - Direitos do titular: exportar dados e excluir conta

| | |
|---|---|
| Revisão | [`../review/review.md`](../review/review.md) |
| Critérios | [`criterios-aceite.md`](criterios-aceite.md) |
| Data | 2026-09-23, em duas rodadas |
| Branch | `feat/data-rights-lgpd` (não protegida; nenhum commit, nenhum `git add`) |
| Ambiente do e2e | emulador de Auth e Firestore + `api`, `app` e `web` locais, subidos e derrubados por mim |

## Placar

45 critérios: **38 aprovados, 1 reprovado, 6 não verificáveis**.

A primeira rodada reprovou dois critérios. O `revisor-codigo` corrigiu um deles (a rolagem horizontal em
375 px) e a segunda rodada mediu a correção, que fechou nos três idiomas. O reprovado que sobra é o deep
link pela barra lateral, cujo mecanismo é anterior a esta entrega.

O critério da faixa de abas rolar sem deixar aba inacessível nasceu na segunda rodada, junto da correção,
e por isso o total subiu de 44 para 45.

## Defeitos encontrados

### D1. Rolagem horizontal em 375 px (regressão desta entrega) - CORRIGIDO e conferido na rodada 2

Em viewport de 375 px o documento mede **445 px** e a página inteira ganha rolagem lateral. O elemento que
estoura é um só, a faixa de abas: **429 px** de largura. Cada aba mede 85 px e agora são cinco, então
`5 x 85 + 4 = 429`. Com as quatro abas anteriores a conta dava `4 x 85 + 4 = 344`, que cabe em 375.

`TabsList` é `inline-flex w-fit` (`packages/design-system/components/ui/tabs.tsx:28`): não quebra linha e
não tem rolagem própria, então o excedente vaza para o documento.

Repro:

1. Viewport de 375 px de largura, autenticado como usuário comum.
2. Abrir `/pt-br/account?tab=privacy`.
3. `document.documentElement.scrollWidth` responde `445`, contra `window.innerWidth` de `375`.

Medições de apoio, no mesmo viewport e na mesma sessão:

| Página | `scrollWidth` | Estoura? |
|---|---|---|
| `/pt-br/account?tab=privacy` | 445 | sim |
| `/pt-br/account?tab=profile` | 445 | sim |
| `/pt-br/entities` | 375 | não |
| `/pt-br/legal/privacy` (web) | 360 | não |

Vale para todas as abas da conta, não só Privacidade, porque a faixa é a mesma.

**Correção aplicada pelo `revisor-codigo`** (`AccountTabs.tsx:59-70`): a `TabsList` foi envolvida por um
`<div className="w-full overflow-x-auto overflow-y-hidden">`. O `packages/design-system/components/ui/tabs.tsx`
não foi tocado, porque `pnpm bump-ui` roda `shadcn add --all --overwrite` e apagaria a correção.

**Verificação na rodada 2**: fechou. Números na seção "Rodada 2" abaixo.

### D2. Trocar de aba pela barra lateral não troca a aba (pré-existente, confirmado)

Estando em `/pt-br/account?tab=profile` e clicando em "Privacidade" no menu lateral, a URL vira
`?tab=privacy` e a aba selecionada continua "Perfil". O painel renderizado continua sendo o de perfil.

O revisor previu isso lendo `AccountTabs.tsx:25-33`: `activeTab` é `useState` com inicializador, o
inicializador só roda na montagem, e ir de uma aba para outra pela barra lateral é navegação suave na
mesma rota. Confirmado na tela, e confirmado como pré-existente: o mesmo clique em "Segurança"
(`?tab=security`) também deixa "Perfil" selecionado.

Carregar a URL do zero funciona. O defeito é só o da navegação interna.

Duas coisas que a revisão acrescentou e que corrigem a minha leitura da rodada 1. Primeira: o mecanismo é
pré-existente, mas esta entrega acrescentou um terceiro item de barra lateral que o exercita
(`routes.tsx:55-58`), então o defeito não é novo e a superfície dele cresceu. Segunda: a correção óbvia
está errada. Sincronizar `activeTab` a partir de `useSearchParams()` num efeito não funciona porque a
troca de aba usa `window.history.replaceState` (`AccountTabs.tsx:51-55`), que não avisa o router do Next;
o `useSearchParams()` fica desatualizado e o efeito puxaria a aba de volta. Trocaria deep link quebrado
por abas que voltam sozinhas.

A lacuna de teste "deep link do `AccountTabs`" segue **aberta de propósito**: escrever o teste agora
fixaria o defeito.

## Gates

### Rodada 1, depois de eu acrescentar dois testes

| Comando | Resultado |
|---|---|
| `pnpm --filter api test` | 57 arquivos, **651 testes** (eram 649) |
| `pnpm --filter app test` | 63 arquivos, 455 testes |
| `pnpm --filter @repo/internationalization test` | 5 arquivos, 44 testes |
| `pnpm test` (raiz, turbo) | 10 de 10 tasks |
| `pnpm check` | 646 arquivos, 0 erros |
| `pnpm turbo run typecheck --filter=api` | 1 de 1 task |

Rodei o `pnpm check` porque toquei em dois arquivos de teste, e ele pegou um erro real na primeira
passada (`lint/complexity/noUselessUndefined` no meu stub de `batch.delete`). Corrigi e reexecutei limpo.

### Rodada 2, depois da correção do D1

O `revisor-codigo` só tocou em `apps/app`, então remedi esse workspace e o `pnpm test` da raiz, que gateia
o `turbo build`. Sem `--force`.

| Comando | Resultado |
|---|---|
| `pnpm --filter app test` | **64 arquivos, 457 testes**, todos passando (o arquivo novo é `accountTabsOverflow.test.tsx`, com 2 casos) |
| `pnpm test` (raiz, turbo) | **10 de 10 tasks**, 0 em cache: `api` 651/57, `app` 457/64, `web` 35/6, `@repo/auth` 101, `@repo/analytics` 34, `@repo/email` 137/7 |

Citados do `/review` sem remedir, porque nada mudou nesses escopos: `pnpm check` 647 arquivos e 0 erros,
`typecheck app` 1 de 1, `api` 651/57, `web` 35/6, i18n 44/5.

## Testes que eu criei

Os dois que a revisão recomendou, ambos na faixa barata. Nenhum exige processo externo.

`apps/api/__tests__/accountExportRoute.test.ts` ganhou "perde a seção de objetos, e só ela, quando a
listagem do bucket falha". `isStorageConfigured` devolve `true` e `listObjectPaths` rejeita; a asserção é
que a resposta continua 200, `storageObjects` sai `[]`, o bloco `subject` chega inteiro e o evento de
trilha é gravado assim mesmo. Fecha o caminho de exceção de `readStorageObjects`
(`account-export.ts:88-92`), que era a lacuna com o melhor custo-benefício da lista.

`apps/api/__tests__/baseRepository.test.ts` ganhou "stops and reports instead of looping when the query
never drains", mais um `PurgeableRepository` que expõe o `purgeAll` protegido e um stub de coleção cujo
`batch.delete` não tem efeito. Cada passada lê a mesma página cheia de 500. A asserção é que a chamada
rejeita com `PurgeNotFinishedError` depois de exatamente **100** commits, que é o teto. Semear 50.001
documentos custaria minutos; o stub custa milissegundos e prova o mesmo teto.

### Decisões de custo, por módulo tocado

| Módulo | Decisão |
|---|---|
| `account-export.ts` (`readStorageObjects`) | Teste novo, faixa barata. Mock do `listObjectPaths` rejeitando. |
| `base.repository.ts` (`purgeAll`) | Teste novo, faixa barata. Stub de coleção que nunca drena. |
| `account-erasure.ts` | Nada novo. Os 9 casos existentes cobrem ordem dos passos, `skipped` de storage e billing, passo que falha sem abortar os seguintes, e o nome do erro no log. |
| `account/deletion/route.ts` | Nada novo. Os 12 casos existentes cobrem senha errada, 429 do Identity Toolkit, conta sem senha, corpo sem senha, `uid` no corpo, personificação, sujeito diferente do ator, e credencial ausente. |
| `audit-event.repository.ts` (`anonymizeUserLabels`) | Nada novo. Os 10 casos existentes cobrem limpeza por papel, preservação do rótulo do admin, evento de terceiro, lotes de 500, cursor, ordenação só por id e o teto de passadas. |
| `AccountPrivacyPanel.tsx` | Nada novo. Os 10 casos existentes cobrem impersonação, conta Google, senha vazia, cancelar e o link da política. |
| `storage.ts` (`listObjectPaths`, `deleteObjectsByPrefix`) | Nada. Dependem de bucket, e bucket não existe. Ver lacunas. |
| `AccountTabs.tsx` | Nada. O comportamento que interessa (D2) é defeito, e escrever um teste que fixa o defeito atual seria pior que a lacuna. |

Nenhum teste de faixa cara (emulador ou app de pé) virou arquivo `.test.ts`. O emulador entrou como
execução manual desta etapa, não como suíte, porque o que ele prova é a infra, não uma unidade.

## Os 9 itens herdados de "Verificar no `/test`"

### 1. Download real no browser - fechado

Cliquei em "Baixar meus dados" com o navegador gravando em disco. O arquivo chegou: **2971 bytes** de JSON
válido. A âncora que nunca entra no documento e o `URL.revokeObjectURL` síncrono no `finally`
(`downloadJsonFile.ts:19-27`) não truncaram nada no Chromium.

Conteúdo conferido, campo a campo:

- `format`: `{ "name": "account-data-export", "version": 1 }`
- `subject`: `{ profileId: "nS4UGA1...", uid: "LLMPFeDb..." }`
- `account.lastAccessAt`: `2026-09-24T00:45:05.264Z`, presente
- `account.avatarUrl`: ausente; `avatar` (o caminho do objeto) está lá
- `records.entities`: 2 itens, `QA Registro Um` com `deletedAt: null` e `QA Registro Dois` com
  `deletedAt: "2026-09-24T00:49:56.463Z"`, ou seja, o soft-deletado veio junto e marcado
- `auditEvents.items`: 2, sendo `{ action: "user.update", actorRole: "operator" }` e
  `{ action: "account.password.change", actorRole: "self" }`
- `storageObjects`: `[]`
- `cookieConsent`: `{ source: "browser-cookie", cookieName: "bp:cookie-consent", decision: { decided: false, analytics: false } }`

Busca por `admin@example.com` no arquivo: **0 ocorrências**. O evento em que o admin agiu sobre a conta
chega ao titular com o papel e sem o nome do operador.

O que fica fora: segundo motor de browser. O `agent-browser` deste repo fala CDP com Chromium e não
oferece Firefox nem WebKit, então a hipótese do revisor (âncora fora do DOM costuma falhar fora do
Chromium) continua sem teste. Ver "Pendências" no fim.

### 2. Expurgo contra Firestore real ou emulador - fechado, e é o item que mais mudou de estado

Rodei contra o emulador de Firestore e de Auth, com estado construído pela própria interface. Antes de
excluir: 1 entidade viva, 1 entidade soft-deletada, 1 troca de senha (gerou `account.password.change`) e
1 edição do perfil feita pelo admin (gerou `user.update` com o admin como ator).

Depois de `POST /account/deletion` responder 200:

| O que | Antes | Depois |
|---|---|---|
| Conta no Firebase Auth (`qa-data-rights@example.com`) | existe, uid `LLMPFeDb5dLPC89R8uhhdaHABkU9` | **não existe** |
| Documento de perfil (`user/nS4UGA1ZWmA3LkiEF7it`) | existe | **não existe** |
| Entidades do titular | 2 (uma soft-deletada) | **0** |
| Entidades de outros donos | 6 | 6, intactas |
| Eventos de trilha do titular | continuam existindo, com rótulo | continuam existindo, **sem rótulo** |

A prova que distingue isto do soft delete: cadastrei de novo com o mesmo e-mail e consegui. O e-mail foi
liberado. A conta nova nasceu com uid `1sr7uf0yNCKsyiUUWJfXPDezDgI1` (diferente) e perfil
`bmnI5Z34dOpglMvTuPno` (diferente), sem herdar registro nenhum. Exportei pela conta nova para confirmar:
`records.entities: []`, `subject.uid` é o novo, e o único evento de trilha é a própria exportação.

Sobre o teto de 100 passadas e o `orderBy(FieldPath.documentId())` sobre `array-contains`, que o revisor
mandou medir junto: rodei uma sonda somente de leitura contra o projeto Firestore real
(`next-boilerplate-576d0`, credencial do `apps/api/.env`), com as quatro formas de consulta que a entrega
emite. Nenhuma devolveu `FAILED_PRECONDITION`:

| Consulta | Resultado no projeto real |
|---|---|
| `auditEvent` `array-contains` + `orderBy(__name__)` + `limit(500)` | servida, 0 docs |
| a mesma, com `startAfter` (a segunda página do cursor) | servida, 0 docs |
| `auditEvent` `array-contains` + `limit(5001)`, sem ordenação | servida, 0 docs |
| `entity` `userId ==` + `limit(500)`, sem ordenação | servida, 0 docs |

Isso responde o que o emulador não responderia: o índice automático serve a combinação, e nenhum índice
composto novo entra na fila. A sonda não escreveu nada e o arquivo temporário foi removido.

O teto de 100 passadas em si não foi exercitado contra Firestore (exigiria mais de 50 mil documentos); ele
passou a ter teste de unidade nesta etapa, com stub.

### 3. Trilha depois da exclusão - fechado

Abri `/pt-br/admin/audit` como admin depois da exclusão. A tabela renderiza o rótulo nulo como travessão,
não como "null", "undefined" nem célula vazia. Linhas observadas, na ordem:

| Quando | Ação | Autor | Alvo | Campos alterados |
|---|---|---|---|---|
| 22:09 | Conta excluída pelo titular | (travessão) | (travessão) | (travessão) |
| 22:00 | Acesso à conta de outro usuário | admin@example.com | (travessão) | (travessão) |
| 22:00 | Acesso à conta de outro usuário | admin@example.com | user@example.com | (travessão) |
| 21:55 | Dados exportados | (travessão) | (travessão) | (travessão) |
| 21:54 | Dados exportados | (travessão) | (travessão) | (travessão) |
| 21:54 | Perfil alterado pelo admin | admin@example.com | (travessão) | type, displayName |
| 21:50 | Senha alterada | (travessão) | (travessão) | (travessão) |

Três coisas que essas linhas provam de uma vez: o rótulo do operador sobrevive (`admin@example.com` nas
linhas em que ele agiu), o evento de outra pessoa não foi tocado (a linha 22:00 com `user@example.com`
manteve os dois rótulos), e o `account.delete` nasceu sem rótulo nenhum. As duas ações novas aparecem
traduzidas: "Dados exportados" e "Conta excluída pelo titular".

Conferi também direto no Firestore: `user.update` ficou com `actorLabel: "admin@example.com"` e
`targetLabel: null`, com `action`, `createdAt` e `requestId` intactos.

### 4. `403 ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN` - fechado pelo revisor, com observação de tela

Não regastei tempo no `curl`, como orientado. O que acrescentei foi a tela: como admin personificando o
titular, a aba Privacidade mostra o bloco "Modo somente leitura. Ações de criação, edição e exclusão ficam
bloqueadas enquanto você atua como outro usuário. Atuando como: Titular QA", e os dois botões aparecem com
atributo `disabled`.

Tentei confirmar o 403 por `fetch` de dentro da página e a chamada falhou no CORS antes de chegar à rota,
porque o SDK autentica por bearer e não por cookie. Não insisti: o caso "recusa o export quando um admin
está personificando" atravessa o guard real no teste de rota, e ele passa.

### 5. Conta só com Google - fechado

Criei uma conta com provedor Google de verdade no emulador de Auth (`accounts:signInWithIdp` com
`providerId=google.com`) e li o registro de volta pelo Admin SDK, que é a fonte que o `serializeUserRecord`
usa:

```
providerData: [{ providerId: "google.com", uid: "google-qa-uid-001", email: "qa-data-rights-google@example.com" }]
has password provider: false
```

Com a sessão dessa conta, a aba Privacidade troca o bloco de exclusão pelo texto do canal:
"Exclusão pelo canal de privacidade. A sua conta entra pelo Google e não tem senha para confirmar a
exclusão. Peça a exclusão pelo canal de privacidade da política." Contei os botões com "Excluir" no
painel: zero. O `providerData` deixa de ser sintético.

### 6. Light, dark e mobile nos 3 idiomas - fechado, com um reprovado

Percorri a aba Privacidade e a página legal nos três idiomas, nos dois temas e em 375 px.

Copy conferida na tela, não no dicionário:

- pt-br: "Baixe uma cópia dos seus dados ou apague a sua conta. As duas ações valem só para a sua conta." /
  "Baixar meus dados" / "Excluir minha conta" / "Pedidos enviados pelo canal de privacidade são respondidos
  em até 15 dias." / diálogo "Excluir a sua conta?" com "Senha atual", "Cancelar" e "Excluir para sempre".
- en: "Download a copy of your data or delete your account. Both actions apply to your account only." /
  "Download my data" / "Delete my account" / "Requests sent through the privacy channel are answered within
  15 days." / diálogo "Delete your account?" com "Current password", "Cancel" e "Delete forever".
- es: "Descarga una copia de tus datos o elimina tu cuenta. Ambas acciones se aplican solo a tu cuenta." /
  "Descargar mis datos" / "Eliminar mi cuenta" / "Las solicitudes enviadas por el canal de privacidad se
  responden en un plazo de 15 días." / diálogo "¿Eliminar tu cuenta?" com "Contraseña actual", "Cancelar" e
  "Eliminar para siempre".

Tema: nos dois, o painel mantém contraste legível. O botão de excluir é vermelho sólido com texto branco no
claro e vermelho escuro com texto claro no escuro. O botão de confirmação dentro do diálogo usa a variante
padrão (preto no claro), não a destrutiva. Não classifiquei isso como defeito, mas registro porque o botão
que executa a ação irreversível é o menos marcado dos dois.

Mobile: as duas preocupações dirigidas do revisor não se confirmaram, e uma terceira apareceu.

- A seção de cookies dentro do `max-w-2xl` está bem. É o texto mais longo da página legal e quebra linha
  dentro da coluna. Em 375 px a página mede 360 px, sem rolagem horizontal.
- O `AlertDialog` com campo de senha em 375 px está bem. O diálogo mede 343 px, fica centralizado, o campo
  ocupa a largura toda e os dois botões ficam lado a lado.
- A faixa de abas não está. É o defeito D1 acima.

### 7. Duplo clique - fechado nos dois botões

Com o log de rede limpo antes de cada tentativa:

| Ação | Requisições disparadas |
|---|---|
| Duplo clique nativo em "Baixar meus dados" | 1 `GET /account/export` com status 200 |
| Dois cliques seguidos em "Excluir para sempre" | 1 `POST /account/deletion` com status 200 |

No caso da exclusão, o segundo clique nem encontrou o botão: o diálogo já havia fechado. A correção que o
revisor aplicou no botão de exportar (`disabled={isImpersonating || exportDataMutation.isPending}`) passou
a ter medição, e não só leitura.

### 8. Rate limit efetivo - fora de escopo, confirmado no boot

A API disse no arranque, com `ARCJET_KEY` vazia:

```
[security] rate limiting is DISABLED (no ARCJET_KEY). Public auth routes accept unlimited requests.
```

Não há o que medir. Os dois caminhos estarem em `RATE_LIMITED_PATHS` continua provado por
`corsOrigin.test.ts`.

### 9. Deep link `/account?tab=privacy` - metade fechada, metade reprovada

Carregar a URL do zero funciona: a aba Privacidade vem selecionada e o painel certo renderiza. Ir para ela
pela barra lateral não funciona, e é o defeito D2 acima.

## Rodada 2: a medição que fecha o D1

O `revisor-codigo` deixou explícito o que não conseguia medir: o teste que ele escreveu
(`accountTabsOverflow.test.tsx`, 2 casos) prova que a `TabsList` está dentro de um contêiner com
`overflow-x-auto` e `w-full`, porque jsdom não faz layout. Provar que a página parou de rolar exige tela.

Subi o ambiente de novo e repeti a mesma medição da rodada 1, a 375 px, em `/account?tab=privacy`, logado
como usuário comum do seed.

### Largura da página nos 3 idiomas

| Idioma | Rótulo da 5ª aba | Largura da faixa | `scrollWidth` do documento | `innerWidth` | Página rola? |
|---|---|---|---|---|---|
| pt-br | Privacidade | 429 px | **375** | 375 | **não** |
| en | Privacy | 366 px | **375** | 375 | **não** |
| es | Privacidad | 433 px | **375** | 375 | **não** |

Na rodada 1 o mesmo `scrollWidth` em pt-br dava 445. O contêiner novo mede 343 px de largura visível e
343 px é o que a página enxerga, independente de a faixa medir 366 ou 433.

Os números explicam por que o defeito dependia do idioma. Em inglês as abas medem 72 px cada e a faixa
fecha em 366, que **cabia** em 375: o bug nunca teria aparecido numa passada só em inglês. Em português e
espanhol as abas medem 85 px e a faixa passa de 375. Medir nos três era o certo.

### A faixa rola e nenhuma aba fica inacessível

| Idioma | Percurso de rolagem | 5ª aba inteira à vista no fim do percurso |
|---|---|---|
| pt-br | 86 px | sim |
| es | 90 px | sim |
| en | 23 px | sim |

Cliquei nas abas uma a uma em 375 px: Segurança, Preferências e Cobrança trocam de painel e de query
string (`?tab=security`, `?tab=preferences`, `?tab=billing`) sem sair de `scrollWidth` 375. Privacidade
precisa do arraste antes do toque, e depois dele o clique registra e o painel troca. Ou seja, a aba é
alcançável; ela só não está sob o dedo no primeiro instante.

### O corte é mesmo só no eixo X

A variante em uso é a `default`, não a `line`. Conferido no DOM: `data-variant="default"`, a aba ativa tem
fundo próprio (a pílula) e ela cabe inteira dentro do contêiner. O sublinhado `after:`, que ficaria 5 px
abaixo da faixa, só ganha `opacity: 1` sob
`group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100`; aqui a opacidade computada é
`0`. O `overflow-y-hidden` não esconde indicador nenhum, porque não há indicador para esconder nesta
variante.

### Desktop e tema

Em 1280 px a faixa mede 429 px dentro de um contêiner de 991 px e `scrollWidth === clientWidth`: nenhuma
barra aparece quando cabe. `scrollWidth` do documento continua 1280. Em tema claro e escuro a 375 px o
resultado é o mesmo, sem rolagem de página e com a pílula da aba ativa inteira.

### O que a correção deixa como aresta

Ao carregar `/pt-br/account?tab=privacy` direto em 375 px, o contêiner começa em `scrollLeft: 0`, então a
aba ativa aparece **em parte** e não inteira. O painel correto renderiza, a faixa cortada sinaliza que há
mais coisa à direita, e um arraste resolve. Não classifiquei como reprovação: o critério é aba alcançável,
e ela é. Fica registrado como acabamento a considerar, e a saída seria um `scrollIntoView` da aba ativa na
montagem.

## As 4 lacunas de teste, com veredito

| Lacuna | Veredito |
|---|---|
| `listObjectPaths` e `deleteObjectsByPrefix` (`storage.ts`) | **Continua aberta.** Depende de bucket, e não há bucket nem emulador de Storage. Não escrevi teste que finja ter um: seria provar o mock. |
| Exceção de `readStorageObjects` (`account-export.ts`) | **Fechada aqui.** Teste novo em `accountExportRoute.test.ts`. |
| `PurgeNotFinishedError` e o teto de 100 passadas | **Fechada aqui.** Teste novo em `baseRepository.test.ts`, com stub que nunca drena. |
| Deep link do `AccountTabs` por `?tab=` | **Continua aberta de propósito.** Escrever o teste agora fixaria o comportamento errado; ele deve nascer junto da correção de D2. |

## `revokeObjectURL` síncrono: o que a medição diz

O revisor deixou explicitamente para esta etapa decidir se mexe em `downloadJsonFile.ts:19-27`, porque
corrigir exigiria mudar a asserção "libera o objectURL depois do clique"
(`downloadJsonFile.test.ts:74-79`), escrita de propósito.

Medição: no Chromium o arquivo chega inteiro ao disco, 2971 bytes de JSON válido e parseável. A revogação
síncrona não truncou o download.

Isso não resolve a hipótese, resolve o caso testável. O risco que o revisor levantou é sobre outro motor, e
não há outro motor disponível: o `agent-browser` deste repo é CDP/Chromium. Recomendação: não mexer agora.
Trocar por `document.body.appendChild(anchor)` mais revogação no próximo tick seria mudar código e teste
com base em hipótese que ninguém consegue medir aqui.

## Evidências

Os prints ficam em `test/e2e/`, mas o `.gitignore` descarta `docs/features/**/test/e2e/`, então eles não
sobrevivem ao commit. O que prova o comportamento é o texto acima. A lista abaixo serve só para quem
estiver com o diretório em mãos na mesma sessão.

`01-privacy-ptbr-dark.png`, `02-deeplink-soft-nav-bug.png`, `03-privacy-impersonation.png`,
`04-privacy-ptbr-light.png`, `05-delete-dialog-ptbr-light.png`, `06-delete-wrong-password.png`,
`07-delete-dialog-en-light.png`, `08-delete-dialog-es-light.png`, `09-privacy-mobile-dark.png`,
`10-delete-dialog-mobile375.png`, `11-admin-audit-null-labels.png`, `12-legal-privacy-ptbr-dark.png`,
`13-legal-privacy-mobile.png`, `14-privacy-google-only-account.png`, `15-privacy-es-dark.png`,
`16-abas-mobile375-corrigido.png`, `17-abas-mobile375-light.png` (os dois últimos, da rodada 2).

Nenhum print contém e-mail, nome ou foto de pessoa real: todas as contas são de QA ou do seed.

## Ambiente do e2e

Todas as portas estavam livres quando comecei, então subi tudo e derrubei tudo. Nenhum serviço do usuário
foi reutilizado e nenhum foi derrubado por engano.

| Serviço | Porta | Quem subiu |
|---|---|---|
| Emulador de Auth e Firestore (`pnpm emulators`) | 9099, 8080, 4001, 4400, 4500, 9150 | eu |
| `api` | 3002 | eu |
| `app` | 3000 | eu |
| `web` | 3001 | eu |

O emulador exigiu `JAVA_HOME=/opt/homebrew/opt/openjdk@21` exportado antes de subir, porque a fórmula é
keg-only e o `java` do `PATH` é o 17. Com a variável exportada ele subiu em 2 segundos. Vale registrar
porque o `docs/SETUP.md` já documenta isso e três revisões anteriores concluíram, erradamente, que o
emulador não roda nesta máquina.

Escolhi o emulador em vez do projeto real porque o objeto do teste é a infra: se `purgeAll` drena de
verdade, se `deleteUser` libera o e-mail, se a varredura da trilha paginada por cursor termina. Nenhuma
dessas perguntas um repositório mockado responde. Para a pergunta que o emulador não responde, que é
índice composto, usei a sonda de leitura contra o projeto real descrita no item 2.

Alteração temporária de configuração: os três `.env` deste workspace apontavam para o projeto Firebase
real. Copiei os três para fora, troquei pelos `.env.example` (que já vêm apontados para o emulador) e
acrescentei `NEXT_PUBLIC_PRIVACY_CONTACT` no da `web` para exercitar o canal com endereço preenchido. No
fim restaurei os originais e conferi por checksum: os três batem byte a byte com o que estava antes.

Portas depois do teardown, uma a uma: 3000, 3001, 3002, 3003, 9099, 8080, 4001, 4400, 4500 e 9150 todas
vazias no `lsof`. Matei por PID, nunca por nome de processo.

### Rodada 2

Mesmo procedimento, escopo menor. Todas as portas estavam livres de novo, então subi emulador, `api` e
`app`; não subi a `web`, porque a correção é só de `apps/app` e as páginas legais não mudaram. Usei as
contas do `pnpm seed` (entrei como `user@example.com`) e **não criei conta de QA nenhuma** nesta rodada.

Troquei os `.env` de `api` e `app` pelos `.env.example` e restaurei no fim. Os três checksums batem com o
estado anterior: `apps/api/.env` `8e373dbc…`, `apps/app/.env` `db6a2d93…` e `apps/web/.env` `b5e2018b…`,
este último intocado. Portas conferidas uma a uma depois do teardown, todas vazias.

## Contas e dados de QA criados

Tudo viveu no emulador e morreu com o processo. Não há resíduo em projeto Firebase real, e a lista de
contas de QA do `docs/PRE-PRODUCTION.md` não precisa crescer por causa desta rodada.

| Conta | Papel | Para quê |
|---|---|---|
| `qa-data-rights@example.com` | comum | fluxo inteiro: export, troca de senha, exclusão e recadastro com o mesmo e-mail |
| `qa-data-rights-google@example.com` | comum, provedor `google.com` | conta sem senha, para o bloco do canal de privacidade |
| `admin@example.com`, `user@example.com`, `user2@example.com` | seed | do `pnpm seed`, não foram criadas por mim |

Registros criados pela interface: duas entidades chamadas `QA Registro Um` e `QA Registro Dois`, a segunda
apagada de propósito para produzir um soft delete. As duas foram destruídas pelo expurgo, que era o ponto.

A rodada 2 não criou conta nem registro: entrei com `user@example.com`, que vem do `pnpm seed`.

As senhas usadas não estão neste arquivo nem em nenhum outro do repositório. As contas do seed usam a senha
que o `docs/SETUP.md` já publica; as de QA foram digitadas na sessão e morreram com o emulador.

## Cross-check

| Eixo | Coberto |
|---|---|
| Usuário comum | sim, é o caminho principal |
| Admin | sim, trilha de auditoria e edição de perfil |
| Admin personificando | sim, os dois botões desabilitados e o aviso de somente leitura |
| Não autenticado | sim, redireciona para `/sign-in`; a rota responde 401 por teste |
| pt-br, en e es | sim, aba e página legal nos três |
| Light e dark | sim |
| Desktop 1280 e mobile 375 | sim, nas duas rodadas; é onde o D1 apareceu e onde a correção foi medida |
| `apps/app` e `apps/web` | sim, aba de privacidade e páginas legais |
| `subscription` e `simple` | não exercitado; nenhum arquivo da entrega lê `NEXT_PUBLIC_PRODUCT_MODE` |

## Pendências para o `/cycle`

1. D1 está fechado. Corrigido pelo `revisor-codigo` e medido nos três idiomas nesta etapa.
2. Aresta que a correção do D1 deixa: em 375 px a aba ativa não é rolada para o centro na montagem, então
   ela aparece só em parte ao abrir `?tab=privacy`. Um `scrollIntoView` da aba ativa resolveria. Não
   reprova nada, porque a aba é alcançável.
3. D2 continua aberto. O mecanismo é pré-existente e afeta as quatro abas que já existiam, mas esta
   entrega acrescentou um terceiro item de barra lateral que o exercita. Vale uma tarefa própria, junto do
   teste de deep link do `AccountTabs`, que continua faltando de propósito.
4. Segundo motor de browser para o download continua sem cobertura. Fechar isso exige ferramenta que este
   repo não tem hoje, e a spec `e2e-testing` do backlog é o lugar dessa discussão.
5. `EXPORT_MAX_RECORDS = 5000` segue arbitrário, como o `/develop` e o `/review` já registraram. Nada nesta
   passada trouxe número para justificar outro valor.
6. Storage e assinatura continuam não verificáveis por ausência de bucket e de chave da Stripe. São
   pré-requisitos de infra, não falhas de código, e já estão no `docs/PRE-PRODUCTION.md`.

## Estado do gate

O `STATE.md` registrava `review = in-progress` quando comecei, e `git rev-list --count origin/main..HEAD`
respondeu `0`: não há commit da feature. O gate não está mentindo, ele apenas ainda não fechou, porque o
plano de commits do `/review` continua pendente da aprovação do usuário.

A primeira rodada marcou `test = blocked` por causa do D1. Com o D1 corrigido e medido, a segunda marca
`test = done`. O reprovado que sobra, o D2, sai como achado: o mecanismo é anterior a esta entrega, a
correção ingênua está descartada com motivo, e o teste que faltaria fixaria o defeito se fosse escrito
agora.
