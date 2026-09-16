# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-16 (`/spec --sync`, pós-merge das PRs #13 e #14) · anteriores: 2026-09-15 ·
> 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) ·
> 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`firebase-emulator-seed` fechou e foi arquivada.** PR **#13** mergeada em `main` em
>    2026-09-15T20:44:44Z (merge commit `8107f3f`), CI `success` nesse SHA. Os **5 itens do corte** foram
>    reconferidos um a um no código, com evidência em `arquivo:linha` marcada na spec arquivada em
>    [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md).
> 2. **O backlog não tem mais nenhum bloqueio de dependência.** `e2e-testing` era o último, e as duas
>    specs de que ele dependia (`ci-pipeline` e `firebase-emulator-seed`) estão entregues. **As 10 specs
>    `proposed` são todas elegíveis.**
> 3. **🟢 O gate instável morreu.** As **9** configs de Vitest declaram `testTimeout: 20_000` desde a PR
>    #13. Remedido agora: `pnpm turbo run lint typecheck test --force` fechou **23/23 tasks, 0 em cache,
>    em 50,7 s**, e o teste que falhava 1 em 2 execuções rodou em **1273 ms**. Três documentos afirmavam o
>    contrário e foram corrigidos.
> 4. **A escolha do #1 mudou de critério, porque o critério antigo acabou.** Por três rodadas o topo foi
>    decidido por "é a única spec elegível que desbloqueia outra". Sem bloqueio nenhum no grafo, esse
>    desempate deixou de existir, e o #1 passa a ser decidido por valor × esforço × custo de adiar. Ver
>    [Ordem recomendada](#ordem-recomendada).
> 5. **Deriva em 7 das 11 specs**, com **4 inversões semânticas** — três delas concentradas na própria
>    `firebase-emulator-seed`, que estava em `specs/` negando o commit que a fechou. Nenhuma é deriva de
>    implementação: o corte da PR #13 foi entregue como especificado.
> 6. **Dois erros de fato corrigidos, não só linhas deslocadas.** `cookie-consent` listava um item de
>    `localStorage` como cookie (eram 5, não 6) e `account-security-mfa` dizia que o mínimo fraco de senha
>    estava em 2 schemas (são 5). Os dois números vinham sendo usados como argumento.
> 7. **A PR #13 não deixou nenhuma conta de QA no projeto Firebase real** — a primeira entrega em 13 PRs a
>    não engordar aquela lista, e é efeito direto do que ela entregou.

## Contadores

Sobre as **11 specs que seguem em `specs/`**. Recontados do disco em 2026-09-16, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 10 |
| `approved` | 0 |
| `in-progress` | 0 |
| `done` (arquivadas) | 8 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 4 · `confianca` 4 · `dx` 3. **Por esforço:** P 0 · M 8 · G 3. **Por valor:**
alto 8 · médio 3 · baixo 0.

**Transições aplicadas nesta rodada: 1** — `firebase-emulator-seed` `proposed` → `done` + arquivada. O
frontmatter dizia `proposed` mesmo com a feature entregue e mergeada: a spec nunca passou por
`in-progress`. É a **terceira** rodada seguida com o mesmo padrão. Não é falha da auditoria, é do
`/analyze`, que deveria marcar a spec ao começar — e vale registrar que, em três rodadas, o custo real
disso foi zero, porque a auditoria confere o código e não o status. O `in-progress` segue em **zero**: não
há feature em execução.

## Gates — medidos nesta auditoria

Executados agora, com `--force`. Não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **517 arquivos · 0 erros** (`No fixes applied`, 2 s) |
| `pnpm turbo run lint typecheck test --force` | ✅ **23/23 tasks · 0 em cache · 50,7 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-15 |
|-----------|---------:|-------:|------------------|
| `api` | 33 | 346 | +3 arquivos · **+31** |
| `app` | 36 | 265 | — · **+3** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 6 | 62 | +3 arquivos · **+24** |
| `@repo/security` | 3 | 31 | — |
| `web` | 4 | 27 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/shared` | 1 | 15 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **94** | **918** | **+6 arquivos · +58 testes** |

CI: as execuções de merge de **#13** (`8107f3f`) e **#14** (`68d67ba`) estão as duas em **`success`**,
assim como as 10 anteriores. A branch de trabalho desta auditoria é `los-angeles`, cujo `HEAD` é `68d67ba`
— ou seja, nenhum commit do repositório está fora de `main`.

### 🟢 O gate instável foi corrigido — e vale registrar o que o episódio custou

Na rodada anterior este era o achado mais grave do backlog: o gate falhava **1 em 2 execuções**, e a causa
não eram "dois arquivos lentos", era estrutural — nenhuma das 9 configs declarava `testTimeout`, então
toda a suíte corria contra o default de 5 s **medido sob contenção do turbo**.

A PR #13 declarou `testTimeout: 20_000` nas nove. Medição de hoje:

| medição | antes (2026-09-15) | agora (2026-09-16) |
|---------|--------------------|--------------------|
| configs com `testTimeout` | 0 de 9 | **9 de 9** |
| gate completo, sem cache | 🔴 falhou na 1ª de 2 execuções | ✅ **23/23, 50,7 s** |
| `accountSecurityForm.test.tsx`, arquivo | 7401 ms sob contenção | 3322 ms |
| o teste que estourava | > 5000 ms (timeout) | **1273 ms** |

Duas coisas sobrevivem à correção. A primeira é que **a margem de tempo do gate não é
medida por nada** — foi preciso o gate ficar vermelho para alguém descobrir qual arquivo estava mais perto
de estourar, e não era nenhum dos dois que a documentação vinha nomeando. A segunda é que o teto de 20 s
não é licença: um teste de componente que passe a encostar nele é problema do teste.

Consequência direta: **o único pré-requisito do branch protection caiu**. `gh api
…/branches/main/protection` ainda devolve **404** e `rulesets` ainda devolve `[]` (remedido hoje), mas
agora ligar o check obrigatório é decisão, não risco.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.

> **O critério mudou, e a mudança merece uma linha.** Nas três rodadas anteriores o topo foi decidido por
> desempate estrutural: entre specs parecidas, ganhava a que **desbloqueava outra**. Esse critério acabou
> junto com o último bloqueio do grafo. Daqui em diante o #1 é escolhido por mérito próprio, o que torna a
> discordância mais legítima — não há mais um fato do grafo para encerrar o argumento.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`observability-logging`](observability-logging.md) | **Sobe ao topo depois de três rodadas em segundo lugar, e por ter perdido só pelo critério que agora não existe mais.** Valor alto, esforço M, `depends_on` vazio, e uma evidência que nenhuma outra spec do backlog tem: uma previsão escrita na própria spec se cumprindo literalmente, duas vezes seguidas. Ela dizia que sem helper a convenção de log se degrada por cópia; a PR #11 criou `entity-photo.ts:61` com só o prefixo, e a #12 criou `account-avatar.ts:44`, clone textual do anterior. Placar atual: **4 conformes · 3 semiconformes · 1 não-conforme**, e **26 chamadas de `console.*` cru em 20 arquivos**, das quais 5 no `packages/auth/server.ts` — um pacote de autenticação, passando o objeto de erro inteiro. Some-se que as 3 rotas de conta da #12 não emitem log nenhum, incluindo troca de senha e revogação de sessão. O item 5 do corte exige que a camada seja **no-op sem a variável do serviço**, então nenhum fork herda env obrigatória nem conta paga. |
| 2 | [`cookie-consent`](cookie-consent.md) | A única spec do backlog com **violação em curso**, não com ausência de recurso: `packages/analytics/provider.tsx:15` monta o Vercel Analytics **incondicionalmente** e `:16` monta o GA checando só a env — zero consentimento, em todo o app. `grep -rniE "consent\|cookie-?banner"` segue em **0**. O inventário a declarar são **5** cookies (corrigido nesta rodada: o sexto era `localStorage`), e a PR #12 deixou de graça o padrão de ler cookie no servidor e aplicar no `<html>` sem piscar. Quinta rodada fora do topo pelo mesmo motivo honesto: a exposição real de um boilerplate sem usuários é baixa. **Se o primeiro fork for a público antes do #1 sair, esta ordem se inverte.** |
| 3 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira": `base.repository.ts:36-49` faz `.get()` sem `limit`, `orderBy` nem `startAfter`, e nenhum dos métodos aceita parâmetro de consulta. `firestore.indexes.json` segue com **um único** índice. É a spec com o argumento mais forte de **"fica mais caro depois"**: corrigir com dados em produção muda contrato do SDK, DTO, hooks e índices ao mesmo tempo. Cruza com a dívida do `update()` (achados), que precisa de `orderBy` estável em `createdAt`. |
| 4 | [`audit-log`](audit-log.md) | O painel já tem impersonação e **nada registra quem entrou na conta de quem** — o switch é inteiramente client-side (`panelStore.ts:76-90`, sem uma chamada de API). São **18 handlers de escrita** no repositório e **zero** gravam evento, incluindo `POST /account/sessions/revoke`: hoje não dá para distinguir se quem derrubou as sessões foi o dono ou quem tomou a conta dele. **0 de 5.** |
| 5 | [`billing-subscription`](billing-subscription.md) | Maior valor bruto do backlog e ainda em **0/6**: não existe diretório `payments/` nas rotas, o `UserDTO` não tem `subscription` nem `stripeCustomerId`, e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:11,21`) sem dedupe por `event.id`. O escopo já encolheu: a aba `/account?tab=billing` existe com placeholder traduzido, e `docs/PAYMENTS.md` foi corrigido. **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. |
| 6 | [`data-rights-lgpd`](data-rights-lgpd.md) | Obrigação legal com prazo, o argumento mais duro do backlog. Segue em 0/5, e a armadilha dos objetos órfãos continua dobrada: `deleteObjectQuietly` tem **2** call sites, ambos de troca, nenhum de expurgo. O `delete()` herdado é **soft delete** (`base.repository.ts:127-129`), então nem uma varredura por "documentos sem dono" resolveria. Esforço **G** é o que a segura fora do topo numa rodada autônoma — e a varredura por prefixo de dono ficou mais fácil de escrever agora que existe emulador. |
| 7 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze` — o item 2 do corte continua oco.** A spec propunha coletar nome de exibição e idioma; a PR #12 passou a coletar exatamente esses dois dados na área de conta. Sobra o **"quando"** (pedir antes de deixar entrar), que é diferença real de ativação mas item bem menor. `grep -rin onboarding` em `apps/` + `packages/` segue em **1 ocorrência**, e é um endereço de sandbox num fixture de teste. |
| 8 | [`e2e-testing`](e2e-testing.md) | 🔓 **Destravada nesta rodada** — as duas dependências foram entregues. E, na mesma rodada, **perdeu o argumento mais forte que tinha**: o gate instável foi corrigido pela PR #13. O que resta é sólido e mais lento de cobrar: zero `playwright`/`cypress`/`axe` em qualquer `package.json`, nenhuma das 9 configs medindo cobertura, e **duas rules files sem um único teste de regra** (`firestore.rules` publicado em deny-all, `storage.rules` nem publicado) — agora sem desculpa, porque o emulador existe. Esforço **G** e `value: médio`. |
| 9 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são **11 linhas** e o literal `"Home"` — com a chave de dicionário pronta ao lado, já usada em 5 breadcrumbs. É a primeira tela de todo fork, e resgataria o `chart.tsx` (a dependência `recharts` pesa no bundle e nunca renderizou nada). Spec mais "presa" do conjunto elegível, apesar de `depends_on: []` — ver lotes. |
| 10 | [`account-security-mfa`](account-security-mfa.md) | Encolheu sozinha e não subiu. O item 1 foi entregue pela `account-settings` e o item 3 saiu pela metade. Restam MFA (**3/10** de prevalência entre os starters pesquisados), visibilidade de sessões (**1/10**) e política de senha — esta última **maior do que a spec dizia**: o `MIN_PASSWORD_LENGTH = 6` está copiado em **cinco** schemas, não dois. `value: médio` por mérito próprio. |
| 11 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora há **vinte e cinco dias**. Ver [a decisão que não pode esperar a fila](#a-decisão-que-não-pode-esperar-a-fila). |

### O que **não** foi escolhido para #1, e por quê

- **`cookie-consent`** foi a decisão mais difícil, e a margem é fina. Ela tem a única violação **ativa** do
  backlog, enquanto o #1 tem ausência de recurso — e violação ativa costuma ganhar de ausência. Perdeu por
  exposição: um boilerplate sem usuários não rastreia ninguém, e o dano é zero até o primeiro fork ir a
  público. *Se você discorda desse peso, esta é a troca a fazer conscientemente — as duas são defensáveis,
  e a inversão é de uma linha.*
- **`cursor-pagination`** tem o melhor argumento de "fica mais caro depois" do conjunto, e foi o segundo
  candidato mais próximo. Perdeu porque o custo dela **ainda não começou a correr**: sem dados em
  produção, uma coleção inteira lida por requisição é indistinguível de uma paginada. O custo do #1 já
  está correndo e é mensurável — uma variação de log por entrega, duas entregas seguidas.
- **`data-rights-lgpd`** tem prazo legal e mesmo assim não foi ao topo: esforço **G** é má escolha para uma
  rodada autônoma do `/cycle`, que é justamente o contexto desta auditoria.
- **`e2e-testing`** acabou de destravar e por um momento pareceu o sucessor natural do #1 anterior. Não é:
  a dependência caiu **e** o melhor argumento dela caiu na mesma PR. Esforço G, valor médio.

## Lotes paralelos

Para rodar o ciclo completo em 2–4 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-16** a
partir do `contends_on` de cada spec, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis nesta rodada: 10 de 11.** A única fora é `teams-organizations`, por ser `deferred`. É a
primeira rodada sem nenhuma spec barrada por dependência.

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `observability-logging` · `cookie-consent` · `cursor-pagination` | instrumentação + proxy da API + webhook de pagamento · provedor de analytics + os dois `layout.tsx` + barril de UI · `base.repository.ts` + `entity.repository.ts` + `table.tsx` + índices + ação `entity` do SDK | três territórios disjuntos: **borda da API**, **apresentação/analytics** e **camada de dados**. Nenhum arquivo em comum |
| **2** | `audit-log` · `onboarding-flow` · `e2e-testing` | `base.repository.ts` + `users/[id]` + índices + barril do SDK + `queryKeys.ts` · `apps/app/proxy.ts` + resolvedor pós-login + `user-merge.ts` + `UserDTO` · `package.json` da raiz + `turbo.json` + `ci.yml` | **escrita de trilha na API**, **desvio de navegação no app** e **ferramental da raiz**. Encostam no `user` por caminhos distintos (`users/[id]/route.ts` × `user-merge.ts`) |
| **3** | `billing-subscription` · `data-rights-lgpd` | webhook + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` · `base.repository.ts` + `packages/auth/server.ts` + índices | **slice `user` cobrado** e **expurgo herdado**. Repositórios e pacotes diferentes |
| **4** | `dashboard-home` · `account-security-mfa` | as duas `page.tsx` de home + `queryKeys.ts` + índices · `packages/auth/*` + `resolve-api-actor.ts` | **tela** e **camada de sessão**, sem interseção |

### Por que cada spec ficou de fora do lote 1

Distinguir os dois motivos importa: colisão é **dado**, teto é **decisão**.

- **`audit-log`, `billing-subscription`, `onboarding-flow`, `e2e-testing`, `dashboard-home` e
  `account-security-mfa` não colidem com nenhuma das três do lote 1.** Ficaram de fora **só pelo teto de
  3**, que é escolha de custo de revisão e não impedimento técnico. Se você tiver fôlego para revisar
  quatro features amanhã, a de melhor posição na ordem é `audit-log`.
- **`data-rights-lgpd` é a única com colisão real contra o lote 1:** ela altera
  `apps/api/(shared)/repositories/base.repository.ts` e `firestore.indexes.json`, os dois disputados com
  `cursor-pagination`. Não é acidente — as duas precisam mexer no mesmo repositório herdado, uma para
  ensiná-lo a paginar e a outra para ensiná-lo a excluir de verdade.

E o que separa os lotes 2 a 4 entre si:

- **`billing-subscription` não entra com `audit-log`:** as duas alteram
  `packages/sdk/src/client/index.ts`, o barril do SDK.
- **`data-rights-lgpd` não entra com `audit-log`:** disputa `base.repository.ts` **e**
  `firestore.indexes.json`. Duas colisões, não uma.
- **`dashboard-home` não entra com `data-rights-lgpd`:** disputa `firestore.indexes.json`. É a spec mais
  "presa" do conjunto elegível, apesar de `depends_on: []` — bom exemplo de que "sem dependência" não
  significa "pode rodar a qualquer momento".
- **`account-security-mfa` não entra com `data-rights-lgpd`:** as duas alteram `packages/auth/server.ts`.

**O arquivo mais disputado do repositório é `firestore.indexes.json`**, citado por **5** das 11 specs
(`audit-log`, `cursor-pagination`, `dashboard-home`, `data-rights-lgpd`, `teams-organizations`). Em
seguida, com 3: `apps/api/(shared)/repositories/base.repository.ts` e `packages/sdk/src/client/index.ts`.
**`packages/auth/server.ts` caiu de 3 para 2 disputantes** com a saída de `firebase-emulator-seed` — a
camada de autenticação desafogou.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra: duas features ainda podem brigar num arquivo que nenhuma das duas antecipou.

A régua desta rodada, com `firebase-emulator-seed` entregue como amostra: ela declarava **3** arquivos em
`contends_on` — `firebase.json`, `package.json` da raiz e `packages/auth/server.ts` — e **acertou os
três**. Mas a PR tocou também `packages/auth/client.ts`, `packages/auth/emulator.ts` (novo), os três
`.env.example`, `apps/app/proxy.ts`, as 9 `vitest.config.mts` e `docs/SETUP.md`. Dois desses são
`contends_on` declarado de **outras** specs: `apps/app/proxy.ts` (de `onboarding-flow`) e o `package.json`
da raiz (de `e2e-testing`).

**A previsão acertou em cheio o que declarou e subestimou o raio.** É o mesmo resultado da rodada
anterior, com uma diferença: desta vez o raio extra caiu quase todo em arquivos **novos**, que por
definição não conflitam. Se dois workspaces do mesmo lote tocarem o mesmo arquivo por acidente, **isso é
achado de auditoria** — corrija o `contends_on` das duas specs na rodada seguinte, em vez de tratar como
azar.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-16 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | 🔓 **destravada nesta rodada** — `ci-pipeline` entregue na PR #5, `firebase-emulator-seed` na PR #13 (`8107f3f`) |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`cookie-consent`](cookie-consent.md) · [`dashboard-home`](dashboard-home.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |

> **O grafo de dependências acabou.** Nenhuma spec em `specs/` está bloqueada por outra. Isso muda duas
> coisas de uma vez: a priorização perde o desempate estrutural que vinha usando há três rodadas, e a
> paralelização passa a ser limitada só por contenção de arquivo e pelo teto de revisão. O aprendizado da
> rodada passada continua de pé: **um item bloqueado por dependência declarada pode
> ser resolvido pela própria dependência**, sem que ninguém o ataque de frente — foi o que aconteceu com o
> item 1 de `account-security-mfa`.

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`cookie-consent`](cookie-consent.md) | Consentimento de cookies e Consent Mode | confianca | alto | M | `proposed` | — |
| [`cursor-pagination`](cursor-pagination.md) | Paginação por cursor no BaseRepository e no SDK | dx | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`dashboard-home`](dashboard-home.md) | Home do painel com widgets | produto | médio | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | ✅ `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | ✅ `ci-pipeline` · ✅ `firebase-emulator-seed` |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `proposed` | — |
| [`onboarding-flow`](onboarding-flow.md) | Onboarding pós-cadastro | produto | alto | M | `proposed` | — |
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | ✅ `transactional-emails` |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementou.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| `firestore-admin-access` | 2026-08-31 | [`docs/features/firestore-admin-access/spec.md`](../docs/features/firestore-admin-access/spec.md) — 5/5; **item 4 contestado e reconfirmado** por medição em 2026-09-11 (403) |
| `ci-pipeline` | 2026-09-01 | [`docs/features/ci-pipeline/spec.md`](../docs/features/ci-pipeline/spec.md) — ⚠️ fechada com 1 item do corte em aberto |
| `api-hardening` | 2026-09-09 | [`docs/features/api-hardening/spec.md`](../docs/features/api-hardening/spec.md) — 5/5 do corte entregues |
| `transactional-emails` | 2026-09-10 | [`docs/features/transactional-emails/spec.md`](../docs/features/transactional-emails/spec.md) — 6/6 do corte |
| `auth-recovery-verification` | 2026-09-11 | [`docs/features/auth-recovery-verification/spec.md`](../docs/features/auth-recovery-verification/spec.md) — 5/5 do corte, conferidos um a um |
| `file-upload-storage` | 2026-09-14 | [`docs/features/file-upload-storage/spec.md`](../docs/features/file-upload-storage/spec.md) — 5/5 do corte (PR #11, `9154776`). ⚠️ 6 critérios "não verificados" por o Cloud Storage não estar ativado |
| `account-settings` | 2026-09-15 | [`docs/features/account-settings/spec.md`](../docs/features/account-settings/spec.md) — 6/6 do corte (PR #12, `a4df5ed`). ⚠️ O caminho feliz do **avatar** segue não verificado contra infra real |
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — **5/5 do corte**, conferidos um a um no código (PR #13, `8107f3f`, CI verde). Entregou também, fora do corte, o `testTimeout` nas 9 configs de Vitest |

**Verificado nesta rodada:** `docs/features/` tem **10** pastas e **8** `spec.md` arquivados. Não houve
colisão no `git mv` (`docs/features/firebase-emulator-seed/spec.md` não existia), e o `STATE.md` daquela
feature **já trazia** `spec: firebase-emulator-seed` (`:5`) — não foi preciso acrescentar. Os frontmatters
das 8 arquivadas estão coerentes (`status: done`, `feature: <slug>`) e **não há duplicata** em `specs/`.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
aqui, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### O que a PR #13 entregou **além** do corte

Registrado porque quem ler o diff vai estranhar, e porque um dos itens matou um achado 🔴 deste backlog:

1. **`testTimeout: 20_000` nas 9 `vitest.config.mts`.** Não estava na spec. Entrou porque o gate falhava
   1 em 2 execuções e a entrega ia acrescentar testes. **Matou o achado 🔴 do gate instável** e o último
   pré-requisito do branch protection.
2. **Um vazamento real para o Cloud Storage, encontrado pelo `/review`.** Sob emulador, o Admin SDK rodava
   em modo ADC e gravava em bucket de verdade. Corrigido, e coberto por
   `apps/api/__tests__/storageEmulatorIsolation.test.ts`, que **falha 7 de 13 casos contra o código
   pré-correção** — ou seja, não é teste vazio.
3. **`packages/auth/emulator.ts`**, um predicado único para "estou falando com o emulador?", consumido por
   cinco lugares que antes derivariam a resposta cada um por conta própria.

**Nada disso é deriva de implementação** — o corte foi entregue como especificado. É escopo adicional,
carona numa PR de infraestrutura. A leitura útil, pela terceira PR seguida: **uma entrega está consertando,
de passagem, achados que o backlog vinha listando como pendentes há rodadas.** Isso é bom, e tem um custo
que já se repetiu três vezes: os achados morrem sem que ninguém os marque como mortos, e a auditoria
descobre tarde.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 918 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-16 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md` (gate instável) | 🔴 bloqueante; "nenhuma das 9 configs declara `testTimeout` (`grep` ⇒ **0**)"; taxa de falha 1 em 2 | **falso desde `8107f3f`.** As 9 configs declaram `testTimeout: 20_000`; o gate fechou 23/23 em 50,7 s | 🟢 **corrigido hoje** com a medição real, e o item rebaixado de bloqueante a resolvido |
| `docs/PRE-PRODUCTION.md` (contas de QA) | 15 contas, a última leva registrada é a da PR #12 | **confere, e a PR #13 não acrescentou nenhuma** — as contas do ciclo viveram só no emulador | 🟢 **atualizado hoje** com a entrada da #13 e da #14, ambas zeradas |
| `docs/PRE-PRODUCTION.md:19-52` (rules do Firestore) | "publicado e em vigor" | **confere.** O `deny-all` de `firestore.rules:32-33` está no disco | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md` (Cloud Storage) | serviço **não** ativado; `storage.rules` não publicado | **confere** | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md` (`CORS_ORIGIN` não derruba o processo) | o gate lança e não mata o processo | **confere.** `apps/api/instrumentation.ts:18` tem `throw` e o arquivo **não tem `process.exit`** | ✅ **honesto** |
| `docs/SECURITY.md` | postura de segurança (rules, CSP, COOP, rate limit, URL assinada) | conferida na rodada anterior, 17/17; o único deslocamento desta rodada é de linha (`:62-70` → `:66-69`) | ✅ **honesto** |
| `docs/PAYMENTS.md` | "Estado atual (medido em …)" — não há fluxo de assinatura; handlers são stubs | **confere.** `webhooks/payments/route.ts:11,21` seguem com `// TODO` e o diretório `payments/` não existe nas rotas | ✅ **honesto** pela segunda rodada |

> **Nota de método, quinta rodada consecutiva:** todas as contradições apareceram por **medição direta**
> contra o código, nunca por leitura. Os três documentos que adotaram o formato "afirmação + data de
> medição" passam limpo; o único que errou desta vez errou **na direção segura** — descrevia como
> pendente algo que já tinha sido corrigido. Continua sendo erro, e continua só aparecendo se alguém
> medir.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **7 das 11 specs**. **Nenhuma é de implementação divergente**: o corte de
`firebase-emulator-seed` foi entregue como especificado. As quatro specs intactas — `audit-log`,
`billing-subscription`, `data-rights-lgpd` e `dashboard-home` — tiveram **todas** as suas âncoras
reconferidas uma a uma e nenhuma se deslocou.

> **A PR #14 não deslocou uma única âncora de código**, porque mexeu só em `.claude/` e `docs/`. A exceção
> foi o `CLAUDE.md`, que ganhou 9 linhas e moveu duas referências citadas por `e2e-testing`. Todo o resto
> da deriva desta rodada vem da PR #13, concentrada em cinco arquivos que ela tocou.

### As 4 inversões semânticas (a spec acusava de errado algo já corrigido)

Estas são as graves, porque quem segue a referência lê **o contrário** do que a spec afirma. Todas
corrigidas no disco:

| id | a spec afirmava | realidade | ação |
|----|----------------|-----------|------|
| `firebase-emulator-seed` | "o `firebase.json` **continua não havendo bloco de emuladores**"; "não existe **nenhum** script de seed"; "`docs/SETUP.md` não menciona emulador nem seed" | as três falsas desde `8107f3f` — o commit que fechou a própria spec | ✅ seção "O que já existe no repo" reescrita antes de arquivar |
| `firebase-emulator-seed` | o bootstrap do primeiro admin "não conhece emulador"; item 3 do corte "**metade feito**" | `create-dev-admin.mjs:4,117-121` dispensa service account sob emulador e `:129-133` exige consentimento contra projeto real. Item **completo** | ✅ corrigida e marcada `[x]` com evidência |
| [`e2e-testing`](e2e-testing.md) | "as 9 configs de Vitest, **nenhuma** declara `testTimeout` — 0 ocorrências"; "o gate instável **FALHOU**, 1 em 2 — é o argumento mais forte desta spec" | **9 de 9** declaram; o gate fechou 23/23 em 50,7 s | ✅ reescrita; o argumento foi **removido**, não maquiado, e o aprendizado ficou |
| [`e2e-testing`](e2e-testing.md) | "**Dependências duras.** Sem `firebase-emulator-seed` os testes escreveriam num Firebase real" | as duas dependências estão entregues | ✅ reescrita: bloqueio removido, e registrada a restrição que a spec **herda** (o seed só aceita project id `demo-*`) |

### Os dois erros de fato (não de linha)

Separados dos deslocamentos porque não são envelhecimento — são contagens erradas que vinham sendo usadas
como argumento:

| id | afirmava | realidade | por que importa |
|----|----------|-----------|-----------------|
| [`cookie-consent`](cookie-consent.md) | **6** nomes de cookie, e o número usado como argumento ("o inventário triplicou") | são **5**. `bp:panel-state` é `PANEL_STORAGE_KEY`, chave de **localStorage** (`panelState.ts:20`), e o docblock do arquivo (`:8-13`) separa cookie de localStorage de propósito | Um aviso de consentimento que liste um item de localStorage como cookie comete **exatamente** o defeito que a spec existe para evitar |
| [`account-security-mfa`](account-security-mfa.md) | o `MIN_PASSWORD_LENGTH = 6` está em **dois** schemas | está em **cinco**: `signUpSchema.ts:6`, `resetPasswordSchema.ts:6`, `signInSchema.ts:6`, `userFormSchema.ts:7`, `accountFormSchema.ts:9` | O item 4 do corte é maior do que a spec dimensionava. Não existe "um lugar" onde mudar a política |

### As âncoras deslocadas

Todas corrigidas no disco. Origem única: a PR #13 fez `packages/auth/server.ts` crescer 15 linhas e
`apps/app/proxy.ts` 14, e reescreveu `docs/SETUP.md`.

| id | quantas | onde |
|----|--------:|------|
| [`account-security-mfa`](account-security-mfa.md) | 10 | `packages/auth/server.ts` (`:257`→`:272`, `:165`→`:180`, `:138-151`→`:153-166`, `:132-137`→`:147-152`, `:238-241`→`:253-256`, `:226`→`:241` ×2) e `client.ts:191-202`→`:224-235` |
| [`onboarding-flow`](onboarding-flow.md) | 8 | todas em `apps/app/proxy.ts` (`:62`→`:76`, `:83-84`→`:97-99`, `:58-59`→`:71-75`, `:63-67`→`:77-81`, `:75`→`:89`, `:87-89`→`:101`, `:175`→`:189`, `:186`→`:200`) |
| [`observability-logging`](observability-logging.md) | 7 | `storage.ts:74`→`:81` (×2) e as 5 de `packages/auth/server.ts` (`:176,189,205,248,261`→`:191,204,220,263,276`). Recontagem: **26 chamadas em 20 arquivos**, não 18 |
| [`e2e-testing`](e2e-testing.md) | 3 | `CLAUDE.md:143,152`→`:146,155` (PR #14) e o inventário **860 testes em 88 arquivos** → **918 em 94** |
| [`cursor-pagination`](cursor-pagination.md) | 2 | `docs/SETUP.md:178-188`→`:190-200`, comando de deploy `:185`→`:197` |
| [`cookie-consent`](cookie-consent.md) | 2 | `apps/app/proxy.ts:155,159`→`:169,173` e `apps/web/proxy.ts:92,96`→`:104,108` |

**Nenhuma âncora quebrada** em nenhuma spec: nenhum arquivo citado sumiu e nenhum símbolo desapareceu.
**Nenhuma regressão detectada** nas capacidades das 8 specs arquivadas.

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação: retrofitar escopo por
organização é **reescrita, não refactor** (6/10 de prevalência, esforço G).

**Decidido em 2026-08-22:** `deferred` — adiar a implementação, **não** a decisão. O que torna o adiamento
honesto são duas contrapartidas de esforço P que **não dependem desta spec**:

1. escrever em `docs/ARCHITECTURE.md` se este core é **B2B ou B2C por padrão** — remedido hoje:
   `grep -ciE "b2b|b2c|organiza|tenant" docs/ARCHITECTURE.md` retorna **0**. O arquivo existe, com 7,5 KB;
   a decisão é que não está nele;
2. concentrar o predicado de posse num ponto único de escopo — remedido hoje: seguem **9 sítios em 3
   recursos**, os mesmos da rodada anterior, reconferidos um a um.

**Nenhuma das duas foi feita até 2026-09-16** — os juros correm há **vinte e cinco dias**:

| rodada | sítios do predicado | recursos |
|--------|--------------------:|---------:|
| até a PR #10 | 3 | 1 |
| PR #11 | 4 | 1 |
| PR #12 | 9 | 3 |
| **PRs #13 e #14** | **9** | **3** |

**A curva parou de subir nesta rodada**, e vale dizer por quê antes que alguém leia como boa notícia: as
duas PRs desta janela foram de infraestrutura e de ferramental, não de produto. Nenhum recurso novo nasceu
escopado por usuário porque nenhum recurso novo nasceu. O adiamento não ficou mais caro; também não ficou
mais honesto.

> **Recomendação ao usuário, não decisão da auditoria:** se a próxima rodada passar sem as contrapartidas,
> vale encarar a pergunta de frente — ou elas viram tarefa com dono no `/analyze`, ou este `deferred`
> deveria ser lido como `rejected` até o primeiro fork B2B aparecer. Manter `deferred` por um mês sem
> nenhuma das duas é fingir que a decisão está adiada quando ela está sendo tomada por omissão.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados na descoberta e nos pipelines. **Não são funcionalidades** — são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-16.** Os achados da rodada anterior foram reconferidos **um a um** no código, com
> comando rodado agora. **Placar: 2 fechados · 1 resolvido por checagem · o restante segue · 0 novos.**
> Padrão pela **quinta** rodada: a PR #13 tocou `package.json` da raiz e de `apps/api`, mas **não** os dos
> pacotes, então toda a família de dependências não declaradas e exports quebrados segue **intacta**.

### ✅ Fechados nesta rodada

| achado | onde | evidência |
|--------|------|-----------|
| 🟢 **O gate de teste falhava 1 em 2 execuções** — era o achado 🔴 da rodada anterior e o último pré-requisito do branch protection | as 9 `vitest.config.mts` | `grep -rl testTimeout --include=vitest.config.* .` ⇒ **9 de 9**, todas com `testTimeout: 20_000`. Gate remedido hoje: **23/23, 0 em cache, 50,7 s**; o teste que estourava rodou em **1273 ms** |
| 🟢 **O Admin SDK gravava em bucket real sob emulador** — vazamento encontrado pelo `/review` da PR #13, não pelo backlog | `packages/auth/server.ts` | Corrigido e coberto por `apps/api/__tests__/storageEmulatorIsolation.test.ts`, que falha 7/13 contra o código pré-correção |

### ✅ Resolvido por checagem (a suspeita não se confirmou)

| suspeita | veredito |
|----------|----------|
| "⚠️ **Verificar se o `x-theme` novo herdou o defeito de TTL do `x-locale`**" (rodada anterior) | **Não herdou.** O `x-theme` é escrito **só no cliente**, com TTL explícito (`themePreference.ts:33,60`, `PREFERENCE_COOKIE_TTL_SECONDS`), e o servidor apenas **lê** (`apps/app/app/layout.tsx:28`). O defeito do `x-locale` vem dos proxies, que fazem `cookieStore.set` sem `maxAge` (`apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108`) — e nenhum dos dois toca em `x-theme` |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#5) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` não tem `exports` |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o primeiro import do `apps/api/proxy.ts` — o middleware, que roda em toda requisição | `packages/security/index.ts:11` | `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot — e `instrumentation.ts:23-27`, que só checa presença, **não avisaria** |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança (`:18`) e **não há `process.exit` em nenhum lugar do arquivo** | `apps/api/instrumentation.ts:18` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. **Documentado** em `docs/PRE-PRODUCTION.md`, não corrigido |

### 🟡 Dependências, exports e código morto — intactos

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `apps/app/app/layout.tsx:3` importa `@repo/analytics` **sem** `apps/app/package.json` declarar a dependência — funciona por hoisting do pnpm. Falta também `@repo/email` | `apps/app/package.json` | Além do risco de resolução, **o turbo não invalida `app#*` quando `@repo/analytics` muda** — cache mentindo num gate que roda em toda PR |
| 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` sem declarar `@repo/email` | `apps/app/env.ts:1` | O `keys.ts` do pacote **valida de fato no boot** dos 3 apps. `apps/web` e `apps/api` **declaram**; só a `app` não |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido hoje: `client-ui.tsx` **não existe**. Zero importadores, falha em silêncio; o primeiro `import` quebra. **Décima auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps | `packages/auth/package.json:25` | Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | `grep ChartContainer` fora do próprio arquivo ⇒ **0**. `dashboard-home` (#9) é a spec que o resgataria |
| 🟡 **`input-otp.tsx` é código morto**, sem nenhum consumidor fora do barril e do catálogo do `playground` | `packages/design-system/components/ui/input-otp.tsx` | `account-security-mfa` (#10) é a spec que o usaria |
| 🟡 **Dependências de instrumentação instaladas e nunca importadas:** `import-in-the-middle`, `require-in-the-middle` | `apps/app/package.json:26,35` | São as dependências típicas de OTel/Sentry e dão **zero** importações. Hoje é peso morto — e **não** contam como evidência de observabilidade |
| 🟡 **`packages/internationalization/utils/cookies.ts` é inalcançável.** O `package.json` mapeia `"./utils" → "./utils.ts"` (o **arquivo**), então o diretório homônimo nunca é resolvido | `packages/internationalization/utils/cookies.ts` | Os importadores resolvem todos para o arquivo; o `cookies.ts` do diretório é **código morto** |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** — os únicos consumidores são os próprios testes | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:13,20` | A cadeia para levar a espera até a tela está pronta e **para no último metro**: o toast diz "aguarde um instante", sem o número que o servidor mandou. ⚠️ Cuidado com falso positivo ao remedir: há um `retryAfterSeconds` **homônimo de outro tipo** no rate limiter (`apps/api/proxy.ts:88`) |
| ✅ **`reloadCurrentUser` segue sem teste próprio** — quarto ciclo | `packages/auth/client.ts:224-235` | A suíte do `@repo/auth` saiu de 3 arquivos/38 testes para **6/62** com a PR #13, mas os arquivos novos cobrem emulador, não este. A função é exercitada só por mock de outro workspace |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`** | `apps/api/(shared)/repositories/base.repository.ts:102-117` | Depois do primeiro `PUT` o campo deixa de ser `Timestamp` e vira `String`: consulta por range/`orderBy` mistura tipos. **Cruza diretamente com `cursor-pagination` (#3)**. ⚠️ Preservado de propósito em `firestore-admin-access` (migração *contract-preserving*) |
| 🟡 `delete()` herdado por todo repositório é **soft delete** — `delete()` chama `update({ deletedAt })` | `apps/api/(shared)/repositories/base.repository.ts:127-129` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` — e deixa **duas** famílias de objeto órfãs no bucket |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth. O N+1 do Admin SDK está em `:38-40` |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. **Reconferido: seguem órfãs.** A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:63` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts:11,21,63` | A assinatura **é** validada; nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` (#5) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `env.STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts` | `pnpm --filter api dev:with-stripe` **não pode funcionar**. A #11 mostrou o contorno ao redeclarar `FIREBASE_STORAGE_BUCKET` pelo mesmo motivo — mas **a causa raiz segue** |
| ◐ **`skipValidation` faz o t3-env descartar os `extends` — contornado 2× na `apps/api`, ainda aberto na `apps/web`** | `apps/web/env.ts:22,13-16` | Na `apps/web`, `skipValidation: true` é **incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client`, então o CTA "Ir para o painel" da landing cai no fallback. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| 🟡 **Casamento exato de rota no rate limit deixa variações de fora** | `apps/api/proxy.ts:37-47` | Decisão consciente (`startsWith` limitaria `/auth/sign-in/google` duas vezes). ⚠️ **As 3 rotas de `account/` não entraram na lista** — incluindo troca de senha, que é alvo clássico de força bruta. Vale reavaliar |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:189,200` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada** — UTM de campanha, `?plan=`. O próximo fluxo que carregar estado na URL redescobre o mesmo defeito |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | O idioma escolhido **não sobrevive ao fechamento do navegador**. ✅ Verificado hoje: o `x-theme` **não** herdou o defeito |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-77` | ASVS 5.0 L1 (3.3.1) exige `Secure`. O helper grava `x-locale` **e `x-theme`**, não o cookie de sessão |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:16` | Resíduo. **`x-role` (`:15`) NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru; a API o usa como fallback | `packages/sdk/src/client/base.ts:45,53,95` · `auth-request-context.ts:100,119` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada — não é resíduo histórico, é duplicação ativa |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | **Sobreviveu às PRs #11, #12 e #13.** Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder` — em qualquer idioma |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`), `"Início"`, `"Home"` | `LanguageSwitcher.tsx:79` · `PageBreadcrumb.tsx:28,30` · as duas `page.tsx` de home `:7` | Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe. O `"Home"` das homes tem **a chave pronta ao lado**, usada em 5 outras telas |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| ⚪ **Um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `…/entities/(hooks)/useListEntities.tsx:16` · `…/(home)/EntitiesListClient.tsx:23-28` | O hook **devolve** `error`; o componente nunca o lê. Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele. Vale para todo `useList*` no mesmo padrão |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:24-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem. É a home da landing: o caminho mais percorrido do repo |
| 🟡 **`hydration mismatch` num `id` do Radix** | `PanelNavbarControls.tsx` · `Sidebar.tsx` | ⚠️ **Reverificar em execução:** a PR #12 corrigiu a segunda metade na raiz (`hookformSelect.tsx:90`), mas o aviso do Radix pode ter sobrevivido sozinho. Não é verificável por leitura de código |
| ⚪ **A landing `/contact` acusa erros de hidratação** (`<a>` dentro de `<a>`) vindos do `NavigationMenu` | `apps/web/…/components/header/index.tsx:82-88` | Pré-existente, **só** no ramo `item.href`; os subitens estão corretos |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:11,19` | O `apps/app/CLAUDE.md` exige que o hook exporte também a função imperativa no mesmo arquivo. **`useMyAccount.ts` segue o padrão certo** — o desvio é só do antigo |
| 🟡 **`provider-error` não distingue três falhas diferentes** — cota estourada, domínio não verificado e chave revogada produzem o **mesmo** `reason` | `packages/email/index.ts:120-130` | Descartar o objeto de erro é **correto e deliberado** (carrega o endereço do destinatário, e há teste que reprova quem o logar). Mas ninguém distingue "acabou a cota" de "revogaram a chave" sem abrir o painel. **Pertence a [`observability-logging`](observability-logging.md)** (#1) |
| ◐ **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx` · `apps/web/…/contact/components/contact-form-client.tsx` | O form de contato continua sem `<form>`, com botão sem `type="submit"` e campos que não casam com os parâmetros da action **que já existe e tem teste** |
| ◐ **`.env.example` da API promete um desligamento que o código não entrega**, e o comentário se contradiz 2 linhas depois | `apps/api/.env.example:15-18` · `apps/api/env.ts:40-43` | Inalterado. Correção de **uma frase**: dizer que desligar exige esvaziar **as duas** variáveis |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir. A rodada anterior mostrou o efeito na prática: quando `app#test` falhou, `app#typecheck` foi abortado no meio |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito. **Reconferido em 2026-09-16: o documento está honesto**, depois de duas
> correções aplicadas hoje (gate instável e contas de QA).

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | **`main` não tem branch protection.** Remedido hoje: `gh api …/branches/main/protection` → **404**, `rulesets` → `[]`. ✅ **O pré-requisito caiu**: o `testTimeout` está declarado nas 9 configs e o gate fechou 23/23 | `PRE-PRODUCTION.md` ✅ atualizado hoje | **minutos** |
| 2 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados" — com **dois** consumidores. Exige plano **Blaze**, ou seja, cartão | `PRE-PRODUCTION.md` ✅ documentado com runbook | cartão + ~15 min |
| 3 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM — passo de DNS, sem contorno | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 4 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações: virar a chave é barato | `PRE-PRODUCTION.md` | P |
| 5 | **Contas de QA acumuladas: 15.** ✅ **A PR #13 não acrescentou nenhuma** — as contas do ciclo viveram só no emulador e morreram com o processo. Uma das antigas (`qa-account-settings-b@`) segue **inutilizável** (senha não registrada, `sign-in` devolve 500): apagar, não reusar | `PRE-PRODUCTION.md` ✅ atualizado hoje | P |
| 6 | **Branches mergeadas ainda vivas no remoto.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 7 | **O login com Google nunca teve passe manual com conta real.** ⚠️ **A única que continua existindo só aqui.** O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta. Modo de falha silencioso: o popup fecha e nada acontece | *(só neste arquivo)* | ~2 min |
| 8 | **`storage.rules` nunca foi publicado nem exercitado por teste de regra.** Depende da pendência 2 para ser publicado; o teste de regra depende de `@firebase/rules-unit-testing`, que pertence a `e2e-testing` (#8) | `PRE-PRODUCTION.md` | ver #2 |

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada. **Nenhuma ganhou argumento novo nesta rodada.**

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético — não é diferencial de MVP. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. Reavaliar após `observability-logging`. |
| Firebase App Check | — | Explicitamente fora do corte de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. Reavaliar se aparecer abuso que o rate limit por IP não contenha. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado.** O formulário é maquete e a action que ele deveria chamar já existe, funciona e tem teste. Correção pontual de esforço P — vai direto ao `/analyze`. |
| Provedor de e-mail plugável (SES/Postmark) | — | Fora do corte de `transactional-emails`: "só quando algum fork pedir". A spec está arquivada, então reabrir exige spec nova. |
| Rastreio de abertura/clique em e-mail | — | Fora do corte de `transactional-emails`: arrasta discussão de privacidade sem valor para um MVP. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Explicitamente fora do corte de `file-upload-storage`, **arquivada**. O `POST /files` ficou genérico de propósito — estender é acréscimo, não reescrita. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`, arquivada. A exclusão de conta virou [`data-rights-lgpd`](data-rights-lgpd.md) (#6) e as sessões viraram [`account-security-mfa`](account-security-mfa.md) (#10); a **troca de e-mail** continua sem dono — reabrir exige spec nova. |
| **Emular Cloud Storage · testes de security rules · promover admin pela UI** | — | ⚠️ **Novo aqui:** explicitamente fora do corte de `firebase-emulator-seed`, agora **arquivada**. Os testes de rules foram herdados por [`e2e-testing`](e2e-testing.md) (#8), que é onde a suíte faz sentido. Emular Storage e promover admin pelo painel continuam sem dono. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback | 1/10 | Terceirizar é mais racional que manter no core. |
| Referral / afiliados | 0/10 | Nenhuma referência do painel entrega. O mercado resolve com produto de terceiro. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. ✅ **O pré-requisito de estabilidade foi satisfeito nesta rodada** — o gate fechou 23/23 e o `testTimeout` está declarado. Reavaliar agora, junto com o branch protection. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição — e como opt-in por variável ausente, no padrão do `ARCJET_KEY`. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **9** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois, e só em pastas críticas. Relatório por workspace **não soma** — exige consolidação na raiz. Cruza com `e2e-testing` (#8). |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
