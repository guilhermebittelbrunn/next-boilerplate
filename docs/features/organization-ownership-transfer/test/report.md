# Relatório do `/test`: transferir a propriedade da organização

Rodada autônoma do `/cycle`, 2026-10-28, na branch `guilhermebittelbrunn/cycle-value-task` (não protegida; a branch
proposta pelo `/review`, `feat/organization-ownership-transfer`, ainda não existe). Nenhum commit, nenhuma branch
criada. Nenhum código de produção foi alterado nesta etapa.

**Resultado: `test = done`.** A rodada 1 achou um defeito de produção: o diálogo "Tornar dono" não funcionava pelo
teclado. O revisor corrigiu no `ActionsMenu` e a rodada 2 (seção no fim) mediu a correção no navegador, sem regressão
nos outros menus de ação. O resto do corte passou na tela, na API e nas suítes já na rodada 1.

## Placar dos critérios

18 critérios em [`criterios-aceite.md`](criterios-aceite.md) (dois da §12 do plano foram divididos para separar a
parte que depende de e-mail real):

| Resultado | Quantos |
|-----------|---------|
| ✅ medido e correto | 16 |
| ❌ falha | 0 |
| 🔒 depende de infra externa | 2 |

| # | Critério | Status | Meio |
|---|----------|--------|------|
| 1 | O dono transfere a propriedade a um membro | ✅ | e2e manual (3 idiomas), emulador, `pnpm e2e` |
| 2 | Só o dono transfere, e nunca sob personificação | ✅ | API rodando (403, 401), rota e componente (personificação) |
| 3 | Alvo inválido é recusado com código traduzido | ✅ | API rodando (400, 404 ×3), tela (409), paridade |
| 4 | Perfil arquivado não é oferecido como dono | ✅ | e2e manual |
| 5 | Transferências simultâneas terminam com exatamente um dono | ✅ | e2e manual (duas abas), emulador |
| 6 | O antigo dono ganha as saídas | ✅ | e2e manual (saída, exclusão), emulador |
| 7 | O dono novo age como dono | ✅ | e2e manual (remoção, devolução), API (409 de saída) |
| 8 | O dono novo envia convite por e-mail | 🔒 | sem provedor de e-mail; rota coberta por teste |
| 9 | Dono de duas organizações | ✅ | e2e manual (as duas recusas), unit e emulador |
| 10 | As recusas que continuam valendo indicam a transferência | ✅ | tela (2 códigos), dicionário (12 strings) |
| 11 | Organização com dono arquivado não recebe ninguém | ✅ | e2e manual logado e deslogado, API |
| 12 | O aceite conta só membro vivo | ✅ | emulador |
| 13 | Ações da equipe aparecem na trilha | ✅ | e2e manual (4 rótulos × 3 idiomas, dois filtros) |
| 14 | O convite enviado aparece na trilha sem o e-mail do convidado | 🔒 | sem provedor de e-mail; rota coberta por teste |
| 15 | Fork B2C não muda | ✅ | API e app reiniciadas com a flag vazia |
| 16 | A suíte E2E cobre o fluxo da equipe | ✅ | `pnpm e2e` local |
| 17 | Tema e responsivo | ✅ | e2e manual com contraste medido |
| 18 | O diálogo funciona pelo teclado e devolve o foco | ✅ (❌ na rodada 1) | e2e manual na rodada 2, teste de componente |

## Defeito de produção (rodada 1, corrigido e medido na rodada 2)

### "Tornar dono" pelo teclado abria e fechava o diálogo no mesmo Enter

**Repro** (`next dev`, flag de membros ligada, qualquer idioma):

1. Entrar como dono de uma equipe com um membro vivo e abrir `/pt-br/organization`.
2. Levar o foco ao botão "Mais ações" da linha do membro e apertar Enter. O menu abre com o foco em "Tornar dono".
3. Apertar Enter.

**Esperado:** o diálogo "Transferir a propriedade da equipe?" fica aberto com o foco em "Cancelar".

**Observado:** o diálogo abre e fecha no mesmo toque. Um `MutationObserver` na página registrou a sequência
`aberto (foco em "Cancelar") → fechado (foco no h2 "Membros")`, sem nenhum pedido à API. Com Espaço no item, o menu do
antd nem aciona o clique. Quem usa só o teclado não consegue transferir a propriedade. Pelo mouse o fluxo funciona.

**Onde (hipótese):** `OrganizationMembersTable.tsx:115-120` abre o diálogo de dentro do `onClick` do item, que o
`rc-menu` dispara no `keydown` do Enter. O Radix move o foco para o `AlertDialogCancel`
(`TransferOwnershipDialog.tsx:51,64`) antes de o navegador concluir a ativação do mesmo Enter, que cai em
"Cancelar". O repositório já contorna essa armadilha em `packages/design-system/components/ui/action-menu.tsx:73-78`,
onde o foco do `Popconfirm` só se move depois da animação de abertura "para que o Enter que abriu a confirmação não
acione também o botão dela".

**Correção sugerida (hipótese, não testada):** adiar a abertura para depois do evento de teclado, ou usar
`onOpenAutoFocus` no `AlertDialogContent` para impedir o foco automático e focar "Cancelar" no quadro seguinte, como
`AccountEmailChangeDialog.tsx:101` já faz com `handleOpenAutoFocus`. Junto, um teste de componente que abra o item com
`user.keyboard("{Enter}")` e confirme que o diálogo continua aberto.

Medido em `next dev`, não em `build && start`. O mecanismo é a ordem dos eventos de teclado do navegador e o efeito de
foco do Radix, que não mudam entre os dois modos; o fato de o `action-menu.tsx` já tratar a mesma situação reforça a
leitura.

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|------|----------|
| 1 | Transferência pela tela nos três idiomas | **Confirmado.** Toasts exatos: "QA Membro Bruno agora é dono da equipe." (pt-br), "user@example.com is now the team owner." (en, o alvo sem nome cai no e-mail), "QA Membro Bruno ahora es dueño del equipo." (es). Selos trocados, o `h2` "Convidar pessoa" sumiu e "Sair da equipe" apareceu nos três |
| 2 | Antigo dono sai e cai numa organização vazia | **Confirmado.** Toast "Você saiu da equipe."; o antigo dono virou dono sozinho de outra organização, com 0 registros (`GET /entities` → `items: []`); a equipe antiga ficou com o dono novo e os 4 registros |
| 3 | Copy nova do convite nos três idiomas, 375 px | **Confirmado.** As três frases saíram como no dicionário, a página não rola na horizontal (`scrollWidth` 375). Contraste do aviso: 4,79:1 no claro e 6,87:1 no escuro |
| 4 | Exclusão de conta do antigo dono e do dono novo | **Confirmado.** Dono novo com membro vivo: toast "Your team still has members. Hand ownership to one of them or remove them before deleting your account." Antigo dono que era membro: a conta saiu do Auth e a equipe ficou com o dono novo e os 4 registros |
| 5 | Tema e responsivo do item e do diálogo | **Confirmado.** Menu escuro em 375 px com "Hacer dueño" (ícone de coroa, 14,5:1) e "Quitar del equipo" (6,85:1); diálogo claro e escuro com título ≥ 18,9:1 e descrição ≥ 5,04:1; a 375 px o diálogo ocupa 343 px |
| 6 | Foco inicial e ao fechar | **Rodada 1: derrubado em parte.** Pelo mouse, foco inicial em "Cancelar" e retorno ao `h2` "Membros"; pelo teclado o diálogo fechava no mesmo Enter. **Rodada 2: confirmado** depois da correção (seção da rodada 2) |
| 7 | Duas abas transferindo para pessoas diferentes | **Confirmado.** A segunda aba mostrou "Só o dono da equipe pode fazer isso." e o emulador ficou com um dono só. A tabela da segunda aba seguiu mostrando as ações de dono, o formulário de convite e os convites até recarregar (o nit do review procede) |
| 8 | Alvo arquivado com a tabela aberta | **Confirmado.** Toast "Esta conta foi desativada e não pode receber a propriedade da equipe."; depois de recarregar, a linha ("Sem nome", "Conta indisponível") só oferece "Remover da equipe" |
| 9 | Trilha do admin | **Confirmado para 4 de 5 rótulos; 🔒 para o convite enviado.** Filtro pelo antigo dono: três transferências e a saída. Filtro pelo dono novo: a transferência que recebeu e o aceite. Rótulos lidos em pt-br, en e es. "Convite para a equipe enviado" não aparece porque nenhum convite pode ser emitido sem provedor de e-mail |
| 10 | Convite de organização com dono arquivado | **Confirmado.** Logado (pt-br): "Este convite não vale mais". Deslogado (en): "This invitation is no longer valid". `POST /invitations/preview` e `/invitations/accept` → `400 ORGANIZATION_INVITATION_INVALID` |
| 11 | Fork B2C | **Confirmado.** Com a flag vazia nas duas apps: `404 ORGANIZATION_MEMBERS_DISABLED` sem sessão e com sessão; `/pt-br/organization` mostra "Página não encontrada"; o menu lista Playground, Entidades e Configurações |
| 12 | Arquivamento pelo admin do dono novo com membros vivos | **Confirmado.** Toast "Este usuário é dono de uma equipe que ainda tem membros, então ele não foi arquivado. Antes, ele precisa transferir a propriedade a um dos membros, ou os membros precisam sair ou ser removidos." e `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS` |

## Lacunas herdadas

| Lacuna (handoff e review) | Veredito |
|---------------------------|----------|
| E2E não emite convite pela tela nem entrega e-mail | **Continua aberta.** Depende do provedor de e-mail (🔒); a emissão segue coberta por `organizationInvitationsRoute.test.ts` |
| E2E só em pt-br, desktop, claro | **Fechada para esta entrega** pela passada manual (en, es, escuro, 375 px). A suíte Playwright continua só em pt-br; ampliá-la fica fora de escopo |
| Sem teste da retrocarga pendente do antigo dono | **Fechada.** O teste existente `never claims records into an organization the person only joined` (`apps/api/__tests__/organizationMembership.test.ts`) monta exatamente o estado do antigo dono: papel `member` com `legacyClaimPending: true`, e prova que nada é reivindicado |
| Corrida entre arquivamento pelo admin e transferência fora de transação | **Fora de escopo.** Risco aceito na §18 do plano |
| Lacuna nova do review: a tela depois de `ORGANIZATION_FORBIDDEN` | **Medida, sem teste novo.** A tela fica defasada até recarregar. Um teste agora congelaria o comportamento defasado; se o `onError` passar a invalidar o detalhe da organização, o teste entra junto com a correção |
| Decisão em aberto do handoff: aviso do convite para quem já transferiu | **Fechada.** O review reescreveu a copy e ela foi medida nos três idiomas (item 3) |

## Testes e gates

Sem `--force`, com o cache do turbo valendo.

| Comando | Resultado |
|---------|-----------|
| `pnpm test` (raiz, JDK 21 via `/opt/homebrew/opt/openjdk@21`) | 15 de 15 tarefas, 4 do cache, 1m09s |
| ↳ `@repo/sdk` | 4 arquivos, 15 testes |
| ↳ `api` | 124 arquivos, 1679 testes |
| ↳ `api` `test:emulator` | 8 arquivos, 274 testes |
| ↳ `app` | 127 arquivos, 1106 testes |
| ↳ `e2e` (unit) | 2 arquivos, 17 testes |
| ↳ `@repo/internationalization` (paridade) | 7 arquivos, 67 testes |
| ↳ demais (`web`, `design-system`, `auth`, `email`, `shared`, `payments`, `security`, `analytics`, `next-config`) | todos passando |
| `pnpm e2e` | 23 de 23 em 1,6 min; `organizationOwnership.spec.ts` em 12,7 s |

Os números batem com os do handoff. Nenhuma falha. Não remedi `pnpm check` nem os `typecheck`: esta etapa não mudou
código, e os números do `/review` continuam valendo.

### Testes criados

Nenhum. Para cada módulo tocado, o que já cobria:

- rota de transferência: `organizationOwnershipRoute.test.ts` (rota com repositório mockado) cobre 200, flag vazia,
  membro, personificação, alvo próprio, id inutilizável, `not-member`, `target-archived`, `forbidden` e o evento;
- transação: `organizationOwnershipTransfer.emulator.test.ts` é a faixa cara já existente, justificada porque a
  serialização das transações e a regra "leituras antes de escritas" só existem no Firestore real;
- tabela e diálogo: `organizationTeamPage.test.tsx` cobre item visível só para membro vivo, confirmação com o nome,
  um pedido por confirmação, cancelamento e personificação. O caminho do teclado entrou com a correção, na rodada 2
  (`organizationTransferKeyboard.test.tsx`, escrito pelo revisor);
- mutation: `useOrganization.test.tsx` cobre ordem de invalidação, remoção dos convites e toast de erro.

Nenhum teste da faixa cara foi criado.

## Evidências da passada de browser

Uma passada com `agent-browser`, comandos em sequência. Os prints ficam em `test/e2e/` (descartados pelo
`.gitignore`); a prova é o texto acima e abaixo.

- **Tela da equipe do dono (pt-br, escuro, 1280 px):** descrição "As pessoas da equipe veem e editam os mesmos
  registros. Só o dono convida e remove membros, e pode passar a propriedade a outro membro."; o menu de um membro vivo
  lista "Tornar dono" e "Remover da equipe".
- **Diálogo (pt-br):** "Transferir a propriedade da equipe?" e "QA Membro Bruno passa a ser dono da equipe, e você
  continua nela como membro. Só o dono convida e remove pessoas, e QA Membro Bruno pode devolver a propriedade a você.
  Os registros continuam com a equipe, mesmo que você saia depois.", botões "Cancelar" e "Transferir".
- **Diálogo (en, claro):** "Transfer team ownership?"; o nome do alvo sem `displayName` vira o e-mail
  (`user@example.com becomes the team owner…`).
- **Diálogo (es, escuro, 375 px):** "¿Transferir la propiedad del equipo?", botões empilhados "Transferir" e
  "Cancelar".
- **Membro removido (en):** toast "Member removed from the team."
- **Trilha (es, escuro, 375 px):** "Propiedad del equipo transferida", "Miembro quitado del equipo", "Salida del
  equipo", "Invitación al equipo aceptada"; em en, "Team ownership transferred", "Member removed from the team", "Left
  the team", "Team invitation accepted".
- **Recusas medidas na API rodando:** membro → `403 ORGANIZATION_FORBIDDEN`; sem sessão → `401 AUTH_INVALID_TOKEN`;
  o próprio id → `400 ORGANIZATION_OWNERSHIP_TARGET_SELF`; id inexistente, perfil de outra equipe e `a%2Fb` →
  `404 ORGANIZATION_MEMBER_NOT_FOUND`; dono novo em `POST /organization/leave` e em `DELETE /organization/members/<o
  próprio id>` → `409 ORGANIZATION_OWNER_CANNOT_LEAVE`; convite sem provedor → `503 EMAIL_NOT_CONFIGURED`.

### Observações fora do escopo

- Em `next dev`, todas as telas autenticadas mostram "1 Issue": um aviso de hidratação no `Collapsible` do
  `GlobalSidebar`. O arquivo não faz parte deste diff.
- O menu do antd (`ActionsMenu`) não aciona item com Espaço, só com Enter. Vale para todos os itens de menu do
  repositório, não só para "Tornar dono".

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 4000, 4001, 4400, 4500, 8080, 9099, 9150, 9199).
Nada foi reaproveitado do usuário.

- `pnpm test` e `pnpm e2e` sobem e derrubam os próprios emuladores e servidores; depois de cada um as portas estavam
  livres.
- Para a passada de browser subi, com o mesmo ambiente que `apps/e2e/support/stackEnv.ts` monta (emulador, projeto
  `demo-next-boilerplate`, flag de membros `"true"` na `api` e na `app`): `pnpm emulators`, o seed do repositório,
  `api` em 3002 e `app` em 3000. A `web` não foi necessária. Para o caso B2C, derrubei `api` e `app` e subi de novo com
  a flag vazia.
- No fim, cada grupo de processos que eu subi foi encerrado pelo id de grupo; o emulador com SIGINT. Nenhuma porta da
  lista ficou escutando. Uma sessão do navegador travou no meio (instrumentação pesada de eventos de teclado) e foi
  encerrada pelos PIDs do próprio `agent-browser`.

## Dados de QA

Tudo no emulador local, apagado pelo próximo seed ou pelo próximo `pnpm e2e`. Nenhuma conta em projeto real.

| Conta | Uso | Estado final |
|-------|-----|--------------|
| `qa-ownership-member@example.com` ("QA Membro Bruno") | membro que recebeu a propriedade | conta excluída pelo próprio titular |
| `qa-ownership-second@example.com` ("QA Membro Carla") | segunda aba, dona final da equipe | viva, dona da equipe |
| `qa-ownership-archived@example.com` ("QA Membro Davi") | alvo arquivado | perfil arquivado, removido da equipe |
| `user@example.com` (seed) | dono que transferiu e saiu | dono de uma organização nova e vazia |
| `user2@example.com` (seed) | dono de outra equipe, com convite pendente para `user@example.com` | perfil arquivado |

As contas de QA usam a senha do seed do emulador (`SEED_PASSWORD` em `apps/e2e/support/seedAccounts.ts`); ela não
vale fora do emulador e não está escrita aqui.

Erro meu na passada: na lista de usuários do admin, cliquei por engano no interruptor "Usuário ativo" de
`qa-ownership-member@example.com`, o que desativou a conta e encerrou as sessões dela. Voltei o interruptor em seguida
(o Auth do emulador confirmou `disabled=false`), e a trilha ficou com dois eventos "Perfil alterado pelo admin" no
campo `disabled`. Nada disso sai do emulador.

## Rodada 2: correção do teclado

O revisor corrigiu o defeito na raiz: `packages/design-system/components/ui/action-menu.tsx:142-149` chama
`domEvent.preventDefault()` quando o item do menu é acionado por `keydown`, o que vale para todos os consumidores do
`ActionsMenu`. Testes novos dele: `apps/app/__tests__/organizationTransferKeyboard.test.tsx` (2 casos) e um caso em
`packages/design-system/__tests__/actionMenu.test.tsx`. Esta rodada não alterou código nem criou teste.

### Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm test` (raiz, JDK 21, sem `--force`) | 15 de 15 tarefas, 9 do cache, 59,9 s |
| ↳ `@repo/design-system` | 14 arquivos, 172 testes (171 na rodada 1); `actionMenu.test.tsx` com 20 |
| ↳ `app` | 128 arquivos, 1108 testes (1106 na rodada 1); `organizationTransferKeyboard.test.tsx` com 2 |
| ↳ `api`, `test:emulator`, `sdk`, `e2e` unit, i18n | 1679, 274, 15, 17 e 67, iguais à rodada 1 |
| `pnpm e2e` | 23 de 23 em 1,4 min |

Rodei o `pnpm e2e` de novo porque dois specs clicam em itens do `ActionsMenu` (`entityCrud.spec.ts` edita e exclui pelo
menu, `organizationOwnership.spec.ts` usa "Tornar dono"). Os dois passaram.

### Teclado no diálogo de transferência

Pilha nova no emulador, flag de membros ligada, dono `user@example.com` com dois membros de QA e dois convites
pendentes gravados no emulador. Comandos do `agent-browser` em sequência; chamadas à API contadas pelas entradas de
`performance` da página.

| Passo | Medido |
|-------|--------|
| Tab a partir de "Atualizar" até "Mais ações" da linha do membro, Enter | menu aberto, foco em "Tornar dono" |
| Enter | diálogo aberto e assim ficou; foco em "Cancelar"; 0 chamadas a `/ownership` |
| Esc | diálogo fechado; foco no `h2` "Membros"; 0 chamadas |
| Tab até "Mais ações", Enter, Enter, Tab ("Transferir"), Enter | exatamente 1 chamada a `/organization/members/<id>/ownership`; toast "QA Membro Bruno agora é dono da equipe."; selos trocados; foco no `h2` "Membros"; a trilha ganhou um evento de transferência |

### Regressão nos outros menus de ação

Teclado: foco no "Mais ações" da linha, Enter, setas até o item, Enter. Mouse: clique real no gatilho e no item.

| Tela e item | Teclado | Mouse |
|-------------|---------|-------|
| Equipe, "Remover da equipe" | confirmação aberta com foco em "Não", nenhum pedido; Tab até "Sim" e Enter removeram o membro com 1 `DELETE` e toast "Membro removido da equipe." | confirmação aberta com foco em "Não" |
| Equipe, "Tornar dono" | ver acima | diálogo aberto com foco em "Cancelar"; "Cancelar" devolveu o foco a "Membros" |
| Convites, "Reenviar" | 1 pedido a `/organization/invitations`; toast de `EMAIL_NOT_CONFIGURED`, esperado sem provedor de e-mail | 1 pedido, mesmo toast |
| Convites, "Revogar" | confirmação com foco em "Não"; "Sim" revogou com 1 `DELETE` e toast "Convite revogado." | não repetido |
| Entidades, "Editar" | navegou para `/pt-br/entities/edit/<id>` | navegou para `/pt-br/entities/edit/<id>` |
| Entidades, "Excluir" | confirmação com foco em "Não"; "Sim" excluiu com 1 `DELETE` e toast "Entidade removida com sucesso." | confirmação aberta com foco em "Não" |
| Admin, usuários, "Editar" | navegou para `/pt-br/admin/users/edit/<id>` | navegou para `/pt-br/admin/users/edit/<id>` |
| Admin, usuários, "Arquivar" | confirmação com foco em "Não"; Esc fechou sem pedido e devolveu o foco a "Mais ações" | confirmação aberta com foco em "Não" |

Nenhuma regressão. Observação fora do escopo, sem relação com a correção: depois de "Reenviar", "Editar" ou da
remoção de uma linha, o foco cai no `body`, porque o gatilho some ou o menu fecha sem devolver o foco.

### Ambiente e dados

Portas livres no início. Subi `pnpm emulators`, o seed, `api` (3002) e `app` (3000) com o ambiente de
`apps/e2e/support/stackEnv.ts`, e derrubei tudo pelo grupo de processos antes de rodar o `pnpm e2e`. Depois do
`pnpm e2e`, nenhuma das portas 3000, 3001, 3002, 3003, 4000, 4001, 4400, 4500, 8080, 9099, 9150 e 9199 ficou
escutando.

Contas e dados desta rodada, só no emulador e apagados pelo `pnpm e2e` seguinte (que já rodou):
`qa-ownership-member@example.com` e `qa-ownership-second@example.com` recriadas, convites pendentes para
`qa-ownership-pending@example.com` e `qa-ownership-pending2@example.com` (sem conta), uma entidade do seed excluída
("Retired Unit"). Nenhuma conta em projeto real.

