# Critérios de aceite — `impersonation-read-only`

Formato §9.1 do [`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md). A feature entrega
**dois** defeitos: a autorização (impersonação é somente leitura em todos os painéis) e a copy de erro da
API (o `error.code` voltar a virar texto traduzido na tela). Os critérios cobrem os dois.

O roteiro de teste manual está na seção final, no formato *passo → input → resultado esperado*.

---

## A. Autorização — impersonação é somente leitura

**A1. Leitura continua liberada para o admin que personifica um usuário comum.**
Enquanto um administrador atua como outro usuário no painel comum, todo método seguro (`GET`, `HEAD`,
`OPTIONS`) responde normalmente nas rotas comuns. Ver os dados do usuário é o propósito do modo, e o
próprio seletor de impersonação é alimentado por um `GET`: recusar leitura prenderia o admin no primeiro
usuário que escolheu, sem caminho de volta. A lista, o registro por id e o formulário de edição carregam
os dados do usuário personificado, não os do admin.

**A2. Toda mutação pelas rotas comuns é recusada com `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`.**
`POST`, `PUT`, `PATCH` e `DELETE` sob impersonação são barrados pelo `requireCommonPanelApi` e nenhuma
escrita chega ao Firestore. O corpo da resposta é exatamente `{"error":{"code":"AUTH_REQUEST_IMPERSONATION_READ_ONLY"}}`.
Este é o defeito de origem: antes da correção esse mesmo cenário respondia 200/201/204 e gravava o dado
sob a identidade do usuário personificado, destruindo a autoria do ato.

**A3. A recusa vem do guard, antes de qualquer validação de corpo ou de posse.**
Um `POST` com corpo malformado sob impersonação responde 403, não 400; um `PUT` para um recurso
inexistente responde 403, não 404. A ordem importa porque um 400/404 revelaria que a requisição chegou a
ser processada e, pior, transformaria o bloqueio de autorização num erro de forma — indistinguível de um
bug para quem lê o log.

**A4. A regra é idêntica no guard admin — mesma condição, mesmo código de erro.**
`requireAdminApi` recusa mutação sob impersonação com o **mesmo** `AUTH_REQUEST_IMPERSONATION_READ_ONLY`
que o guard comum, porque os dois chamam o mesmo helper. Antes, o guard admin emitia
`AUTH_REQUEST_PANEL_FORBIDDEN` para essa situação: dois códigos para uma regra só é o que faz um fork
tratar os painéis como se tivessem políticas diferentes. `AUTH_REQUEST_PANEL_FORBIDDEN` continua existindo
para o caso legítimo dele (painel incompatível com o perfil), sem virar chave órfã.

**A5. O admin agindo como ele mesmo no painel admin não é afetado.**
Com o painel em "Administração" e sem usuário personificado, o administrador cria, edita, alterna e exclui
usuários normalmente pelas rotas admin. Nenhum aviso de somente leitura aparece e nenhuma afordância fica
desabilitada. Este é o critério que separa "impersonação é somente leitura" de "admin é somente leitura" —
confundir os dois inutilizaria o painel administrativo.

**A6. O usuário comum titular opera sobre os próprios dados sem qualquer restrição.**
Um usuário comum autenticado cria, edita, alterna e exclui as próprias entidades, com resposta 2xx e sem
aviso na tela. A regra mira exclusivamente a impersonação; qualquer vazamento dela para o titular seria
uma regressão mais grave que o defeito original, porque quebraria o caminho principal do produto.

**A7. O admin que remove os headers de impersonação falha fechado.**
Chamar uma rota comum como administrador sem personificar ninguém (`requestRole = admin`,
`requestUserId = uid` do próprio admin) responde `403 COMMON_PANEL_FORBIDDEN` — o sujeito resolvido é o
perfil do admin, que não é do tipo comum. Este é o caminho óbvio de contorno ("removo os headers e escrevo
como eu mesmo") e ele não pode virar uma porta lateral aberta pela correção.

**A8. Ownership permanece intacto e ortogonal ao bloqueio.**
Um usuário comum que tenta ler, editar ou excluir uma entidade de outro usuário continua recebendo
`404 ENTITY_NOT_FOUND`. O guard barra por método, o handler barra por dono; as duas checagens são
independentes e nenhuma substitui a outra.

**A9. Um chamador não autenticado é recusado antes de tudo.**
Sem sessão válida, qualquer rota comum ou admin responde `401 AUTH_INVALID_TOKEN`, independentemente do
método e dos headers de painel enviados.

**A10. Um guard novo que esqueça a regra quebra o build.**
Existe um teste que varre `apps/api/app/(guards)/` e falha se algum guard não chamar
`assertReadOnlyWhileImpersonating`. O risco residual do desenho é o esquecimento em um guard futuro — num
boilerplate que gera forks, esse esquecimento se replica silenciosamente, então a mitigação precisa ser
executável e não documental.

---

## B. Espelho na UI — a tela não oferece o que a API recusa

**B1. As cinco afordâncias mutantes de `entities` são suprimidas sob impersonação.**
Na lista, o botão "Novo" e os `Switch` de "Ativo" ficam `disabled` e o item "Excluir" **não é renderizado**
no menu de ações; nas telas de criar e editar, o botão "Salvar" fica `disabled`. Botão que existe só para
produzir 403 é defeito de produto: a regra de ouro diz que UI oculta nunca é a única proteção, e o inverso
também vale.

**B2. Um aviso explica o motivo e nomeia o usuário personificado.**
As três telas com ação mutante mostram um `Alert` com `role="alert"` contendo título, descrição e a linha
"Atuando como: `<usuário>`". Controle desabilitado não recebe foco nem é anunciado por leitor de tela, então
a explicação precisa ser uma live region própria — sem ela, um admin não-vidente perde o único sinal de que
está em modo restrito.

**B3. O aviso degrada para o uid truncado, nunca para `null`.**
Quando o rótulo de exibição ainda não hidratou (ele vem do `localStorage`, que só existe depois do mount), o
aviso mostra os 8 primeiros caracteres do uid. Em nenhuma hipótese renderiza a string `null` ou `undefined`.

**B4. Fora da impersonação o aviso não existe no DOM.**
Para o usuário comum titular e para o admin no painel admin, o componente devolve `null` — não é um aviso
escondido por CSS. Um aviso presente e invisível ainda é lido por tecnologia assistiva.

**B5. As afordâncias voltam ao sair da impersonação.**
Ao trocar o painel de volta para "Administração", "Novo" e os `Switch` voltam a ficar habilitados e o aviso
some, sem reload manual. A transição de entrada e a de saída são caminhos distintos e a de saída é a que
costuma ficar presa em estado obsoleto.

**B6. Tema e viewport não alteram a regra.**
As telas sob impersonação se comportam igual em light e dark e em mobile (390×844) e desktop (1280×900). No
mobile o seletor de usuário some do navbar, então o aviso passa a ser a **única** indicação de quem está
sendo personificado — o que torna B2 mais crítico nesse viewport, não menos.

---

## C. Copy de erro da API — o `error.code` chega traduzido ao usuário

**C1. Um `error.code` conhecido vira a copy traduzida no locale ativo.**
O 403 de somente leitura exibe "Somente leitura: você está atuando como outro usuário." em pt-br,
"Read-only: you are acting as another user." em en e "Solo lectura: estás actuando como otro usuario." em es.
Antes da correção **todo** `error.code` do repositório caía em "Um erro inesperado aconteceu", porque o SDK
embrulhava o erro em `FormattedError` e a tela embrulhava de novo — e `FormattedError` não estende `Error`,
então o segundo embrulho não reconhecia o primeiro. Este critério vale para todos os códigos, não só para o
desta feature.

**C2. O locale é o da tela, não o do SDK.**
A mesma requisição feita em `/en` e em `/es` produz mensagens diferentes. Antes o SDK fixava pt-br ao
formatar, então um usuário em inglês recebia copy em português — quando recebia alguma.

**C3. Um código conhecido nunca cai no texto genérico.**
Nenhuma chave presente em `apiErrors` deve resultar na mensagem de fallback. É o que garante que as chaves
de tradução não sejam copy que ninguém lê.

**C4. Erro do Firebase Auth continua traduzido (regressão do sign-in / sign-up).**
Entrar com senha errada mostra "Credenciais inválidas. Verifique e-mail e senha."; cadastrar com e-mail já
existente mostra "Este e-mail já está em uso.". Esses fluxos passam pelo Firebase client, não pelo SDK, e
compartilham o mesmo formatador — mexer nele sem cobrir esses caminhos é o risco mais direto da correção.

**C5. Falha de transporte não é confundida com erro do Firebase nem vira copy.**
Um `AxiosError` sem resposta (`ERR_NETWORK`, `ECONNABORTED`) tem `code` e `message`, exatamente como um erro
do Firebase. O formatador só reconhece código que o dicionário conhece e manda o resto para o fallback:
"Network Error" nunca aparece como texto de interface.

**C6. Os três idiomas têm a chave nova, em paridade.**
`AUTH_REQUEST_IMPERSONATION_READ_ONLY` existe em `apiErrors` nos três blocos de idioma, e a copy do aviso
(`pages.impersonation.readOnly.title` / `.description`) também. O teste de paridade falha se faltar um.

**C7. Os demais apps que consomem o SDK não regridem.**
`apps/web` declara `@repo/sdk` e `@repo/shared`; a mudança no formato do erro propagado não pode quebrar seu
build nem sua renderização.

---

## Roteiro de teste manual

Ambiente: `pnpm --filter api dev` (3002) + `pnpm --filter app dev` (3000). É preciso um administrador e um
usuário comum. Para criar/recuperar o admin:
`DEV_ADMIN_PASSWORD=<senha> pnpm --filter api create-dev-admin <email>` (idempotente; **redefine** a senha de
conta existente). Nunca grave a senha em arquivo.

### Roteiro 1 — o admin no painel admin não foi afetado (A5)

| # | Ação / input | Resultado esperado |
|---|---|---|
| 1 | Entrar em `/pt-br/sign-in` com o e-mail e a senha do admin | Redireciona para `/pt-br/admin` |
| 2 | Ir a `/pt-br/admin/users` | Lista carrega; "Novo" **habilitado**; nenhum aviso de somente leitura |
| 3 | Clicar no `Switch` "Ativo" de um usuário | `PUT /users/<id>` responde **200**; o switch muda de estado |
| 4 | Clicar no mesmo `Switch` de novo | Volta ao estado original (deixa o ambiente limpo) |

### Roteiro 2 — entrar na impersonação e ver as afordâncias sumirem (A1, B1, B2)

| # | Ação / input | Resultado esperado |
|---|---|---|
| 5 | No navbar, trocar o combo de painel de "Administração" para "Painel do usuário" | Navega para `/pt-br`; aparece o seletor "Selecione o usuário" |
| 6 | No seletor, escolher o usuário comum alvo | Contexto troca; a tela recarrega com os dados do alvo |
| 7 | Ir a `/pt-br/entities` | Lista mostra as entidades **do alvo**, não as do admin |
| 8 | Observar o topo da lista | `Alert` "Modo somente leitura" + "Atuando como: `<e-mail do alvo>`" |
| 9 | Observar o botão "Novo" e os `Switch` da coluna "Ativo" | Todos **desabilitados** (o `Switch` mantém o estado real do dado visível) |
| 10 | Abrir o menu de ações (⋮) de uma linha | Só "Editar"; **"Excluir" ausente** |
| 11 | Ir a `/pt-br/entities/create` | Aviso acima do formulário; "Salvar" desabilitado |
| 12 | Voltar à lista, abrir "Editar" de uma linha | Dados do alvo carregam; "Salvar" desabilitado |

### Roteiro 3 — a API recusa mesmo contornando a UI, e a copy chega traduzida (A2, C1, C2)

| # | Ação / input | Resultado esperado |
|---|---|---|
| 13 | Em `/pt-br/entities/create`, preencher "Nome" com `Bypass probe` | Campo aceita o valor |
| 14 | No devtools, remover o atributo `disabled` do `<button type="submit">` e clicar | `POST /entities` responde **403** com `{"error":{"code":"AUTH_REQUEST_IMPERSONATION_READ_ONLY"}}` |
| 15 | Ler o toast | "Somente leitura: você está atuando como outro usuário." — **não** "Um erro inesperado aconteceu" |
| 16 | Repetir 13–15 em `/en/entities/create` | Toast: "Read-only: you are acting as another user." |
| 17 | Repetir 13–15 em `/es/entities/create` | Toast: "Solo lectura: estás actuando como otro usuario." |
| 18 | Voltar a `/pt-br/entities` | A lista tem **o mesmo número de linhas** de antes — nenhuma entidade criada |

### Roteiro 4 — sair da impersonação restaura tudo (B5)

| # | Ação / input | Resultado esperado |
|---|---|---|
| 19 | Trocar o combo de painel de volta para "Administração" | Navega para `/pt-br/admin` |
| 20 | Ir a `/pt-br/admin/users` | "Novo" habilitado, todos os `Switch` habilitados, **nenhum** aviso |

### Roteiro 5 — o caminho feliz do usuário comum titular (A6, B4)

| # | Ação / input | Resultado esperado |
|---|---|---|
| 21 | Sair da conta; cadastrar (ou entrar com) um usuário comum em `/pt-br/sign-up` | Redireciona para `/pt-br` |
| 22 | Ir a `/pt-br/entities` | "Novo" habilitado; **nenhum** aviso de somente leitura |
| 23 | Clicar "Novo", preencher "Nome" e "Descrição", clicar "Salvar" | `POST /entities` **201**; volta à lista com a linha nova visível |
| 24 | Clicar no `Switch` "Ativo" da linha | `PUT /entities/<id>` **200**; o switch muda |
| 25 | Menu de ações (⋮) da linha | "Editar" **e** "Excluir" presentes |
| 26 | "Editar", alterar o "Nome", "Salvar" | `PUT` **200**; a lista mostra o **nome novo** |
| 27 | Menu de ações → "Excluir" → confirmar "Sim" no popconfirm | `DELETE /entities/<id>` **204**; a linha some da lista |

### Roteiro 6 — a copy de erro do Firebase não regrediu (C4)

| # | Ação / input | Resultado esperado |
|---|---|---|
| 28 | Em `/pt-br/sign-in`, e-mail válido + senha errada, "Entrar" | Toast: "Credenciais inválidas. Verifique e-mail e senha." |
| 29 | Em `/pt-br/sign-up`, e-mail já cadastrado, "Cadastrar" | Toast: "Este e-mail já está em uso." |

### Roteiro 7 — tema e viewport (B6)

| # | Ação / input | Resultado esperado |
|---|---|---|
| 30 | Repetir os passos 7–10 em tema **light** e em **dark** | Aviso e controles desabilitados legíveis nos dois; a `Table` (antd) respeita o tema |
| 31 | Repetir os passos 7–10 em viewport **390×844** | Aviso quebra em várias linhas sem estourar; o seletor de usuário some do navbar e o aviso vira a única indicação de quem está sendo personificado |
