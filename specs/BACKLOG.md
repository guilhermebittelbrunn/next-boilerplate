# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-15 (`/spec --sync`, pós-merge da PR #12) · anteriores: 2026-09-14 ·
> 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 ·
> **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`account-settings` fechou e foi arquivada.** PR **#12** mergeada em `main` em 2026-09-15T14:12:48Z
>    (merge commit `a4df5ed`), CI `success` nesse SHA. Os **6 itens do corte** foram reconferidos um a um
>    **no código**, com evidência em `arquivo:linha` marcada na spec arquivada em
>    [`docs/features/account-settings/spec.md`](../docs/features/account-settings/spec.md).
> 2. **⚠️ O `STATE.md` da feature estava atrasado — segunda rodada consecutiva.** As etapas `review` e
>    `test` seguiam gravadas como `in-progress`/`blocked`, e o `updated` do frontmatter (09:53) era
>    **anterior** ao carimbo da própria linha de `review` (11:36). Reconciliado **depois** da verificação no
>    código. Os dois defeitos que a linha de `test` dava como abertos (D-3 e D-4) **estão fechados no
>    código mergeado**, verificado agora e não pelo relato.
> 3. **🔴 O gate não é mais instável em teoria: ele FALHOU.** `pnpm turbo run lint typecheck test --force`
>    rodou **duas vezes** nesta auditoria — a **primeira falhou**. Ver [Gates](#gates--medidos-nesta-auditoria).
>    Mais importante: **o arquivo culpado é um terceiro, novo, e não é nenhum dos dois que a documentação
>    perseguia.**
> 4. **🟢 O achado 🔴 mais citado deste backlog — a janela de revogação de sessão — FOI FECHADO**, e por
>    quem ninguém previu: a própria `account-settings`, que o grafo dizia não ter relação com ele. Ver
>    [Achados](#-segurança).
> 5. **🟢 `docs/PAYMENTS.md` parou de mentir** — corrigido pela PR #12, fora do escopo dela. O achado
>    "documentação que descreve como pronto o que não existe" **morreu**; em compensação, o documento
>    passou a errar na direção oposta em uma linha, e **isso foi corrigido nesta auditoria**.
> 6. **A cadeia de dependências acabou.** Com `account-settings` entregue, `account-security-mfa` e
>    `data-rights-lgpd` destravaram. **Sobrou um único bloqueio em todo o backlog**: `e2e-testing` ←
>    `firebase-emulator-seed` — e é isso que elege o novo #1.
> 7. **Deriva em 11 das 12 specs**, com **4 inversões semânticas** (spec que acusa de errado algo já
>    corrigido). A causa é a de sempre, agravada: a PR #12 **editou as próprias specs no mesmo commit** em
>    que criou o código que as invalida. Elas nasceram desatualizadas.

## Contadores

Sobre as **12 specs que seguem em `specs/`**. Recontados do disco em 2026-09-15, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 11 |
| `approved` | 0 |
| `in-progress` | 0 |
| `done` (arquivadas) | 7 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 4 · `dx` 4 · `confianca` 4 — equilíbrio perfeito pela primeira vez, e por
acidente: a spec entregue era de `produto`. **Por esforço:** P 0 · M 9 · G 3. **Por valor:** alto 9 ·
médio 3 · baixo 0.

**Transições aplicadas nesta rodada: 1** — `account-settings` `proposed` → `done` + arquivada. (O
frontmatter dizia `proposed` mesmo com a feature em execução: a spec nunca foi movida para `in-progress`.
É a **segunda** rodada seguida em que isso acontece — é falha do fluxo, não da auditoria, e o padrão já
merece correção no `/analyze`.) `in-progress` segue em **zero**: não há feature em execução.

## Gates — medidos nesta auditoria

Re-executados agora, com `--force`, não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **508 arquivos · 0 erros** (`No fixes applied`, 658 ms) |
| `pnpm turbo run lint typecheck test --force` (1ª execução) | 🔴 **FALHOU** — 21/23 tasks, `app#test` |
| `pnpm turbo run lint typecheck test --force` (2ª execução) | ✅ **23/23, 0 cached** — **1 m 8,8 s** |
| `pnpm test` (raiz — é o que gateia o `turbo build`) | ✅ **9 workspaces · 88 arquivos · 860 testes** (24 s) |

| workspace | arquivos | testes | Δ vs. 2026-09-14 |
|-----------|---------:|-------:|------------------|
| `api` | 30 | 315 | +5 arquivos · **+47** |
| `app` | 36 | 262 | +8 arquivos · **+54** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 3 | 38 | +1 arquivo · **+9** |
| `@repo/security` | 3 | 31 | — |
| `web` | 4 | 27 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/shared` | 1 | 15 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **88** | **860** | **+14 arquivos · +110 testes** |

CI: a execução do merge da PR #12 no SHA `a4df5ed` está **`success`**, assim como as 11 anteriores
listadas. **Nenhum commit do repo está fora de `main`**: `HEAD` da branch `madison` é `a4df5ed`.

### 🔴 O gate instável deixou de ser previsão — ele falhou, e o culpado é um terceiro arquivo

Este é o achado mais importante da rodada, e ele **invalida a forma como o risco vinha sendo descrito**.

**A falha, medida:**

```
FAIL __tests__/accountSecurityForm.test.tsx
  > AccountSecurityForm — sair de todos os dispositivos
  > só encerra as sessões depois da confirmação no diálogo
  Error: Test timed out in 5000ms.
```

| medição | resultado |
|---------|-----------|
| gate completo, 1ª execução | 🔴 **falhou** (`app#test`) |
| gate completo, 2ª execução | ✅ passou, 1 m 8,8 s |
| **taxa de falha observada** | **1 em 2** |
| o mesmo teste, isolado (3×) | **390 ms · 986 ms · 515 ms** |
| o arquivo, isolado (3×) | 935 ms · 2755 ms · 1471 ms |
| o arquivo, sob contenção (2ª execução) | **7401 ms** |

**Três correções à narrativa anterior:**

1. **Não são "aqueles dois arquivos".** Toda a discussão até aqui tratou dos dois
   `securityPolicySources.test.ts`. Quem estourou foi
   **`apps/app/__tests__/accountSecurityForm.test.tsx`**, um teste de **componente**, criado pela PR #12.
   Na 2ª execução os três mediram, como arquivo: `securityPolicySources` (`app`) **7628 ms**,
   `accountSecurityForm` **7401 ms**, `securityPolicySources` (`web`) **2249 ms**.
2. **A causa é estrutural, não "estes testes são lentos".** As **9** configs de Vitest seguem **sem
   `testTimeout`** (`grep -rl testTimeout --include=vitest.config.* .` ⇒ **0**, remedido hoje), então toda
   a suíte corre contra 5 s **medidos sob contenção do turbo**. Sob contenção o custo sobe de **3× a 8×**.
   Qualquer teste de interação nasce na faixa de risco.
3. **O risco é crescente e o gatilho é o sucesso.** Foram **+110 testes** nesta entrega. A cada PR que
   acrescenta teste de componente, a probabilidade de falha aleatória sobe. O `PRE-PRODUCTION.md` foi
   corrigido hoje para refletir isso.

> **Consequência prática:** declarar `testTimeout` nas 9 configs é correção de **minutos** e é
> **pré-requisito do branch protection** (`gh api …/branches/main/protection` ⇒ **404**, rulesets ⇒ `[]`,
> remedido hoje). Ligar o gate obrigatório antes disso é comprar merge bloqueado ao acaso — e o runner do
> GitHub é mais lento que uma máquina local. **Não é spec, é achado**: vai direto ao `/analyze`.

## Ordem recomendada

Respeita `depends_on` (medido do frontmatter nesta rodada) e prioriza o que **desbloqueia** e o que **fica
mais caro depois**.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | **Herda o topo pelo mesmo critério estrutural que elegeu os dois #1 anteriores: é a única spec elegível que desbloqueia outra.** Com a cadeia de `account-settings` encerrada, restou **um único bloqueio em todo o backlog** — `e2e-testing` ← esta. Nona auditoria consecutiva com o mesmo veredito de inventário: `firebase.json` **sem bloco `emulators`**, `firebase-tools` não é dependência de ninguém, `grep -i emulator` em código = **0**. E o argumento **cresceu com a entrega de ontem**: são **860 testes rodando a cada PR e nenhum toca o banco ou as rules**, enquanto há **duas** rules files sem um único teste — `firestore.rules` (deny-all publicado e em vigor) e `storage.rules`, que **nunca foi exercitado nem publicado**. O boilerplate acabou de ganhar auto-serviço de conta (perfil, senha, avatar, revogação de sessão) e **nenhuma dessas escritas tem cobertura contra as regras que deveriam protegê-las**. **0 de 5.** |
| 2 | [`observability-logging`](observability-logging.md) | Segurou o #2 e **ganhou a melhor evidência que já teve — uma previsão da própria spec se cumprindo literalmente.** A PR #12 criou `account-avatar.ts:44`, que é um **clone textual** de `entity-photo.ts:61`: mesmo caminho raro (assinar URL), mesma degradação (fica só o prefixo). Placar remedido: **4 conformes · 3 semiconformes · 1 não-conforme**, 8 pontos. Isso eleva a tese de "a convenção se degrada na borda" para "**a degradação se copia junto com o código**" — que é falsificável e foi confirmada. Soma-se: as 3 rotas novas de conta não emitem **nenhum** log, incluindo troca de senha e revogação de sessão. `depends_on` vazio. |
| 3 | [`cookie-consent`](cookie-consent.md) | **Segue a única spec do backlog com violação ativa, não com ausência de recurso:** `packages/analytics/provider.tsx:15` monta o Vercel Analytics **incondicionalmente** e `:16` o GA checando só a env — zero consentimento, sobre todo o app. `grep -rniE "consent|cookie-?banner"` = **0**. **E o escopo cresceu de forma mensurável:** o inventário de cookies passou de **2 para 6 nomes** (o `x-theme` novo, mais os 3 `bp:*` que ninguém tinha contado) — um banner por categoria que declare só dois **nasce mentindo**. Em compensação, a PR #12 entregou de graça o **padrão de referência** para não piscar: ler o cookie no servidor e aplicar no `<html>`. `depends_on` vazio. |
| 4 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira": `base.repository.ts:36-49` faz `.get()` sem `limit`/`orderBy`/`startAfter`; **nenhum** dos 9 métodos do `BaseRepository` aceita parâmetro de consulta. É a spec com o argumento mais forte de **"fica mais caro depois"** do conjunto: corrigir após haver dados em produção muda contrato do SDK, DTO, hooks e índices ao mesmo tempo. Cruza com a dívida do `update()` (achados), que precisa de `orderBy` estável em `createdAt`. |
| 5 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem — o switch é 100% client-side (`panelStore.ts:76-90`, **sem uma chamada de API**; reconferido: zero `fetch`/`await`/`apiClient` no arquivo). **A PR #12 alargou a lacuna no pior lugar possível:** são **18 handlers de escrita**, **zero** com trilha, e os três novos são `PUT /account`, `POST /account/password` e **`POST /account/sessions/revoke`** — revogação de sessão é o evento que toda norma de trilha cita nominalmente. Hoje não dá para saber se quem derrubou as sessões foi o dono ou quem tomou a conta dele. **0 de 5.** |
| 6 | [`data-rights-lgpd`](data-rights-lgpd.md) | 🔓 **Destravada nesta rodada.** Obrigação legal com prazo, e **ficou mais cara de novo**: os call sites de `deleteObjectQuietly` passaram de **1 para 2** (`entities/[id]/route.ts:90` e `account/route.ts:158`), ambos de **troca**, nenhum de expurgo — então agora são **duas famílias de objeto por titular** que ficam órfãs ao excluir a conta. Em contrapartida **ficou mais barata de construir**: a área de conta existe, com aba, guard e copy prontos; a spec deixou de inaugurar superfície. Esforço **G** é o que a segura fora do topo. |
| 7 | [`billing-subscription`](billing-subscription.md) | Monetização é o maior valor bruto do backlog e continua em **0/6**: nenhuma rota sob `payments/` (o diretório não existe), `UserDTO` sem `subscription` nem `stripeCustomerId`, webhook com dois handlers `// TODO`. **O escopo encolheu duas vezes nesta rodada:** `docs/PAYMENTS.md` foi corrigido (a correção da doc **sai** da entrega) e a aba `/account?tab=billing` **já existe**, com placeholder traduzido — é preencher, não criar. **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote, e é esta spec que faria alguém importar. |
| 8 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze` — o item 2 do corte ficou oco.** A spec propunha um fluxo que coleta **nome de exibição e idioma**; a PR #12 passou a coletar exatamente esses dois dados na área de conta. O que sobra é o **"quando"** (o produto pedir antes de deixar entrar), não o "o quê" — diferença real de ativação, mas item muito menor. Piorou também o custo: `postLoginNavigation.ts` deixou de ter ponto único de decisão (agora são 3 funções, mais um 4º caminho em `packages/auth/provider.tsx`). `grep -rin onboarding` segue em **1 ocorrência, e é um endereço de sandbox do Resend num fixture**. |
| 9 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são **11 linhas** e o literal `"Home"` — e a chave de dicionário **já existe** e é usada em 5 breadcrumbs. É a primeira tela de todo fork, e resgataria o `chart.tsx` (dependência `recharts` paga e nunca renderizada). Spec mais "presa" do conjunto elegível (ver lotes). |
| 10 | [`account-security-mfa`](account-security-mfa.md) | 🔓 **Destravada — e encolheu sozinha.** O **item 1 foi entregue** pela `account-settings` (ver Achados), e o **item 3 saiu pela metade**: já existe "sair de todos os dispositivos" explícito, falta granularidade. O que resta é MFA (3/10 de prevalência), visibilidade de sessões (1/10) e política de senha — esta última **piorou**: a PR #12 replicou o `MIN_PASSWORD_LENGTH = 6` num segundo schema. `value: médio` por mérito próprio. |
| 11 | [`e2e-testing`](e2e-testing.md) | 🔒 Bloqueada por #1, o **único** bloqueio restante do backlog. Zero `playwright`/`cypress`/`axe`/`puppeteer` em **qualquer** `package.json`, e **nenhuma** das 9 configs declara cobertura. **O argumento ficou muito mais forte nesta rodada — e não por hipótese:** o gate **falhou de verdade**, 1 em 2 execuções. |
| 12 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora há **vinte e quatro dias**, e o custo **mais que dobrou nesta rodada**. Ver [a decisão que não pode esperar a fila](#a-decisão-que-não-pode-esperar-a-fila). |

### O que **não** foi escolhido para #1, e por quê

- **`observability-logging`** ficou em 2º e foi a decisão mais difícil da rodada — a margem é **fina**.
  Ela tem `depends_on` vazio, esforço M, valor alto e ganhou nesta rodada a melhor evidência do backlog
  (uma previsão sua se cumprindo literalmente, no clone de `account-avatar.ts:44`). **Perdeu por um
  critério só: não desbloqueia ninguém.** O custo de adiá-la é linear e mensurável — uma variação de log
  por entrega, e esta rodada produziu exatamente uma. O de adiar `firebase-emulator-seed` é a única
  dependência viva do backlog continuar parada. *Se você discorda desse peso, esta é a troca a fazer
  conscientemente — as duas são defensáveis.*
- **`cookie-consent`** é a única com violação legal **em curso**, e pela quarta rodada não foi ao topo:
  destrava zero specs, e a exposição real de um boilerplate sem usuários é baixa. **Se o primeiro fork for
  a público antes de o #1 sair, esta ordem se inverte** — é a troca a fazer de propósito, não por acidente.
- **`data-rights-lgpd`** acabou de destravar e tem **prazo legal**, o argumento mais duro do backlog. Não
  foi ao topo por **esforço G**, que é má escolha para uma rodada autônoma do `/cycle`, e porque sua
  principal armadilha (objetos órfãos) exige uma varredura por prefixo de dono que fica mais fácil de
  escrever **com emulador**, ou seja, depois do #1.
- **`account-security-mfa`** destravou e **não** subiu: o item que a tornava urgente — a janela de
  revogação — já foi entregue. O que restou é 3/10 e 1/10 de prevalência, com `value: médio`.

## Lotes paralelos

Para rodar o ciclo completo em 2–4 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-15** a
partir do `contends_on` de cada spec, pelo algoritmo escrito em
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis nesta rodada: 10 de 12** — contra 9 de 13 na anterior. Ficaram de fora apenas
`teams-organizations` (`deferred`) e `e2e-testing` (`depends_on` não satisfeito). **É a maior proporção de
elegíveis que este backlog já teve**, e a razão é direta: a cadeia de dependências acabou.

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `firebase-emulator-seed` · `observability-logging` · `cookie-consent` | `firebase.json` + `package.json` da raiz + `packages/auth/server.ts` · instrumentação + proxy da API + webhook de pagamento · provedor de analytics + os dois `layout.tsx` + barril de UI | três territórios disjuntos: **infra local**, **borda da API** e **camada de apresentação/analytics**. Nenhum arquivo em comum |
| **2** | `cursor-pagination` · `billing-subscription` · `account-security-mfa` | `base.repository.ts` + `entity.repository.ts` + `table.tsx` + índices + ação `entity` do SDK · webhook + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` · `packages/auth/*` + `resolve-api-actor.ts` | **slice `entity` paginado**, **slice `user` cobrado** e **camada de sessão**. Repositórios, tipos e pacotes diferentes |
| **3** | `audit-log` · `onboarding-flow` | `base.repository.ts` + `users/[id]` + índices + barril do SDK + `queryKeys.ts` · `apps/app/proxy.ts` + resolvedor pós-login + `user-merge.ts` + `UserDTO` | uma é **escrita de trilha na API**, a outra é **desvio de navegação no app**. Encostam no `user` por caminhos distintos (`users/[id]/route.ts` × `user-merge.ts`) |
| **4** | `data-rights-lgpd` | `base.repository.ts` + `packages/auth/server.ts` + índices | sozinha — ver abaixo |
| **5** | `dashboard-home` | as duas `page.tsx` de home + `queryKeys.ts` + índices | sozinha — ver abaixo |

### Por que cada spec ficou de fora do lote 1

Distinguir os dois motivos importa: colisão é **dado**, teto é **decisão**.

- **`cursor-pagination`, `audit-log`, `billing-subscription`, `onboarding-flow`, `dashboard-home`,
  `data-rights-lgpd`, `account-security-mfa` — nenhuma colide com o lote 1.** Repito porque é incomum:
  **zero** das sete tem colisão com as três do lote 1. Todas ficaram de fora **só pelo teto de 3**, que é
  escolha de custo de revisão, não impedimento técnico. Se você tiver fôlego para revisar 4 features
  amanhã, a de melhor posição na ordem é `cursor-pagination`.
- **A exceção parcial é `data-rights-lgpd`**, que toca `packages/auth/server.ts` — o mesmo arquivo de
  `firebase-emulator-seed`. Ela colidiria se entrasse no lote 1, e é o único par com colisão real
  envolvendo o lote 1.

E o que separa os lotes 2 a 5 entre si:

- **`audit-log` não entra com `cursor-pagination`:** as duas alteram
  `apps/api/(shared)/repositories/base.repository.ts` — uma para ensiná-lo a paginar, a outra para tornar a
  trilha somente-adição — **e** as duas alteram `firestore.indexes.json`. Duas colisões, não uma.
- **`data-rights-lgpd` não entra com `cursor-pagination` nem com `audit-log`:** disputa `base.repository.ts`
  e `firestore.indexes.json` com as duas. É o preço de ser a spec que precisa mexer no `delete()` herdado.
- **`onboarding-flow` não entra com `billing-subscription`:** as duas alteram
  `packages/sdk/src/types/user/user.ts` — uma acrescenta o estado de onboarding ao `UserDTO`, a outra os
  campos de assinatura.
- **`dashboard-home` fica por último e sozinha:** disputa `firestore.indexes.json` com `cursor-pagination`,
  `audit-log` e `data-rights-lgpd`, e `apps/app/shared/lib/queryKeys.ts` com `audit-log`. É a spec mais
  "presa" do conjunto elegível, apesar de `depends_on: []` — bom exemplo de que "sem dependência" não
  significa "pode rodar a qualquer momento".

**O arquivo mais disputado do repositório é `firestore.indexes.json`**, citado por **5** das 12 specs
(`audit-log`, `cursor-pagination`, `dashboard-home`, `data-rights-lgpd`, `teams-organizations`). Em
seguida, empatados com 3: `apps/api/(shared)/repositories/base.repository.ts`, `packages/auth/server.ts` e
`packages/sdk/src/client/index.ts`. **`packages/sdk/src/types/user/user.ts` caiu de 3 para 2 disputantes**
com a saída de `account-settings` — o slice `user` desafogou.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra: duas features ainda podem brigar num arquivo que nenhuma das duas antecipou.

A régua desta rodada, com `account-settings` entregue como amostra: ela declarava **4** arquivos em
`contends_on`, e **acertou os 4** — `routes.tsx`, `paths.ts`, `user.ts` e `user.repository.ts` foram todos
alterados. Mas a PR tocou também `packages/auth/server.ts`, `packages/auth/provider.tsx`,
`packages/design-system/.../hookformSelect.tsx`, `apps/app/app/layout.tsx` e `docs/PAYMENTS.md` — **nenhum
previsto**, e dois deles (`server.ts` e `layout.tsx`) são `contends_on` declarado de **outras** specs do
backlog (`account-security-mfa`, `firebase-emulator-seed`, `data-rights-lgpd`, `cookie-consent`).

**Ou seja: a colisão prevista aconteceu, e uma colisão não prevista também.** Se dois workspaces do mesmo
lote tocarem o mesmo arquivo por acidente, **isso é achado de auditoria** — corrija o `contends_on` das duas
specs na rodada seguinte, em vez de tratar como azar.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-15 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ `ci-pipeline` entregue · 🔒 `firebase-emulator-seed` — **o único bloqueio vivo do backlog inteiro** |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | 🔓 **destravadas nesta rodada** (PR #12, `a4df5ed`) |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) · [`firebase-emulator-seed`](firebase-emulator-seed.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`cookie-consent`](cookie-consent.md) · [`dashboard-home`](dashboard-home.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |

> **O grafo deixou de ser mais restritivo que a realidade — pela primeira vez em cinco rodadas.** A nota
> que ocupava este espaço dizia que o item 1 de `account-security-mfa` não dependia de `account-settings` e
> podia ser tarefa direta. **Estava certa no mérito e errada no prognóstico:** o item foi entregue *pela
> própria* `account-settings`, como efeito colateral de precisar que "sair de todos os dispositivos"
> funcionasse. Fica o aprendizado, que vale para a próxima priorização: **um item bloqueado por dependência
> declarada pode ser resolvido pela dependência**, sem que ninguém o ataque de frente.

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
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | ✅ `ci-pipeline` · 🔒 `firebase-emulator-seed` |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | Emulador do Firebase, seed e primeiro admin | dx | alto | M | `proposed` | ✅ `firestore-admin-access` |
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
| `account-settings` | 2026-09-15 | [`docs/features/account-settings/spec.md`](../docs/features/account-settings/spec.md) — **6/6 do corte**, conferidos um a um no código (PR #12, `a4df5ed`, CI verde). ⚠️ O caminho feliz do **avatar** segue não verificado contra infra real (Cloud Storage desativado); o que foi exercido é o **modo degradado** |

**Verificado nesta rodada:** `docs/features/` tem **9** pastas e **7** `spec.md` arquivados. Não houve
colisão no `git mv` (`docs/features/account-settings/spec.md` não existia), e o `STATE.md` daquela feature
**já trazia** `spec: account-settings` (`:5`) — não foi preciso acrescentar. Os frontmatters das 7
arquivadas estão coerentes (`status: done`, `feature: <slug>`) e **não há duplicata** em `specs/`.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
aqui, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### ⚠️ O que a PR #12 entregou **além** do corte

Registrado porque quem ler o diff vai estranhar. Além dos 6 itens do corte, a PR trouxe **três correções de
raiz que não estavam na spec** — e as três valem para todo fork:

1. **`hookformSelect.tsx:90`** — o componente compartilhado deixou de aceitar o valor vazio que o primitivo
   emite antes de montar as opções. O sintoma apareceu num formulário; a correção foi no componente.
2. **`packages/auth/server.ts:138-151`** — a revogação de sessão passou a valer para o bearer ID token.
   **Isto fechou o achado 🔴 mais antigo deste backlog** (ver Achados).
3. **`docs/PAYMENTS.md`** — reescrito para parar de descrever como pronto o que não existe.

**Nada disso é deriva de implementação** — o corte foi entregue exatamente como especificado. É **escopo
adicional**, carona numa PR de produto. A leitura útil, e ela se repete pela segunda PR seguida: **uma
entrega de produto está consertando, de passagem, achados que o backlog vinha listando como pendentes há
rodadas.** Isso é bom, e tem um custo: os achados morrem sem que ninguém os marque como mortos, e a
auditoria descobre tarde.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 860 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-15 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PAYMENTS.md:5-28` | "Estado atual (medido em 2026-09-14)" — não há fluxo de assinatura; handlers são stubs; sem persistência, rotas, SDK ou UI | **10 das 11 afirmações conferem.** O documento foi **reescrito pela PR #12** e adotou o formato de "afirmação + data de medição" | 🟢 **corrigido — o achado 🔴 de 3 rodadas morreu** |
| `docs/PAYMENTS.md:23` | "Nenhuma UI de assinatura na `apps/app`, e **nenhum modo `subscription`**" | **as duas metades eram falsas.** A aba `/account?tab=billing` existe (`AccountTabs.tsx:23,76-77`) e o modo `subscription` é o **padrão** (`product-mode.ts:12,14,23`) | 🟢 **corrigido hoje** — o documento errou na direção **oposta** à de sempre: afirmou ausência onde havia presença |
| `docs/PRE-PRODUCTION.md` (gate instável) | isolados 225–278 ms; sob contenção 1768/1296 ms; pior caso 4033 ms | **subdimensionado, e o arquivo nomeado é o errado.** O gate **falhou**, 1 em 2 execuções, num **terceiro** arquivo (`accountSecurityForm.test.tsx`) | 🟢 **corrigido hoje** com a medição real e a taxa de falha |
| `docs/PRE-PRODUCTION.md` (contas de QA) | 8 contas listadas | **faltavam 7** — as 2 da PR #11 e **5 da PR #12** (`rv-a@`, `rv-b@`, `qa-account-settings-a@`, `qa-account-settings-b@`, `qa-account-settings-b2@`) | 🟢 **corrigido hoje**; ver a nota de processo lá |
| `docs/PRE-PRODUCTION.md:19-52` (rules do Firestore) | "publicado e em vigor" | **confere.** O `deny-all` de `firestore.rules:32-33` está no disco | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md` (Cloud Storage) | serviço **não** ativado; comportamento degradado no código | **confere.** A PR #12 acrescentou corretamente o segundo consumidor (foto de perfil) à tabela | ✅ **honesto** |
| `docs/SECURITY.md` | postura de segurança (rules, CSP, COOP, rate limit, URL assinada) | **17 afirmações conferidas, 17 batem.** Uma imprecisão menor: `form-action` é `'self'` nos front-ends mas `'none'` na `apps/api` — **mais restrito** que o documentado | ✅ **honesto** |

> **Nota de método, quarta rodada consecutiva:** todas essas contradições só apareceram por **medição
> direta** contra o código, nunca por leitura. `PRE-PRODUCTION.md` e `SECURITY.md` **adotaram** o formato
> "afirmação + data" e é por isso que passam limpo; `PAYMENTS.md` **acabou de adotá-lo** e saiu do vermelho
> na mesma rodada. **A hipótese está confirmada:** o formato previne a mentira, e é barato.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **11 das 12 specs**. **Nenhuma é de implementação divergente**: o corte de
`account-settings` foi entregue como especificado. A causa é a de sempre, com um agravante novo e
específico:

> **A PR #12 editou as próprias specs no mesmo commit em que criou o código que as invalida.** As specs
> foram sincronizadas contra o estado **pré-#12** e mergeadas junto com a entrega. Elas nasceram
> desatualizadas — não envelheceram, já saíram velhas. **Isso é problema de processo**: a sincronização do
> backlog não pode acontecer *antes* do último commit de código da mesma PR.

### As 4 inversões semânticas (a spec acusava de errado algo já corrigido)

Estas são as graves, porque quem segue a referência lê **o contrário** do que a spec afirma. Todas
corrigidas no disco:

| id | a spec afirmava | realidade | ação |
|----|----------------|-----------|------|
| [`account-security-mfa`](account-security-mfa.md) | duas seções inteiras, no presente: "um ID token já emitido continua passando no guard da API"; "a vítima redefine a senha e o token do atacante continua válido por até uma hora" | **falso desde `a4df5ed`.** `isMintedBeforeRevocation` (`server.ts:138-151`) é aplicada em `:167`. O `[x]` do item 1 já dizia isso e **contradizia o próprio corpo da spec** | ✅ reescrita; histórico preservado como aprendizado |
| [`billing-subscription`](billing-subscription.md) | 7 ponteiros para `docs/PAYMENTS.md:5-12` provando que a doc mente; "corrigir a doc faz parte desta entrega" | a doc **foi corrigida** pela PR #12; as linhas hoje afirmam o oposto | ✅ reescrita: a correção da doc **saiu** do escopo |
| [`billing-subscription`](billing-subscription.md) | "`Billing` é `url: "#"` (`routes.tsx:73-76`)" | o arquivo tem **59 linhas** (a 73 não existe) e `:52-53` aponta para `/account?tab=billing` | ✅ corrigida: é **preencher** o placeholder, não criar a entrada |
| [`data-rights-lgpd`](data-rights-lgpd.md) | "**Não existe área de conta**" | existe, com 10 arquivos e 4 abas | ✅ reescrita — e a spec **ficou mais barata**: as duas ações têm onde morar |

### As afirmações de inventário que morreram

| id | afirmava | realidade | ação |
|----|----------|-----------|------|
| [`observability-logging`](observability-logging.md) | 7 pontos de log, placar 4/2/1 | **8** pontos, **4/3/1** — `account-avatar.ts:44` é clone literal de `entity-photo.ts:61`. E `console.*` cru é **26 chamadas em 18 arquivos**, não os 4 citados | ✅ corrigida — o argumento **ficou mais forte** |
| [`cookie-consent`](cookie-consent.md) | `layout.tsx:39`; "2 cookies relevantes" | `:63-70`; **6 nomes de cookie** (`x-theme` novo + 3 `bp:*`) | ✅ corrigida; muda o corte do banner por categoria |
| [`teams-organizations`](teams-organizations.md) | predicado de posse copiado **4×** em 1 recurso | **9 sítios em 3 recursos** — e a "correção" da rodada anterior (`:65`) também estava errada: é `:67`, e há uma segunda em `:86` | ✅ corrigida, com a série temporal 3→4→9 |
| [`dashboard-home`](dashboard-home.md) | 5 hooks; 15 rotas; chave `home` em 8 breadcrumbs | **6** hooks, **18** rotas, **5** breadcrumbs (3 dos 8 usam outra chave, do painel admin) | ✅ corrigida; registrado que o número morre todo ciclo |
| [`e2e-testing`](e2e-testing.md) | 750 testes em 74 arquivos | **860 em 88** | ✅ corrigida, incl. o recorte por workspace |
| [`data-rights-lgpd`](data-rights-lgpd.md) | `deleteObjectQuietly` com **1** call site | **2** (`entities/[id]/route.ts:90`, `account/route.ts:158`) | ✅ corrigida — o trabalho de expurgo **dobrou** |
| [`billing-subscription`](billing-subscription.md) | SDK com 5 actions; 15 rotas; `UserDTO:7-14` | **6** actions (`:13-18`), **18** rotas, `UserDTO:12-22` | ✅ corrigida |
| [`onboarding-flow`](onboarding-flow.md) | `postLoginNavigation.ts:31` é o **único** ponto de decisão | o arquivo foi reescrito: **3 funções** + um 4º caminho em `packages/auth/provider.tsx`. As refs `:31` e `:24` caíram dentro de uma função que nem existia | ✅ corrigida — e o **item 2 do corte ficou oco** (ver #8 da ordem) |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | "668 testes"; "`seed` não aparece em código" | **860**; `seedThemeIfUnset` existe (`themePreference.ts:41`) | ✅ corrigida |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) | — | `audit-log`: **24/24 referências exatas**, a única com integridade perfeita — mas o **inventário** envelheceu (3 rotas de escrita novas). `cursor-pagination`: 1 âncora deslocada (`:25`→`:20-22`) | ✅ remedidas |

**Nenhuma regressão detectada** nas capacidades das 7 specs arquivadas.

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação: retrofitar escopo por
organização é **reescrita, não refactor** (6/10 de prevalência, esforço G).

**Decidido em 2026-08-22:** `deferred` — adiar a implementação, **não** a decisão. O que torna o adiamento
honesto são duas contrapartidas de esforço P que **não dependem desta spec**:

1. escrever em `docs/ARCHITECTURE.md` se este core é **B2B ou B2C por padrão** — remedido hoje:
   `grep -ciE "b2b|b2c|organiza" docs/ARCHITECTURE.md` retorna **0**;
2. concentrar o predicado de posse num ponto único de escopo — remedido hoje: são **9 sítios em 3
   recursos**.

**Nenhuma das duas foi feita até 2026-09-15** — os juros correm há **vinte e quatro dias**, e a curva ficou
explícita nesta rodada:

| rodada | sítios do predicado | recursos |
|--------|--------------------:|---------:|
| até a PR #10 | 3 | 1 |
| PR #11 | 4 | 1 |
| **PR #12** | **9** | **3** |

**Triplicou em dois ciclos, sem que ninguém decidisse nada a respeito** — e o novo par
(`account/route.ts:41,154`) mora numa camada onde o retrofit não é `find & replace`: caminho de objeto no
bucket + regra de storage. Cada recurso novo que aceita upload acrescenta **2 sítios em 2 camadas**. O
`depends_on` desta spec segue satisfeito, o que não muda o `deferred`, mas remove o último argumento
técnico para adiar de novo.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados na descoberta e nos pipelines. **Não são funcionalidades** — são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-15.** Os achados da rodada anterior foram reconferidos **um a um** no código.
> **Placar: 3 corrigidos (2 pela PR #12, 1 por esta auditoria) · 1 agravado · o restante segue · 4 novos.**
> Padrão que se repete pela **quarta** rodada: **a PR #12 não tocou nenhum `package.json`**, então toda a
> família de dependências não declaradas e exports quebrados segue **intacta**.

### ✅ Fechados nesta rodada

| achado | onde | evidência |
|--------|------|-----------|
| 🟢 **A janela de revogação de sessão — o achado 🔴 mais antigo e mais citado deste backlog.** Revogar sessão não derrubava o ID token; a vítima trocava a senha e o token do atacante seguia válido por até uma hora | `packages/auth/server.ts:138-151`, aplicado em `:167` | `isMintedBeforeRevocation` recusa o token quando `decodedToken.auth_time < user.tokensValidAfterTime`. O `UserRecord` já estava carregado, então **não custa round trip extra**. Coberto por 9 casos em `serverSessionRevocation.test.ts`. ⚠️ **A armadilha de conferência sobreviveu:** `grep -n checkRevoked packages/auth/server.ts` devolve **uma linha, a `:226`, e ela é comentário** sobre o caminho do **cookie**. A checagem do bearer não usa essa palavra |
| 🟢 **`docs/PAYMENTS.md` descrevia como pronto o que não existe** — 5 de 6 bullets falsos, por 3 rodadas | `docs/PAYMENTS.md:5-28` | Reescrito pela PR #12, **fora do escopo dela**. Hoje traz "Estado atual (medido em …)" e um bloco explícito "O que NÃO existe (e que versões anteriores deste documento afirmavam existir)" |
| 🟢 **`docs/PAYMENTS.md:23` errava na direção oposta** — afirmava que não há UI de assinatura *nem modo `subscription`*; as duas metades falsas | `docs/PAYMENTS.md:23` | **Corrigido por esta auditoria.** A aba `/account?tab=billing` existe (`AccountTabs.tsx:23,76-77`) e `subscription` é o modo **padrão** (`product-mode.ts:14`) |

### 🔴 Novos — o gate

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **O gate de teste FALHOU, 1 em 2 execuções — e o arquivo culpado é um terceiro, novo.** `accountSecurityForm.test.tsx > "só encerra as sessões depois da confirmação no diálogo"` estourou os 5000 ms do default | `apps/app/__tests__/accountSecurityForm.test.tsx` · as 9 `vitest.config.mts` | Isolado, o teste leva **390–986 ms**; sob contenção, o arquivo vai a **7401 ms**. **Nenhuma das 9 configs declara `testTimeout`** — logo, toda a suíte corre contra 5 s medidos sob contenção, e cada PR que acrescenta teste de interação aumenta a chance de falha aleatória (**+110 testes** só nesta entrega). **É pré-requisito formal do branch protection** e correção de **minutos**. Ver [Gates](#-o-gate-instável-deixou-de-ser-previsão--ele-falhou-e-o-culpado-é-um-terceiro-arquivo) |

### 🆕 Novos — os demais

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Duas rotas de navegação pós-login concorrentes, e a do pacote não projeta preferências.** `resolvePostLoginPath` retorna em `:87` quando há `?redirect=`, **sem** projetar tema/idioma; quem projeta nesse caso é o resolvedor da `apps/app` | `packages/auth/provider.tsx:80-94,204` · `apps/app/shared/lib/postLoginNavigation.ts:121` | O contrato do pacote está escrito (`provider.tsx:54-55`: só resolve "quando não há `redirect`"), então **não é bug** — mas são **dois caminhos vivos** para o mesmo fato, e o do pacote é o que **todo fork herda**. `onboarding-flow` (#8) vai ter de decidir se intercepta nos dois |
| 🟡 **A convenção de log se degradou por cópia literal.** `account-avatar.ts:44` é clone de `entity-photo.ts:61`: prefixo certo, mensagem livre, sem `chave=valor`, sem identificador do registro | `apps/api/(shared)/lib/account-avatar.ts:44` | Confirma a previsão que a própria spec de observabilidade tinha escrito. Placar **4/3/1** em 8 pontos. Argumento de [`observability-logging`](observability-logging.md) (#2) |
| 🟡 **Três rotas de escrita sensível novas, nenhuma com trilha** — incluindo **revogação de sessão** | `apps/api/app/(routes)/account/{route,password/route,sessions/revoke/route}.ts` | São **18 handlers de escrita** no repo e **zero** gravam evento. Revogação de sessão é o caso de escola da auditoria: hoje não dá para distinguir se quem derrubou as sessões foi o dono ou quem tomou a conta. Entra no inventário de [`audit-log`](audit-log.md) (#5) |
| 🟡 **O mínimo de senha fraco foi replicado, não elevado.** `MIN_PASSWORD_LENGTH = 6` agora existe em **dois** schemas | `…/sign-up/validations/signUpSchema.ts:6` · `…/account/(validations)/accountFormSchema.ts:9` | A PR #12 teve a oportunidade de centralizar a regra de senha (a spec de recuperação já tinha um schema testado) e em vez disso copiou o número. Item 4 de [`account-security-mfa`](account-security-mfa.md) (#10) |

### ◐ Agravados

| achado | onde | situação |
|--------|------|----------|
| ◐ **Objetos órfãos no bucket: o problema dobrou.** `deleteObjectQuietly` tem **2** call sites em produção, ambos de **troca**, nenhum de expurgo | `apps/api/app/(routes)/entities/[id]/route.ts:90` · `apps/api/app/(routes)/account/route.ts:158` | Agora são **duas famílias de objeto por titular** (foto de entidade + avatar). Apagar um registro — ou uma conta — deixa arquivo pago no bucket do fork, e o `delete` herdado é **soft delete**, então nem uma varredura por "documentos sem dono" acharia. Pertence a [`data-rights-lgpd`](data-rights-lgpd.md) (#6), que ganhou mais um motivo concreto |
| ◐ **`.env.example` da API promete um desligamento que o código não entrega**, e o comentário se contradiz 2 linhas depois | `apps/api/.env.example:15-18` · `apps/api/env.ts:40-43` | Inalterado. Correção de **uma frase**: dizer que desligar exige esvaziar **as duas** variáveis |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#7) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` não tem `exports` |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar muito pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o **primeiro import do `apps/api/proxy.ts`** — o middleware, que roda em toda requisição | `packages/security/index.ts:11` · `packages/security/keys.ts:9-15` | `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança **dentro do grafo de módulos do middleware**: toda requisição falha, sem sinal no boot — e `instrumentation.ts:23-27`, que só checa presença, **não avisaria** |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança (`:18`) e **não há `process.exit` em nenhum lugar do arquivo** | `apps/api/instrumentation.ts:17-21` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. **Documentado** em `docs/PRE-PRODUCTION.md`, não corrigido |

### 🟡 Dependências, exports e código morto — **intactos** (a #12 não tocou nenhum `package.json`)

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `apps/app/app/layout.tsx:3` importa `@repo/analytics` **sem** `apps/app/package.json` declarar a dependência — funciona por hoisting do pnpm. Falta também `@repo/email` | `apps/app/package.json` | Além do risco de resolução, **o turbo não invalida `app#*` quando `@repo/analytics` muda** — cache mentindo num gate que roda em toda PR |
| 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` sem declarar `@repo/email` | `apps/app/env.ts:1` | O `keys.ts` do pacote **valida de fato no boot** dos 3 apps. `apps/web` e `apps/api` **declaram**; só a `app` não |
| 🟡 `packages/auth/package.json:12` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:12` | Reconferido hoje: `client-ui.tsx` **não existe**. Zero importadores, falha em silêncio; o primeiro `import` quebra. **Nona auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps | `packages/auth/package.json:24` | Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| ✅ **`reloadCurrentUser` deixou de ser o ponto cego do pacote… quase.** A suíte do `@repo/auth` saiu de 2 arquivos/29 testes para **3/38** | `packages/auth/client.ts:191-202` | O arquivo novo é `serverSessionRevocation.test.ts` (9 casos), que cobre a revogação. **`reloadCurrentUser` em si segue sem teste próprio**, exercitada só por mock de outro workspace — terceiro ciclo |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | `dashboard-home` (#9) é a spec que o resgataria |
| 🟡 **`input-otp.tsx` é código morto**, sem nenhum consumidor | `packages/design-system/components/ui/input-otp.tsx` | `account-security-mfa` (#10) é a spec que o usaria |
| 🟡 **Dependências de instrumentação instaladas e nunca importadas:** `import-in-the-middle`, `require-in-the-middle` | `apps/app/package.json` | São as dependências típicas de OTel/Sentry e dão **zero** importações. Hoje é peso morto — e **não** contam como evidência de observabilidade |
| 🟡 **`packages/internationalization/utils/cookies.ts` é inalcançável.** O `package.json` mapeia `"./utils" → "./utils.ts"` (o **arquivo**), então o diretório homônimo nunca é resolvido | `packages/internationalization/utils/cookies.ts` | Os importadores resolvem todos para o arquivo; o `cookies.ts` do diretório é **código morto** |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:13,20` | A cadeia para levar a espera até a tela está pronta e **para no último metro**: o toast diz "aguarde um instante", sem o número que o servidor mandou. ⚠️ Cuidado com falso positivo ao remedir: há um `retryAfterSeconds` **homônimo de outro tipo** no rate limiter |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`** | `apps/api/(shared)/repositories/base.repository.ts:102-117` | Depois do primeiro `PUT` o campo deixa de ser `Timestamp` e vira `String`: consulta por range/`orderBy` mistura tipos. **Cruza diretamente com `cursor-pagination` (#4)**. ⚠️ Preservado de propósito em `firestore-admin-access` (migração *contract-preserving*) |
| 🟡 `delete()` herdado por todo repositório é **soft delete** | `apps/api/(shared)/repositories/base.repository.ts:127-129` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` — e agora deixa **duas** famílias de objeto órfãs |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth. O N+1 do Admin SDK está em `:38-40` |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. **Reconferido: seguem órfãs.** A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:63` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts` | A assinatura **é** validada; nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `env.STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts` | `pnpm --filter api dev:with-stripe` **não pode funcionar**. A #11 mostrou o contorno ao redeclarar `FIREBASE_STORAGE_BUCKET` pelo mesmo motivo — mas **a causa raiz segue** |
| ◐ **`skipValidation` faz o t3-env descartar os `extends` — contornado 2× na `apps/api`, ainda aberto na `apps/web`** | `apps/web/env.ts:22,13-16` | Na `apps/web`, `skipValidation: true` é **incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client`, então o CTA "Ir para o painel" da landing cai no fallback. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| 🟡 **Casamento exato de rota no rate limit deixa variações de fora** | `apps/api/proxy.ts:37-47` | Decisão consciente (`startsWith` limitaria `/auth/sign-in/google` duas vezes). ⚠️ **As 3 rotas de `account/` não entraram na lista** — incluindo troca de senha, que é alvo clássico de força bruta. Vale reavaliar |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:175,186` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada** — UTM de campanha, `?plan=`. O próximo fluxo que carregar estado na URL redescobre o mesmo defeito |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts` · `apps/web/proxy.ts:92,96` | O idioma escolhido **não sobrevive ao fechamento do navegador**. ⚠️ **Verificar se o `x-theme` novo herdou o mesmo defeito** — ele usa o mesmo helper e o mesmo TTL |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-77` | ASVS 5.0 L1 (3.3.1) exige `Secure`. O helper agora grava `x-locale` **e `x-theme`**, não o cookie de sessão |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:16` | Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru; a API o usa como fallback | `packages/sdk/src/client/base.ts:45,53,95` · `auth-request-context.ts:100,119` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada — não é resíduo histórico, é duplicação ativa |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | **Sobreviveu à #11 e à #12**, que corrigiram vizinhos e deixaram este. Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder` — em qualquer idioma |
| ✅ **Os 8 `url: "#"` da sidebar morreram** com a PR #12 | `(common)/routes.tsx` | `grep -rn 'url: "#"' apps/` ⇒ **0**. Os títulos vêm do dicionário (`settingsItems`). Achado fechado |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`), `"Início"`, `"Home"` | `LanguageSwitcher.tsx:79` · `PageBreadcrumb.tsx:28,30` · as duas `page.tsx` de home `:7` | Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe. O `"Home"` das homes tem **a chave pronta ao lado**, usada em 5 outras telas |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| ⚪ **Um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `…/entities/(hooks)/useListEntities.tsx:16` · `…/(home)/EntitiesListClient.tsx:23-28` | O hook **devolve** `error`; o componente nunca o lê. Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele. Vale para todo `useList*` no mesmo padrão |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:24-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem. É a home da landing: o caminho mais percorrido do repo |
| 🟡 **`hydration mismatch` num `id` do Radix + "Select is changing from uncontrolled to controlled"** | `PanelNavbarControls.tsx` · `Sidebar.tsx` | ⚠️ **Reverificar:** a PR #12 corrigiu a segunda metade na raiz (`hookformSelect.tsx:90`). O aviso do Radix pode ter sobrevivido sozinho |
| ⚪ **A landing `/contact` acusa erros de hidratação** (`<a>` dentro de `<a>`) vindos do `NavigationMenu` | `apps/web/…/components/header/index.tsx:82-88` | Pré-existente, **só** no ramo `item.href`; os subitens estão corretos |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:11,19` | O `apps/app/CLAUDE.md` exige que o hook exporte também a função imperativa no mesmo arquivo. **`useMyAccount.ts` (novo) segue o padrão certo** — o desvio é só do antigo |
| 🟡 **`provider-error` não distingue três falhas diferentes** — cota estourada, domínio não verificado e chave revogada produzem o **mesmo** `reason` | `packages/email/index.ts:120-130` | Descartar o objeto de erro é **correto e deliberado** (carrega o endereço do destinatário, e há teste que reprova quem o logar). Mas ninguém distingue "acabou a cota" de "revogaram a chave" sem abrir o painel. **Pertence a [`observability-logging`](observability-logging.md)** (#2) |
| ◐ **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx` · `apps/web/…/contact/components/contact-form-client.tsx` | O form de contato continua sem `<form>`, com botão sem `type="submit"` e campos que não casam com os parâmetros da action **que já existe e tem teste** |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir. **Esta rodada mostrou o efeito na prática**: quando `app#test` falhou, `app#typecheck` foi abortado no meio |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito. **Reconferido em 2026-09-15: o documento está honesto**, depois de duas
> correções aplicadas hoje (gate instável e contas de QA).

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | 🔴 **`testTimeout` não declarado nas 9 configs de Vitest** — e o gate **já falhou por isso**, 1 em 2 execuções. É **pré-requisito** do item 2 | `PRE-PRODUCTION.md` ✅ **corrigido hoje com a medição real** | **minutos** |
| 2 | **`main` não tem branch protection.** Remedido hoje: `gh api …/branches/main/protection` → **404**, rulesets → `[]` | `PRE-PRODUCTION.md` | minutos, **depois** do item 1 |
| 3 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados" — agora com **dois** consumidores. Exige plano **Blaze**, ou seja, cartão | `PRE-PRODUCTION.md` ✅ documentado com runbook | cartão + ~15 min |
| 4 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM — passo de DNS, sem contorno | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 5 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações: virar a chave é barato | `PRE-PRODUCTION.md` | P |
| 6 | **Contas de QA acumuladas: 15**, das quais **5 novas da PR #12** — não registradas pela entrega, descobertas por esta auditoria. Uma (`qa-account-settings-b@`) está **inutilizável** (senha não registrada, `sign-in` devolve 500) | `PRE-PRODUCTION.md` ✅ **atualizado hoje** | P |
| 7 | **Branches mergeadas ainda vivas no remoto.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 8 | **O login com Google nunca teve passe manual com conta real.** ⚠️ **A única que continua existindo só aqui.** O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta. Modo de falha silencioso: o popup fecha e nada acontece | *(só neste arquivo)* | ~2 min |

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
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Explicitamente fora do corte de `file-upload-storage`, **arquivada**. Reabrir exige spec nova. O `POST /files` ficou genérico de propósito — estender é acréscimo, não reescrita. |
| **Troca de e-mail do titular** · **exclusão de conta** · **lista de sessões ativas** | — | ⚠️ **Novo aqui:** explicitamente fora do corte de `account-settings`, agora **arquivada**. A exclusão virou [`data-rights-lgpd`](data-rights-lgpd.md) (#6) e as sessões, [`account-security-mfa`](account-security-mfa.md) (#10). A **troca de e-mail** não tem spec e continua sem dono — reabrir exige spec nova. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback | 1/10 | Terceirizar é mais racional que manter no core. |
| Referral / afiliados | 0/10 | Nenhuma referência do painel entrega. O mercado resolve com produto de terceiro. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. **O CI está em `main` e verde — mas o gate local falhou nesta rodada**, então o pré-requisito de estabilidade **não** está satisfeito. Reavaliar depois do `testTimeout`. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição — e como opt-in por variável ausente, no padrão do `ARCJET_KEY`. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **9** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois, e só em pastas críticas. Relatório por workspace **não soma** — exige consolidação na raiz. Cruza com `e2e-testing`. |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
