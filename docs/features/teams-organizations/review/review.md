# Revisão do `/review`: organizações, membros e convites

Rodada autônoma do `/cycle`, 2026-10-22, sobre o working tree de `9c793c6`. Nada foi commitado. Li o diff inteiro
contra `docs/review-checklist.md`, com foco em vazamento entre organizações, corrigi o que tinha correção clara e rodei
só os gates estáticos. O que não deu para confirmar lendo código está em "Verificar no `/test`".

## Branch

| | |
|---|---|
| atual | `guilhermebittelbrunn/tarefa-maior-/cycle` |
| regex de `.claude/rules/git-commits.md` | **inválida**: `guilhermebittelbrunn` não é projeto, `tarefa-maior-` não é tipo e `/cycle` é um segmento a mais |
| proposta | `feat/teams-organizations`, sem projeto porque o diff cruza `api`, `app`, `sdk`, `shared`, `internationalization` e `email`. Passa no regex |
| upstream / commits à frente de `origin/main` | nenhum / nenhum |
| ação | nenhuma. O `/cycle` não cria branch e o Conductor não renomeia sem pedido explícito. Como a branch não tem remoto nem commit, o caminho é `git branch -m feat/teams-organizations` depois do seu sim (decisão D1) |

## Revisão

Nenhum achado bloqueante. Não sobrou consulta nem checagem de `entity` escopada por `userId`: `rg "entityRepository\.\w+"`
na API acha só `findInOrganization`, `listByOrganization`, `summaryByOrganization`, `purgeByOrganization`, `update`,
`delete`, `create`, `claimUnscopedByUserId`, `purgeUnscopedByUserId` e `findAllByUserId` (a exportação por autor).
`listByUserId`, `summaryByUserId` e `purgeAllByUserId` saíram do repositório de `entity`.

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

| # | arquivo:linha | problema | ação |
|---|---|---|---|
| 1 | `apps/api/app/(routes)/organization/members/[id]/route.ts:46`, `leave/route.ts:18`, `apps/api/(shared)/lib/account-erasure.ts:142` | O vínculo era conferido numa leitura (`findInOrganization`) e apagado depois só pelo id do perfil (`remove(userId)`). Entre as duas, a pessoa podia sair e aceitar o convite de outra organização, e o dono de A apagaria o vínculo dela em B. É escrita cruzando organizações, mesmo que a janela seja curta | **Corrigido.** `organization-member.repository.ts:111` agora recebe a organização, lê e apaga numa transação e devolve `false` se o vínculo aponta para outra. O `DELETE` de membro responde `404 ORGANIZATION_MEMBER_NOT_FOUND` nesse caso; a saída e o expurgo passam a organização que leram |
| 2 | `apps/app/app/[locale]/(unauthenticated)/invite/components/InvitationAcceptance.tsx:214` | O `resetQueries()` sem filtro refazia a prévia que está na tela. Com o token já gasto, a prévia volta `ORGANIZATION_INVITATION_INVALID` e o cartão "Este convite não vale mais" aparece junto do aviso de sucesso, antes do redirect | **Corrigido.** O reset poupa as queries de `queryKeys.invitation`; o resto do cache, que é da organização anterior, continua sendo descartado |
| 3 | `apps/api/proxy.ts:75` | O rate limit casa só o caminho, então o `GET /organization/invitations` da tabela conta no mesmo orçamento de 20 pedidos por 60 s por IP do `POST` que manda e-mail. A tabela recarrega ao abrir a página e depois de cada convite e de cada revogação. Pela conta (um `POST` e um `GET` por convite, mais a carga inicial), o dono que convida umas 10 pessoas no mesmo minuto recebe 429 | Decisão D2. Mudar exige casar método no proxy, que hoje é só caminho, e o `SECURITY.md` documenta "qualquer método" |
| 4 | `.claude/skills/write-tests/SKILL.md:44-71`, `.claude/skills/new-api-route/SKILL.md:34,41`, `docs/feature-analysis-guide.md:88-92` | Ensinavam API que o diff removeu: o exemplo da skill mockava `requireCommonPanelApi` e `listByUserId` para testar `entities/route`; a skill de rota citava `listByUserId`; o guia citava `listByUserId` e dizia que o `BaseRepository` não pagina | **Corrigido** com o guard de organização, `listByOrganization` e o `paginate` que existe |
| 5 | `docs/ROPA.md:54,69,94,151`, `docs/INCIDENT-RESPONSE.md:52,66`, `docs/SUBPROCESSORS.md:35,37,40`, `docs/SECURITY.md:173`, `docs/PRE-PRODUCTION.md:501,588` | Âncoras de linha que o diff deslocou (`apps/api/proxy.ts` ganhou 8 linhas, `log.ts` 1, `account-erasure.ts` 83, `user-merge.ts` 1, `apps/app/proxy.ts` 5) ou que já estavam erradas antes, em arquivos que o diff toca | **Corrigido**, cada uma medida com `grep -n` no código atual: `proxy.ts:60-78` (lista de rate limit), `:84-96` (`logBlocked`), `:90` (`logEvent`), `:167` (`checkRateLimit`), `log.ts:23` e `:53-59`, `account-erasure.ts:172` e `:182`, `user-merge.ts:55-71`, `apps/app/proxy.ts:143` e `:235,239` |

### 🟢 Sugestão / nit

| # | arquivo:linha | problema | ação |
|---|---|---|---|
| 6 | `apps/api/app/(routes)/invitations/accept/route.ts:44` | O comentário dizia que um link encaminhado só funciona para o dono. A decisão 13 do plano não exige e-mail verificado, então funciona para qualquer conta criada com o endereço convidado | **Corrigido** o comentário |
| 7 | `docs/ROPA.md`, registro 11 | Dizia que, sob personificação, o admin só grava a criação da organização. O resolvedor também carimba `organizationId` nos `entity` antigos do personificado | **Corrigido** |
| 8 | `docs/ARCHITECTURE.md:57,80` | "Um admin de plataforma nunca tem vínculo" é falso para quem foi promovido (o vínculo fica, só não é lido). "o app faz `window.location.reload()`" é falso desde que o `setImpersonatedUser` chama `router.refresh()` (`AuthRequestPanelContext.tsx:244`) | **Corrigido** os dois |
| 9 | `packages/sdk/src/types/organization/organization.ts:3` | Mesmo exagero do item 8 no comentário de `ORGANIZATION_ROLES` | **Corrigido** |
| 10 | `docs/PAYMENTS.md:242-244` | Descrevia só o `requirePlanApi`; quem procura como o `POST /entities` aplica o plano não achava o `{ plan }` do guard novo | **Corrigido** com uma frase |
| 11 | `docs/review-checklist.md:62-67`, `docs/feature-analysis-guide.md:133-137`, `apps/api/CLAUDE.md:12` | A lista de guards não citava `requireOrganizationApi`, embora o item de ownership logo abaixo dependa dele | **Corrigido** |
| 12 | `apps/api/app/(routes)/entities/[id]/route.ts:94-102` | Dois registros podem apontar para o mesmo objeto do prefixo da organização. Trocar a foto de um apaga o objeto e o outro fica sem miniatura. O mesmo já acontecia com um usuário sozinho; agora vale entre membros | Não corrigido: pede contagem de referência. Achado para o backlog |
| 13 | `apps/api/app/(routes)/users/[id]/route.ts:220` (fora do diff) | O admin arquiva um dono que tem membros sem nenhuma recusa. O vínculo do dono fica, a organização continua ativa para o aceite, e convites pendentes dela seguem aceitáveis. A decisão 16 do plano aceitou a organização sem gestão; o aceite de convite novo é efeito que ela não cita | Decisão D3 |

### ✅ OK

- Isolamento de `entity`: as três rotas passam por `requireOrganizationApi` e leem por `findInOrganization`, que recusa
  `organizationId` vazio (`entity.repository.ts:51-60`) e responde `404 ENTITY_NOT_FOUND`. Lista e resumo usam o helper
  privado `inOrganization`. O corpo não carrega `organizationId` nem `userId`: o Zod de `entity.schema.ts` descarta
  chave desconhecida.
- Fotos: criar ou trocar exige objeto de `uploads/org-<id do ator>/` ou URL externa (`isAttachablePhoto`); o valor que
  já está no registro passa sem checagem, o que deixa um membro salvar o registro de outro sem tocar na foto. O avatar
  continua em `uploads/<profileId>/` (`account/route.ts:49`, `useFileUpload()` sem `scope` em `AccountProfileForm.tsx:38`).
- Convite: o Firestore guarda só `tokenHash` (sha256 de 32 bytes aleatórios), e nem o mapper nem o DTO o devolvem.
  Validade, uso único, e-mail da conta igual ao do convite, organização dormente e dono com membros são decididos dentro
  de uma transação (`organization-invitation.repository.ts:285-336`). Nenhum caminho cria conta no Auth
  (`rg createUser` nas rotas novas: vazio).
- Rate limit dos três caminhos novos (`proxy.ts:75-77`) e `/invite` em `PUBLIC_PATHS` e `OOB_ACTION_PATHS`
  (`apps/app/proxy.ts:96`, `:107`), com casamento exato ou por `prefixo/`.
- O dono não sai (`leave/route.ts:11`), não é removido (`members/[id]/route.ts:39`), não exclui a conta com membros
  (`account/deletion/route.ts:43`, antes da senha) e não aceita convite de outra organização tendo membros.
- Personificação: as escritas do resolvedor sob `GET` são a organização, o vínculo, o carimbo dos `entity` antigos e a
  baixa do `legacyClaimPending` (`organization-membership.ts:19-83`). Qualquer outro método leva `403` do somente
  leitura antes de chegar a ele.
- Exclusão e exportação: o membro que sai deixa os registros com a organização; a exportação lê por autor
  (`findAllByUserId`) e não inclui registro de outro membro.
- Modo degradado: `whenOrganizationMembersEnabled` embrulha as 8 rotas da fase B (`grep -l` conta 8), o menu esconde
  "Equipe" e as duas páginas chamam `notFound()`. As duas `env.ts` usam `|| undefined`.
- i18n: os 13 códigos novos têm 3 entradas cada em `apiErrors` (39, `grep -c`), e todo código que a API emite está
  traduzido. Os componentes não têm texto solto; o gatilho do `ActionsMenu` usa o `aria-label` traduzido do design
  system.
- Comentários: nenhum cita plano, etapa, `docs/features` ou ID de card (varredura por regex nos 119 arquivos de código
  do diff).
- `SECURITY.md` medido: 55 arquivos de rota, 37 com guard, 18 sem, 17 caminhos com rate limit em `proxy.ts:60-78`,
  10 rotas com `requireOrganizationApi`. Bate com o texto. `PRE-PRODUCTION.md` diz 9 índices; o arquivo declara 9.
- Corte de MVP da spec: os cinco itens estão no diff e nada de "Fora do corte" entrou. A divergência é de fatiamento: a
  spec recomendava entregar a chave de escopo, levar a spec a `in-progress` e só então fazer membros e convites, e o
  `/develop` entregou as duas fatias no mesmo working tree (decisão D4).

## Os dois desvios do handoff

1. **A chave lida antes de autenticar (`whenOrganizationMembersEnabled`).** Correto. Mantém a fase A sem depender de
   arquivo da fase B e, com a chave desligada, nenhuma rota da fase B roda guard, resolvedor ou carimbo de atividade. O
   404 com o mesmo código para qualquer chamador não revela nada que o código público já não diga. O `preview` checa a
   chave antes de ler o corpo.
2. **`requireOrganizationApi` composto sobre `requireCommonPanelApi`, com `refusePlanRequirement` extraído.** Correto.
   A composição sobre `requirePlanApi` quebrava `impersonationReadOnly.test.ts` porque o teste só reconhece delegação a
   `requireCommonPanelApi`/`requireAdminApi` (`BASE_GUARD_DELEGATIONS`, `:63-66`) e import de `./admin` ou
   `./common-panel` (`BASE_GUARD_IMPORT`); `return requirePlanApi(...)` não casa com nenhum dos dois. Para as rotas de
   `entity` a ordem ficou a mesma: somente leitura, perfil do sujeito, carimbo de atividade, plano, handler. A única
   adição é a resolução da organização entre o plano e o handler. `refusePlanRequirement` é a expressão que o
   `requirePlanApi` tinha embutida, e o `requirePlanApi` passou a chamá-la. Ele não virou código morto: continua
   exportado, coberto por `planGuard.test.ts` e por `impersonationReadOnly.test.ts:164` e documentado no `PAYMENTS.md`
   como o gate de rota sem escopo de organização. Nenhuma rota do core o usa hoje, e o `SECURITY.md:37` registra isso.

## Raio de impacto

- `EntityDTO.organizationId` (obrigatório): API e `apps/app` (hooks e telas de `entity`). `apps/web` usa o SDK mas não
  `EntityDTO`. O typecheck de `api`, `app` e `sdk` passou depois das correções.
- `AccountDataExportDTO.membership`: a exportação (`account/export/route.ts`) e o hook `useAccountDataRights` da app,
  que só baixa o JSON.
- `FileActions.upload(file, { scope })`: `useFileUpload`; os dois formulários de `entity` passam `"organization"`.
- `OrganizationActions` (novo) e `Client.organization`: página da equipe e página de aceite.
- `organizationMemberRepository.remove(profileId, organizationId)`: assinatura nova (correção 1). Chamadores: rota de
  remoção, rota de saída e expurgo; os três testes que mockam o método foram ajustados ao contrato.
- Índices: as três entradas de `entity` trocaram `userId` por `organizationId`. Num fork em produção os índices novos
  precisam estar prontos antes do deploy da API (`PRE-PRODUCTION.md` §1.10).

## 👁 Verificar no `/test`

Em ordem de risco. A primeira sustenta o corte da spec.

1. **Isolamento entre organizações, chamando a API direto.** Com o seed (`user@example.com` e `user2@example.com`),
   pegar o id de um registro de cada um e chamar `GET`, `PUT` e `DELETE /entities/<id do outro>` com o token do
   primeiro. Esperado: `404 ENTITY_NOT_FOUND` nos três, e `GET /entities` e `/entities/summary` sem nenhum registro do
   outro.
2. **F1, retrocarga.** `user@example.com` entra e vê os dois registros; no emulador eles ganham `organizationId` com
   `updatedAt` intacto. O emulador provou isso pelo repositório, não pela tela.
3. **Aceite de convite (correção 2).** Aceitar um convite semeado e conferir que nenhum cartão "Este convite não vale
   mais" aparece antes do redirect, que a página da equipe abre com a equipe nova e que a lista de `entity` mostra os
   registros da organização nova, não os de antes.
4. **Remoção e saída (correção 1).** O dono remove um membro: `204`, e o próximo pedido do membro cai na organização de
   casa com os registros dele. O membro sai: `204` e o mesmo retorno. A transação do `remove` só roda contra Firestore
   real; os testes de rota mockam o repositório.
5. **F4, upload.** Foto pelo formulário de `entity` cai em `uploads/org-<id>/` e o avatar em `uploads/<profileId>/`.
   Conferir no Storage emulado ou no campo `photo` do documento.
6. **F6, modo degradado.** Com a variável vazia, nenhum "Equipe", "Team", "Equipo", "organiza…", "organization" ou
   "organización" no menu e nas páginas, nos três idiomas; `/organization` e `/invite` em 404; as rotas da fase B em
   `404 ORGANIZATION_MEMBERS_DISABLED`.
7. **F9.** Cadastro a partir do convite (`/sign-up?redirect=/pt-br/invite?token=…`) volta ao convite depois do
   onboarding.
8. **"Entrar com outra conta".** O `signOut` do provider faz um `push` e o componente faz outro, para o login com
   `redirect`. Qual dos dois vence não foi medido.
9. **Chave ligada só na `app`.** A página da equipe deve mostrar o texto de `ORGANIZATION_MEMBERS_DISABLED` como erro
   de carga. Medir também quanto tempo leva, porque a query tem as tentativas padrão do React Query.
10. **Personificação na página da equipe.** Tudo visível, botões desabilitados, aviso de somente leitura. Personificar
    um usuário sem organização e conferir que o `GET` cria a organização e o vínculo e não grava mais nada.
11. **F15.** Dono com membro tenta excluir a conta e vê a mensagem do `409` antes de digitar a senha.
12. **Tabelas da página da equipe** em light, dark e mobile.
13. **D2, rate limit.** Só com `ARCJET_KEY`: convidar em sequência e anotar em qual convite chega o `429`. Sem a chave,
    fica 🔒.

## Lacunas de teste

| lacuna | veredito |
|---|---|
| os quatro componentes da página da equipe sem teste de render | continua aberta |
| prefetch RSC da página da equipe sem teste | continua aberta |
| `describeOrganizationMembers` com mais de 100 membros | continua aberta |
| teto de 20 convites e intervalo de 60 s só com repositório mockado | continua aberta |
| `isMemberOfOrganization` com erro do Auth diferente de `user-not-found` (vira 500) | continua aberta |
| nenhuma spec E2E nova (decisão P18 do plano) | fora de escopo desta revisão |
| nova: `remove` devolvendo `false` → `404` no `DELETE` de membro, sem caso de teste | aberta aqui; o `/test` cobre |
| nova: o teste do aceite não pegaria o cartão inválido piscando, porque o mock da prévia sempre responde sucesso | aberta aqui; o `/test` cobre |

## Decisões em aberto

- **D1. Branch.** Renomear `guilhermebittelbrunn/tarefa-maior-/cycle` para `feat/teams-organizations` com
  `git branch -m` (sem remoto e sem commit à frente de `origin/main`). Recomendação: renomear antes do primeiro commit.
- **D2. Rate limit do `GET /organization/invitations`.** (a) Deixar como está e aceitar o `429` em convites em massa;
  (b) casar método no proxy e limitar só o `POST` desse caminho. Recomendação: (b), numa tarefa pequena separada, com o
  `SECURITY.md` ajustado junto. O teto de 20 pendentes e o intervalo de 60 s continuam segurando o volume de e-mail.
- **D3. Admin arquivando dono com membros.** (a) Manter a decisão 16 do plano; (b) recusar o arquivamento enquanto
  houver membros, como a exclusão pelo titular; (c) tratar a organização como dormente quando o perfil do dono está
  arquivado. Recomendação: (a) agora, com a observação no `PRE-PRODUCTION.md`, e (b) como achado no backlog.
- **D4. Status da spec.** Ela entrou `deferred` e o diff entrega o corte inteiro nas duas fatias. Aprovar, levar a
  `in-progress` ou fechar é do `/spec --sync` e de você.

Decidido por mim, sem pergunta: os commits misturam as fases A e B nos sete arquivos que têm trechos das duas, em vez
de `git add -p`. Dois deles são arquivos novos (não rastreados), que pediriam `git add -N` antes do `-p`, e a correção 1
mudou a assinatura de um método da fase A usado por rotas da fase B. A ordem dos commits põe a fase A antes da B dentro
de cada app, e as mensagens dos commits mistos dizem por quê.

## Gates

| comando | resultado |
|---|---|
| `pnpm check` | 1045 arquivos, nenhum erro |
| `pnpm turbo run typecheck --filter=api --filter=app --filter=@repo/sdk` | 3 de 3, sem cache (mudei código nos três) |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes (não mexi em i18n; o número é o do handoff) |
| `vitest run` de `organizationMembersRoute`, `accountErasure`, `accountDeletionRoute` (api) | 3 arquivos, 49 testes |
| `vitest run` de `invitationAcceptance` (app) | 1 arquivo, 7 testes |
| `accountErasureStorage.emulator.test.ts` | não rodei: só troquei o valor que o mock de `remove` devolve, e o arquivo exige JDK 21 |

Não subi app, não dirigi browser e não rodei a suíte inteira.

## Rodada 2: volta do `/test` (2026-10-23)

O `/test` reprovou um critério ("fork B2C não vê organização") com o defeito D-1 e devolveu duas perguntas e duas
observações. Detalhe em `test/report.md`.

### ❌ D-1, corrigido

`apps/app/app/[locale]/(unauthenticated)/invite/page.tsx:18-35`. Com a chave desligada, a página chamava `notFound()`,
mas o `generateMetadata` montava o título e a descrição do convite, e o Next aplica os metadados da rota ao 404. O
`/test` mediu "Convite para a equipe | next-boilerplate" na aba e em `og:title`, nos três idiomas.

A correção segue a página: com a chave desligada, o `generateMetadata` devolve o título e a descrição do 404
(`apps.app.pages.common.notFound`), o mesmo texto que o corpo mostra. Preferi isso a chamar `notFound()` dentro do
`generateMetadata`, porque o Next 16 transmite os metadados depois do corpo para navegador comum, e eu não teria como
medir o efeito sem subir a app.

Medição, em `apps/app/__tests__/organizationPagesSwitch.test.tsx`:

- 6 casos novos (`""` e `"false"` × pt-br, en, es) exigem o título e a descrição do 404 e nenhuma ocorrência de
  equipe, equipo, team, convite, invitation, invitación ou organiza no metadado serializado. Um caso novo com a chave
  ligada exige a cópia do convite.
- Com a correção, o arquivo passa: 11 testes. Com a condição trocada por `if (false)`, os 6 casos da chave desligada
  falham, o que prova que o teste pega o defeito. Restaurei o arquivo depois.
- `/organization` não tem o problema: a página não define `generateMetadata` e herda o título do layout comum
  (`(common)/layout.tsx:24-33`, o nome do painel), como o `/test` mediu.

Fica para o `/test` remedir no build de produção: `/pt-br/invite` com a variável vazia deve ter "Página não
encontrada" na aba.

### Pergunta 1: `POST /organization/invitations` com o Auth falhando responde 500 sem `error.code`

É o comportamento de outras rotas do repositório, não um desvio desta entrega. `isMemberOfOrganization`
(`organization-invitation.ts:67-92`) relança o erro do Auth que não seja `auth/user-not-found`, como fazem
`buildAuthActionLink` (`auth-action-links.ts:92-100`) e `buildEmailChangeLink` (`:163-170`). O
`POST /auth/email-verification/send` deixa esse erro subir sem `try` e também responde 500 sem código. O padrão não é
uniforme: `account/email/route.ts:127-137` captura o mesmo tipo de falha e responde `500 ACCOUNT_UPDATE_FAILED`.

A regra "nunca 500" da política vale para o modo degradado de feature opt-in, e esse caminho está coberto: sem a chave
a rota responde `404 ORGANIZATION_MEMBERS_DISABLED`, sem e-mail configurado `503 EMAIL_NOT_CONFIGURED`. Aqui a feature
está ligada e a infraestrutura falhou. Não corrigi: dar código a essa falha pede um `error.code` novo nos três idiomas e
muda o caso que o `/test` acabou de escrever (`organizationInvitationsRoute.test.ts:331-343`, que fixa o `throw`). Fica
como achado 🟢 para o backlog, junto com o `email-verification/send`: as duas rotas deviam capturar e responder com
código, como a de troca de e-mail.

### Observações 🟢

- **Faixa no rodapé do formulário de convite: corrigido.** O `Footer` (`apps/app/shared/components/ui/Footer.tsx:47`)
  pinta `bg-background/95`, `backdrop-blur` e `supports-backdrop-filter:bg-background/80`. O `className` do convite só
  trocava o primeiro, e o `twMerge` mantém as duas outras classes, porque uma tem variante e a outra é de outro grupo.
  Medido com `twMerge` do design system: antes, a saída mantinha `backdrop-blur supports-backdrop-filter:bg-background/80`;
  depois de acrescentar `backdrop-blur-none supports-backdrop-filter:bg-transparent` em `InviteMemberForm.tsx:62`, a
  saída não tem fundo nem desfoque. Os outros usos do `Footer` não passam `className`: neles o rodapé é a barra fixa
  de formulário de página inteira, e o convite é o único formulário embutido numa seção. Não vi o resultado na tela.
- **Cadastro a partir do convite sem o e-mail preenchido: não corrigido.** O cadastro não aceita parâmetro de e-mail
  (`sign-up/page.tsx:9` só lê `redirect`). Preencher pede um parâmetro novo no `SignUpFormClient.tsx`, que está no
  `contends_on` de `social-sign-in-providers`, e põe o endereço na URL. Fica como achado 🟢 para o backlog.

### Arquivos desta rodada

- `apps/app/app/[locale]/(unauthenticated)/invite/page.tsx` (D-1)
- `apps/app/__tests__/organizationPagesSwitch.test.tsx` (7 casos novos)
- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/(components)/InviteMemberForm.tsx` (rodapé)

### Gates da rodada 2

| comando | resultado |
|---|---|
| `pnpm check` | 1047 arquivos, nenhum erro |
| `pnpm --filter app typecheck` | sem erro |
| `vitest run` de `organizationPagesSwitch` e `organizationTeamPage` (app) | 2 arquivos, 19 testes |

Não mexi na `api` nesta rodada, então não rodei o typecheck dela.

## Plano de commits

Antes do primeiro commit, `git diff --cached --stat` mostra só o rename
`specs/magic-link-sign-in.md => docs/features/magic-link-sign-in/spec.md`, que a auditoria deixou no índice. Ele
pertence ao commit 1, que por isso vem primeiro: o `git add` desse commit junta o conteúdo novo do arquivo e o rename
entra no mesmo commit. Depois do commit 1, o índice tem de sair vazio. Depois de cada commit, conferir
`git show --stat --oneline HEAD` contra a lista.

Os commits 2, 15 e 21 levam código das duas fases, e o corpo da mensagem de cada um diz por quê. O commit 13 usa a ação
de e-mail `organizationInvitation`, cujo tipo vem da cópia que só entra no commit 23: a ordem do repositório põe i18n
por último, então o typecheck fecha no fim da série, não em cada commit.

1. `docs(specs): audit the backlog after PR #56 and archive the email link sign-in spec`
   `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/observability-logging.md`,
   `specs/social-sign-in-providers.md`, `specs/teams-organizations.md`, `docs/features/linked-sign-in-methods/spec.md`,
   `docs/features/magic-link-sign-in/spec.md` (o rename de `specs/magic-link-sign-in.md` já está no índice)
2. `feat(sdk): add the organization contract and scope entity records by it`
   `packages/sdk/src/types/organization/organization.ts`, `.../organization/members.ts`, `.../organization/index.ts`,
   `packages/sdk/src/types/index.ts`, `.../types/entity/entity.ts`, `.../types/account/account.ts`,
   `.../types/file/file.ts`, `packages/sdk/src/actions/file/action.ts`
3. `feat(sdk): add organization actions for members and invitations`
   `packages/sdk/src/actions/organization/action.ts`, `packages/sdk/src/client/index.ts`,
   `packages/sdk/__tests__/organizationAction.test.ts`
4. `feat(shared): add the organization log scope`
   `packages/shared/utils/helpers/log.ts`
5. `chore: index entity records by organization in Firestore`
   `firestore.indexes.json`, `firestore.rules`
6. `feat(api): scope the entity repository by organization`
   `apps/api/(shared)/repositories/entity.repository.ts`, `apps/api/(shared)/mappers/entity.mapper.ts`,
   `apps/api/__tests__/baseRepository.test.ts`, `apps/api/__tests__/firestoreIndexes.test.ts`
7. `feat(api): give every common account an organization`
   `apps/api/(shared)/repositories/organization.repository.ts`,
   `apps/api/(shared)/repositories/organization-member.repository.ts`,
   `apps/api/(shared)/mappers/organization-member.mapper.ts`, `apps/api/(shared)/lib/organization-membership.ts`,
   `apps/api/(shared)/lib/user-merge.ts`, `apps/api/__tests__/organizationMembership.test.ts`,
   `apps/api/__tests__/signUpProfile.test.ts`, `apps/api/__tests__/googleSignInProfile.test.ts`,
   `apps/api/__tests__/mergedUserPayload.test.ts`, `apps/api/__tests__/userMergeArchivedProfile.test.ts`,
   `apps/api/__tests__/usersRoute.test.ts`, `apps/api/__tests__/welcomeNotification.test.ts`
8. `feat(api): add the organization guard`
   `apps/api/app/(guards)/organization.ts`, `apps/api/app/(guards)/plan.ts`, `apps/api/__tests__/organizationGuard.test.ts`
9. `feat(api): store entity photos under the organization prefix`
   `apps/api/(shared)/lib/storage.ts`, `apps/api/(shared)/lib/entity-photo.ts`,
   `apps/api/(shared)/validation/file.schema.ts`, `apps/api/app/(routes)/files/route.ts`,
   `apps/api/__tests__/fileUploadRoute.test.ts`, `apps/api/__tests__/storageEmulatorIsolation.test.ts`
10. `feat(api): scope the entity routes by organization`
    `apps/api/app/(routes)/entities/route.ts`, `apps/api/app/(routes)/entities/[id]/route.ts`,
    `apps/api/app/(routes)/entities/summary/route.ts`, `apps/api/scripts/seed-emulator.mjs`,
    `apps/api/__tests__/entitiesRouteOrganizationScope.test.ts`, `apps/api/__tests__/entitiesRouteImpersonation.test.ts`,
    `apps/api/__tests__/entitiesRouteList.test.ts`, `apps/api/__tests__/entitiesRoutePlanGate.test.ts`,
    `apps/api/__tests__/entitiesSummaryRoute.test.ts`, `apps/api/__tests__/entityPhotoReference.test.ts`,
    `apps/api/__tests__/organizationScope.emulator.test.ts`
11. `feat(api): add the organization members switch`
    `apps/api/(shared)/lib/organization-members.ts`, `apps/api/env.ts`, `apps/api/.env.example`,
    `apps/api/__tests__/organizationMembersEnabled.test.ts`
12. `feat(api): list, remove and leave organization members`
    `apps/api/(shared)/lib/organization-member-profiles.ts`, `apps/api/app/(routes)/organization/route.ts`,
    `apps/api/app/(routes)/organization/members/route.ts`, `apps/api/app/(routes)/organization/members/[id]/route.ts`,
    `apps/api/app/(routes)/organization/leave/route.ts`, `apps/api/__tests__/organizationMembersRoute.test.ts`,
    `apps/api/__tests__/organizationMemberProfiles.test.ts`
13. `feat(api): invite people to an organization by email`
    `apps/api/(shared)/lib/organization-invitation.ts`,
    `apps/api/(shared)/repositories/organization-invitation.repository.ts`,
    `apps/api/(shared)/mappers/organization-invitation.mapper.ts`, `apps/api/(shared)/validation/organization.schema.ts`,
    `apps/api/app/(routes)/organization/invitations/route.ts`,
    `apps/api/app/(routes)/organization/invitations/[id]/route.ts`, `apps/api/app/(routes)/invitations/preview/route.ts`,
    `apps/api/app/(routes)/invitations/accept/route.ts`, `apps/api/__tests__/organizationInvitationsRoute.test.ts`,
    `apps/api/__tests__/invitationsRoutes.test.ts`, `apps/api/__tests__/organizationInvitation.emulator.test.ts`
14. `feat(api): rate limit the invitation endpoints`
    `apps/api/proxy.ts`, `apps/api/__tests__/corsOrigin.test.ts`
15. `feat(api): erase and export organization data with the account`
    `apps/api/(shared)/lib/account-erasure.ts`, `apps/api/(shared)/lib/account-export.ts`,
    `apps/api/app/(routes)/account/deletion/route.ts`, `apps/api/__tests__/accountErasure.test.ts`,
    `apps/api/__tests__/accountErasureStorage.emulator.test.ts`, `apps/api/__tests__/accountDeletionRoute.test.ts`,
    `apps/api/__tests__/accountExportRoute.test.ts`
16. `feat(app): upload entity photos to the organization`
    `apps/app/shared/hooks/useFileUpload.ts`,
    `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx`,
    `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx`,
    `apps/app/__tests__/useFileUpload.test.ts`
17. `feat(app): add the organization members switch and the team menu item`
    `apps/app/env.ts`, `apps/app/.env.example`, `apps/app/shared/lib/organizationMembersEnabled.ts`,
    `apps/app/shared/lib/queryKeys.ts`, `apps/app/app/[locale]/(authenticated)/(common)/paths.ts`,
    `apps/app/app/[locale]/(authenticated)/(common)/routes.tsx`, `apps/app/__tests__/organizationMembersEnabled.test.ts`,
    `apps/app/__tests__/commonNavRoutes.test.tsx`
18. `feat(app): add the team data hooks`
    `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useOrganization.tsx`,
    `.../organization/(hooks)/useListOrganizationMembers.tsx`, `.../organization/(hooks)/useListOrganizationInvitations.tsx`,
    `.../organization/(hooks)/useOrganizationActions.tsx`, `apps/app/__tests__/useOrganization.test.tsx`
19. `feat(app): add the team page`
    `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/page.tsx`, `.../organization/loading.tsx`,
    `.../organization/OrganizationClient.tsx`, `.../organization/(components)/InviteMemberForm.tsx`,
    `.../organization/(components)/LeaveOrganizationButton.tsx`,
    `.../organization/(components)/OrganizationInvitationsTable.tsx`,
    `.../organization/(components)/OrganizationMembersTable.tsx`,
    `.../organization/(validations)/inviteMemberFormSchema.ts`, `apps/app/__tests__/inviteMemberFormSchema.test.ts`,
    `apps/app/__tests__/organizationTeamPage.test.tsx`
20. `feat(app): accept organization invitations at /invite`
    `apps/app/app/[locale]/(unauthenticated)/invite/page.tsx`, `.../invite/hooks/useInvitation.ts`,
    `.../invite/components/InvitationAcceptance.tsx`, `apps/app/proxy.ts`, `apps/app/__tests__/proxy.test.ts`,
    `apps/app/__tests__/invitationAcceptance.test.tsx`, `apps/app/__tests__/organizationPagesSwitch.test.tsx`
21. `feat(internationalization): translate the organization error codes`
    `packages/internationalization/translations/packages/shared/utils.ts`
22. `feat(internationalization): add the team and invitation page copy`
    `packages/internationalization/translations/apps/app/pages/common/organization.ts`,
    `.../apps/app/pages/common/index.ts`, `.../apps/app/pages/common/routes/index.ts`,
    `.../apps/app/pages/invitation/index.ts`, `.../apps/app/pages/index.ts`
23. `feat(internationalization): add the organization invitation email copy`
    `packages/internationalization/translations/packages/email/index.ts`
24. `test(email): render the organization invitation email`
    `packages/email/__tests__/templates.test.tsx`
25. `docs: describe organization-scoped data and the members switch`
    `docs/ARCHITECTURE.md`, `docs/FORKING.md`, `docs/PRE-PRODUCTION.md`, `docs/SECURITY.md`, `docs/PAYMENTS.md`
26. `docs: record organizations in the privacy and incident documents`
    `docs/ROPA.md`, `docs/SUBPROCESSORS.md`, `docs/BACKUP.md`, `docs/INCIDENT-RESPONSE.md`
27. `docs: teach organization scope in the review checklist and analysis guide`
    `docs/review-checklist.md`, `docs/feature-analysis-guide.md`
28. `docs(claude): teach organization-scoped resources to agents and skills`
    `.claude/agents/desenvolvedor.md`, `.claude/skills/new-api-route/SKILL.md`, `.claude/skills/new-crud/SKILL.md`,
    `.claude/skills/write-tests/SKILL.md`, `apps/api/CLAUDE.md`
29. `docs(features): teams-organizations`
    `docs/features/teams-organizations/STATE.md`, `.../analyze/plan.md`, `.../develop/handoff.md`, `.../review/review.md`,
    `.../test/criterios-aceite.md`, `.../test/report.md` (`test/e2e/` fica fora: o `.gitignore:300` descarta)

Os 152 caminhos do working tree aparecem uma vez cada na lista, conferido com `comm` contra `git diff --name-only`,
`git ls-files --others` e `git diff --cached --name-only` depois da rodada 2. Varri `docs/features/teams-organizations/`
por segredo, os dois arquivos de `test/` inclusive: só endereços `@example.com` (do seed e da conta de QA, que foi
excluída) e `token=abc` de exemplo; nenhuma senha gravada.

Título de PR sugerido: `feat: organizations with members and email invitations`.

## Commits realizados

Feitos em 2026-10-23, na branch `guilhermebittelbrunn/tarefa-maior-/cycle`, quando o usuário pediu a PR. A branch manteve o nome: a renomeação para `feat/teams-organizations` (D1) não foi pedida. Antes do primeiro commit o índice tinha só o rename da auditoria, que entrou no commit 1; depois de cada commit, o `git show --name-only` bateu com a lista do plano.

1. `30e9d30` docs(specs): audit the backlog after PR #56 and archive the email link sign-in spec
2. `b7c3dfc` feat(sdk): add the organization contract and scope entity records by it
3. `7392a2f` feat(sdk): add organization actions for members and invitations
4. `2c0415e` feat(shared): add the organization log scope
5. `2100489` chore: index entity records by organization in Firestore
6. `3ee4723` feat(api): scope the entity repository by organization
7. `99a0d36` feat(api): give every common account an organization
8. `cd4ca63` feat(api): add the organization guard
9. `067f0af` feat(api): store entity photos under the organization prefix
10. `9eb45df` feat(api): scope the entity routes by organization
11. `eb41b9c` feat(api): add the organization members switch
12. `8742c27` feat(api): list, remove and leave organization members
13. `acffbb4` feat(api): invite people to an organization by email
14. `7dec328` feat(api): rate limit the invitation endpoints
15. `4de7009` feat(api): erase and export organization data with the account
16. `6bab4a5` feat(app): upload entity photos to the organization
17. `5c94693` feat(app): add the organization members switch and the team menu item
18. `a648730` feat(app): add the team data hooks
19. `3889c78` feat(app): add the team page
20. `3bb5d72` feat(app): accept organization invitations at /invite
21. `051ebd0` feat(internationalization): translate the organization error codes
22. `752ba46` feat(internationalization): add the team and invitation page copy
23. `302864b` feat(internationalization): add the organization invitation email copy
24. `4015aec` test(email): render the organization invitation email
25. `703ae08` docs: describe organization-scoped data and the members switch
26. `fd34527` docs: record organizations in the privacy and incident documents
27. `3461414` docs: teach organization scope in the review checklist and analysis guide
28. `c99e95f` docs(claude): teach organization-scoped resources to agents and skills
29. este commit, `docs(features): teams-organizations`
