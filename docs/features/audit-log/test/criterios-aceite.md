# Critérios de aceite — Trilha de auditoria de ações sensíveis

- **Plano**: [`analyze/plan.md`](../analyze/plan.md) · **Revisão**: [`review/review.md`](../review/review.md)
- **Formato**: §9.1 de [`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md)
- **Status por critério**: [`report.md`](report.md)

---

- [ ] **Um admin excluindo um usuário deixa registro que sobrevive à exclusão**
  `DELETE /users/:id` como admin cria um documento `action: "user.delete"` em `auditEvent` com
  `actorUserId`, `actorUid` e `actorLabel` do admin e `targetUserId`/`targetLabel` do excluído. O
  `targetLabel` é lido antes do soft delete, então o evento continua nomeando quem saiu mesmo depois que o
  perfil some da listagem. A resposta continua 204 sem corpo.

- [ ] **Alteração de perfil por admin registra quais campos mudaram, e só os nomes**
  `PUT /users/:id` grava `action: "user.update"` com `changedFields` contendo os nomes dos campos do patch,
  incluindo `displayName` e `disabled`, que vão para o Firebase Auth e não passam pelo repositório. Nenhum
  valor antigo ou novo entra no documento. Um PUT vazio é recusado antes pelo schema
  (`USERS_NOTHING_TO_UPDATE`) e não gera evento.

- [ ] **Impersonação gera um evento por janela, não um por requisição**
  Um admin que entra na conta de um usuário comum e navega por várias telas gera um único documento
  `impersonation.session` para a janela de 15 minutos, com `onBehalfOfUserId`, `targetUserId` e
  `windowEndsAt` preenchidos. Vinte requisições na mesma janela continuam valendo um documento, porque o id
  é determinístico e `doc().create()` falha com `ALREADY_EXISTS`. Passados os 15 minutos com o admin ainda
  personificando, um segundo documento é criado.

- [ ] **Trocar o usuário personificado gera um evento novo**
  Com o admin já personificando A e trocando para B pelo seletor do navbar, a requisição seguinte produz um
  documento `impersonation.session` distinto, porque a chave de dedupe inclui o uid do sujeito. O evento de
  A permanece intacto.

- [ ] **Revogação de sessão e troca de senha aparecem na trilha**
  `POST /account/sessions/revoke` grava `account.sessions.revoke` e `POST /account/password` grava
  `account.password.change`, os dois com ator igual ao alvo. Nenhuma senha, hash ou token entra no
  documento. A resposta de sucesso das duas rotas não muda.

- [ ] **A gravação da trilha nunca derruba a ação principal**
  Com o Firestore recusando a escrita da trilha, `DELETE /users/:id` continua respondendo 204 e o usuário
  continua excluído. A falha vira uma linha `[audit] write-failed action=… requestId=…` no stdout, com
  `reason` derivado de `error.name` e `status` derivado do código gRPC, nunca a mensagem do erro.

- [ ] **Nenhum caminho da aplicação edita ou apaga um evento gravado**
  A rota `/audit-events` exporta apenas `GET`; `POST`, `PUT`, `PATCH` e `DELETE` respondem 405 do próprio
  Next. `update`, `updateBulk`, `delete` e `deleteBulk` no `AuditEventRepository` lançam
  `AuditEventImmutableError`. As `firestore.rules` continuam negando leitura e escrita direta do cliente em
  qualquer coleção.

- [ ] **A trilha é admin-only, na API e não só na UI**
  `GET /audit-events` com token de usuário comum responde 403 `ADMIN_FORBIDDEN`; sem token, 401
  `AUTH_INVALID_TOKEN`. Forjar o cabeçalho `x-user-role: admin` com um token comum continua em 403. Digitar
  `/pt-br/admin/audit` como usuário comum não abre a tela, porque o layout admin chama `requireAdmin`. Um
  admin personificando é redirecionado para fora de `/admin`.

- [ ] **A listagem pagina por cursor e não carrega a coleção inteira**
  Com mais de 20 eventos, a primeira resposta traz 20 itens e um `nextCursor` não nulo; "Carregar mais"
  busca a página seguinte e acrescenta as linhas sem repetir as anteriores. A ordenação é `createdAt`
  decrescente com desempate estável por id, então dois eventos no mesmo instante não se duplicam nem somem
  entre páginas. O botão desaparece quando o cursor volta nulo.

- [ ] **Cursor expirado responde 400 e não 500**
  Um cursor cuja âncora já não existe devolve `PAGINATION_CURSOR_INVALID` 400, e a tela mostra "A navegação
  expirou. Recarregue a lista." Um cursor corrompido ou não decodificável cai no mesmo 400, sem vazar stack
  trace.

- [ ] **Filtro de período inclui os dois extremos**
  Filtrar de `2026-09-01` a `2026-09-16` traz eventos de qualquer momento do dia 1 e de qualquer momento do
  dia 16, porque `from` vira início do dia UTC e `to`, fim do dia. `from` posterior a `to` responde
  `VALIDATION_FAILED` 400, e o formulário mostra a mensagem do dicionário antes de chamar a API. Data
  malformada (`2026-13-45`, `yesterday`) também cai em 400.

- [ ] **Filtro por usuário casa ator, alvo e sujeito**
  Escolher um usuário no filtro devolve tanto os eventos em que ele agiu quanto aqueles em que foi alvo ou
  sujeito da impersonação, porque a consulta usa `array-contains` sobre `involvedUserIds`. Combinar usuário
  e período aplica as duas restrições. Combinação sem resultado mostra o estado vazio, não um erro.

- [ ] **Sem o índice composto publicado, a tela degrada e não quebra**
  Com o índice ausente no projeto Firebase, a listagem sem filtro de usuário funciona e o filtro por usuário
  responde `PAGINATION_INDEX_MISSING` 503, exibido como "A listagem está indisponível no momento. Tente de
  novo em instantes." nos três idiomas, com os filtros ainda utilizáveis. A aplicação sobe, o build passa e
  nenhuma resposta é 500. O emulador não reproduz o cenário: ele serve qualquer consulta.

- [ ] **O índice está declarado no repositório**
  `firestore.indexes.json` contém a entrada de `auditEvent` com `involvedUserIds` em `CONTAINS` e
  `createdAt` em `DESCENDING`, e o teste estático de `apps/api/__tests__/firestoreIndexes.test.ts` falha se
  alguém remover a declaração.

- [ ] **Cada filtro tem seu próprio cache**
  Trocar o período ou o usuário busca dados novos em vez de repintar o resultado anterior, porque os filtros
  entram na `queryKey`. Voltar ao filtro anterior reaproveita o cache sem estado de carregamento.

- [ ] **O formulário de filtros sobrevive à consulta que ele mesmo dispara**
  O select de usuário e os dois campos de data continuam montados durante a carga e durante um erro de
  listagem, com os valores escolhidos. O erro substitui apenas a tabela. "Limpar" devolve o formulário ao
  estado inicial, apaga a mensagem de validação e refaz a listagem sem filtro.

- [ ] **Nenhuma string de UI aparece solta**
  Títulos de coluna, rótulos das cinco ações, placeholders dos campos de data, rótulos do filtro, botões,
  estado vazio e mensagem de erro vêm de `apps.app.pages.admin.auditTrail`. O teste de paridade do
  `@repo/internationalization` passa nos três idiomas, e trocar o locale troca todo o texto da tela.

- [ ] **A tela respeita tema e viewport**
  A trilha renderiza em light, dark e mobile, nos estados normal, vazio, filtro sem resultado e erro. A
  tabela é do antd e precisa de conferência explícita no tema escuro.

- [ ] **Nenhum contrato existente quebrou**
  `apiClient.entity.list()`, `apiClient.user.list()` e as demais actions mantêm a assinatura.
  `pnpm turbo run lint typecheck test` passa em todas as tasks e `pnpm check` não aponta correção.

---

## Roteiro de teste manual

Ambiente: emuladores do Firebase com `pnpm seed`, API em 3002 e app em 3000 (ou outra porta livre, com
`CORS_ORIGIN` ajustado). Contas do seed, todas com a senha `demo1234`.

1. **Trilha vazia.** Entre como `admin@example.com` e abra `/pt-br/admin/audit`. Esperado: tabela com
   "Nenhum evento registrado." e os filtros acessíveis.
2. **Alteração de perfil.** Em `/pt-br/admin/users`, desligue o switch "Ativo" de `user2@example.com`.
   Volte à trilha. Esperado: linha "Perfil alterado pelo admin", autor `admin@example.com`, alvo
   `user2@example.com`, campo alterado `disabled`.
3. **Impersonação.** No seletor de painel do navbar, escolha "Painel do usuário" e navegue por três telas.
   Volte para "Administração" e abra a trilha. Esperado: **uma** linha "Acesso à conta de outro usuário",
   não uma por tela.
4. **Troca de sujeito.** Personifique de novo e troque o usuário no segundo seletor. Esperado: uma linha
   nova, sem alterar a anterior.
5. **Impersonação bloqueada na trilha.** Personificando, digite `/pt-br/admin/audit` na barra de endereços.
   Esperado: redirecionamento para fora de `/admin`.
6. **Exclusão.** Em `/pt-br/admin/users`, exclua `user2@example.com` pelo menu da linha e confirme.
   Esperado: 204, o usuário some da listagem e a trilha mostra "Usuário excluído" com o e-mail dele no
   campo Alvo.
7. **Ações de conta.** Saia e entre como `user@example.com`. Em `/pt-br/account` → Segurança, troque a
   senha; entre de novo com a senha nova e use "Sair de todos os dispositivos". Esperado, na trilha vista
   pelo admin: "Senha alterada" e "Sessões encerradas", as duas com ator igual ao alvo.
8. **Filtro por usuário.** Como admin, escolha `user@example.com` no filtro e aplique. Esperado: os eventos
   em que ele agiu **e** aqueles em que foi alvo da impersonação.
9. **Período sem resultado.** Escolha um intervalo anterior a qualquer evento e aplique. Esperado: estado
   vazio, não mensagem de erro.
10. **Período invertido.** Escolha uma data inicial posterior à final e aplique. Esperado: mensagem
    traduzida sob o campo "Até", sem chamada à API.
11. **Limpar.** Clique em "Limpar". Esperado: select de volta em "Todos os usuários", datas vazias,
    mensagem de validação sumindo e listagem completa de novo.
12. **Paginação.** Com mais de 20 eventos, clique em "Carregar mais". Esperado: as linhas seguintes
    acrescentadas sem repetir id, e o botão sumindo na última página.
13. **Idiomas.** Repita o passo 1 em `/en/admin/audit` e `/es/admin/audit`. Esperado: sidebar, breadcrumb,
    colunas, filtros e os cinco rótulos de ação traduzidos.
14. **Tema e viewport.** Alterne light/dark e reduza para 390x844. Esperado: filtros em uma coluna e tabela
    com rolagem horizontal, legível nos dois temas.
15. **Autorização pela API.** Fora do navegador, chame `GET /audit-events` sem token (401
    `AUTH_INVALID_TOKEN`), com token de usuário comum (403 `ADMIN_FORBIDDEN`) e com `POST`/`PUT`/`PATCH`/
    `DELETE` (405).

## O que este roteiro não cobre

- **Recusa real do Firestore por índice ausente.** O emulador serve qualquer consulta, indexada ou não.
  Exige um projeto Firebase real sem o índice publicado.
- **Rolagem da janela de impersonação.** Provar a segunda janela pela UI exige 15 minutos de espera; o
  comportamento é verificado por teste com relógio controlado.
