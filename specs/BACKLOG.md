# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última rodada:** 2026-09-30 (`/spec --sync`, dentro de um `/cycle` autônomo, pós-merge da PR #35) ·
> **anteriores:** 2026-09-30 (PR #34) · 2026-09-30 (PR #33) · 2026-09-29 (PR #32) · 2026-09-29 (PR #31) · 2026-09-28 (PR #30) · 2026-09-27 (PR #29) · 2026-09-26 (`/spec` de descoberta, pedida pelo usuário) · 2026-09-26
> (PR #28) · 2026-09-25 (PRs #26 e #27) · 2026-09-25 (PR #25) · 2026-09-24 (PR #24) · 2026-09-23 (PR #23) ·
> 2026-09-23 (PR #22) · 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) ·
> 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 ·
> 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) ·
> 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **O 🔴 da conta desativada fechou.** A tarefa direta
>    [`disabled-account-revocation`](../docs/features/disabled-account-revocation/STATE.md) entrou em `main` pela
>    PR #35 (`1936369`), com CI verde no SHA de merge nos quatro jobs. No código: `getCurrentUser` recusa
>    `user.disabled` (`packages/auth/server.ts:182`) e o `PUT /users/[id]` revoga as sessões ao desativar
>    (`apps/api/app/(routes)/users/[id]/route.ts:124-126`). O runbook de incidente foi corrigido no mesmo diff e
>    a frase nova confere com o código. Detalhe em
>    [Entrega confirmada](#entrega-confirmada-disabled-account-revocation-pr-35).
> 2. **Nenhuma spec mudou de status.** A PR #35 não tinha spec. As quatro que seguem em `specs/` foram
>    reconferidas por `grep` e nenhuma ganhou código por tabela.
> 3. **Gates remedidos com `--force`**, com JDK 21: 29/29 tasks em 1 min 39,9 s, 806 arquivos no `pnpm check`,
>    **2466** testes em 226 arquivos (+14, os da PR #35: 5 em `@repo/auth`, 9 na `apps/api`) e 170 em 4 contra o
>    emulador. O teste instável de `useListAuditEvents` não apareceu em três execuções; o acumulado fica em 2
>    falhas em 31.
> 4. **Âncoras corrigidas**: o `PUT` ganhou quatro linhas e o `PRE-PRODUCTION.md` ganhou uma antes do §13 e
>    cinco na higiene. Seis âncoras deste arquivo foram remedidas; as da spec arquivada de `compliance-docs-kit`
>    ficaram registradas, porque a auditoria não edita spec arquivada.
> 5. **Achados: 1 fechado, 1 novo, 83 abertos.** O novo é o `GET /auth/me` respondendo 401 sem `error.code`,
>    visto no `/test` da tarefa. Duas lacunas de teste novas vieram do mesmo `/test` e estão na seção dela.
> 6. **Lotes recalculados**: uma spec elegível, `plan-entitlements`, que segue `proposed`. Lote 1 só com ela.
> 7. **Recomendação de #1: tarefa direta, sem spec**, para o 🔴 que sobrou: `packages/security/index.ts:11`
>    lê a `ARCJET_KEY` no import, e uma chave malformada derruba toda requisição da API. Tamanho P, provável
>    só com teste de unidade. Detalhe em [Ordem recomendada](#ordem-recomendada). A tarefa já corre nesta
>    mesma rodada como [`arcjet-key-lazy-validation`](../docs/features/arcjet-key-lazy-validation/STATE.md), no
>    working tree e sem PR; o 🔴 segue aberto até o merge.
> 8. **O que a tarefa mediu e este arquivo absorveu depois da auditoria:** o 🔴 foi reescrito (em `app` e `web`
>    a chave malformada recusa o build; só a API publicava um build que respondia erro a tudo); o
>    `skipValidation` da `apps/web` ganhou uma consequência medida (o bloqueio de bot da landing nunca roda),
>    com a decisão de ligá-lo em aberto (D8); o achado do `/auth/sign-in` ganhou dois 500 medidos; e as
>    âncoras que o diff da tarefa deslocou foram remedidas no working tree (tabela em
>    [Âncoras deslocadas](#âncoras-deslocadas-corrigidas-nesta-rodada)).

## Contadores

Sobre as **4 specs que seguem em `specs/`**. Recontados do disco em 2026-09-30, lendo o frontmatter de cada
arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 1 |
| `approved` | 0 |
| `in-progress` | 2 |
| `done` (arquivadas) | 25 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `confianca` 1 (`in-progress`) · `dx` 1 (`in-progress`) · `produto` 2 (1 `proposed`,
1 `deferred`). **Por esforço:** M 3 · G 1. **Por valor:** alto 2 · médio 2 · baixo 0.

**Transições aplicadas: 0.** A PR #35 foi uma tarefa direta, sem spec. Nenhum arquivo foi movido e o índice
do git ficou vazio antes e depois da auditoria. As edições deste arquivo estão no working tree. Nada foi
commitado.

> **A fila elegível tem uma spec**, `plan-entitlements`, ainda `proposed`. Ficam fora `account-security-mfa` e
> `observability-logging` (`in-progress`; a segunda estacionada em E1) e `teams-organizations` (`deferred`,
> E2). Nenhuma spec `dx` ou `confianca` está na fila.

## Tarefas diretas entregues (sem spec)

Correções que vieram de achados deste arquivo, sem spec própria. Ficam registradas aqui porque a pasta
`docs/features/<slug>/` delas não tem `spec.md`.

| feature | PR | achados fechados |
|---------|----|------------------|
| [`i18n-hydration-admin-delete-billing`](../docs/features/i18n-hydration-admin-delete-billing/STATE.md) | #28, `295c8de`, 2026-09-26 | hidratação do dicionário client em `/en` e `/es`; A2 (arquivamento pelo admin sem cancelar a assinatura) |
| [`disabled-account-revocation`](../docs/features/disabled-account-revocation/STATE.md) | #35, `1936369`, 2026-09-30 | 🔴 conta desativada pelo admin com o ID token aceito pela API por até 1 hora; a frase correspondente do runbook de incidente e o achado ligado em [`account-security-mfa`](account-security-mfa.md). Detalhe em [Entrega confirmada](#entrega-confirmada-disabled-account-revocation-pr-35) |

### O que foi conferido no código da PR #28

| achado | veredito | evidência |
|--------|----------|-----------|
| Componente client renderizava em pt-br no servidor em `/en` e `/es` e a hidratação falhava | **fechado** | `getDictionary()` do client lê o locale do `LocaleProvider` (`packages/internationalization/client.ts:40-45`, `:47-57`), alimentado pelo segmento `[locale]` via `useParams()`; o provider está montado nos root layouts (`apps/app/app/layout.tsx:77`, `apps/web/app/[locale]/layout.tsx:34`). Os 63 call sites não mudaram. `AuthProvider` passou a `useDictionary()` (`packages/auth/provider.tsx:12`) para acompanhar a troca de idioma. Testes novos: `localeProvider.test.ts` e `authProviderLanguageSwitch.test.tsx` |
| A2: o soft delete pelo admin não cancelava a assinatura | **fechado** | `DELETE /users/[id]` chama `cancelLiveSubscription` antes do soft delete (`apps/api/app/(routes)/users/[id]/route.ts:161`) e responde 503 `USERS_DELETE_BILLING_FAILED` quando a cobrança falha (`:162-171`), com o código traduzido nos 3 idiomas (`translations/packages/shared/utils.ts`). Teste novo: `usersAdminDeleteBilling.test.ts` |

A PR também corrigiu, além do escopo, o aninhamento de `a > button > a` e `button > a` no header da
`apps/web` (`header/index.tsx`, teste `headerInteractiveNesting.test.tsx`). O mesmo padrão `Button > Link`
segue no hero, no CTA, no FAQ e na página de preços; o achado da allowlist de acessibilidade foi atualizado.

**O que continua aberto, vindo desta entrega:**

- O `getDictionary()` **do servidor** ainda lê o cookie `x-locale`, não a URL. Na primeira visita a `/en` sem
  cookie, a `apps/web` sai com Server Components em pt-br e componentes client em inglês, e as duas apps
  saem com `<html lang="pt-br">`. Era a pergunta 3 da seção 14 do plano da feature. Os dois achados antigos
  sobre isso viraram um só, na seção de UI.
- Lacunas de teste que o `/test` deixou abertas: cancelamento que passa seguido de soft delete que falha
  (Firestore fora) e duplo clique no "Sim" do arquivamento. O cancelamento real numa conta Stripe segue 🔒.
- O `STATE.md` da feature traz `spec: none (achados BACKLOG.md:430 e :502)`. As linhas citadas eram do
  arquivo anterior a esta rodada; o `STATE.md` fica como está, porque a auditoria só escreve em
  `docs/features/` para arquivar spec.

## Entrega confirmada: `disabled-account-revocation` (PR #35)

A PR #35 entrou em `main` como `1936369` ("fix: disabled accounts lose API access immediately") em 2026-09-30 às
19:15 UTC, da branch `fix/disabled-account-revocation`, em cinco commits (`b4cb9f6` auth, `af69978` api, `a8653dc`
documentos, `aeaee83` auditoria anterior, `d57dfee` artefatos da tarefa). Os quatro checks passaram na PR
(`gh pr view 35`) e a execução de merge também: `gh run 36764362726`, `success` em `changes`, `verify`
(3 min 2 s), `coverage` e `e2e` (4 min 11 s).

`git diff --name-only c7aa4d9 1936369 -- apps packages` lista quatro arquivos: `packages/auth/server.ts`,
`apps/api/app/(routes)/users/[id]/route.ts` e os dois testes. A auditoria conferiu cada ponto no disco:

| o que a tarefa prometia | o que o código mostra |
|-------------------------|-----------------------|
| a API recusa o bearer de conta desativada | `getCurrentUser` testa `user.disabled` no `UserRecord` que já carrega, antes da marca de revogação (`packages/auth/server.ts:181-183`), sem chamada nova ao Firebase. Cobre os três chamadores: `resolve-api-actor.ts:24`, `packages/auth/middleware.ts:71` e `user-merge.ts:35` |
| desativar pelo admin revoga as sessões | `PUT /users/[id]` chama `revokeUserSessions` quando o corpo traz `disabled: true` (`users/[id]/route.ts:124-126`), depois do `updateUser` (`:120-122`). `revokeUserSessions` engole a falha e só loga (`server.ts:323-329`), então a desativação vale mesmo se a revogação cair |
| teste de unidade, não de emulador | `serverSessionRevocation.test.ts` ganhou cinco casos de `disabled` (`:140-190`), inclusive o que garante uma só busca do usuário (`:174`); `usersAdminAuditTrail.test.ts` confere a chamada com o uid do alvo e a ausência dela em `disabled: false` (`:258-297`). `@repo/auth` foi de 107 para 112 testes e a `apps/api` de 1022 para 1031, medidos nesta auditoria |
| o runbook deixa de descrever o buraco | `docs/INCIDENT-RESPONSE.md:51-52` descreve o corte imediato nos dois transportes e a revogação no `PUT`; as seis âncoras de código da linha 51 foram lidas e conferem |
| o achado ligado em `account-security-mfa` fecha | a seção da spec virou "corrigido", com `server.ts:180-183` e `users/[id]/route.ts:120-126`, conferidas |

**Veredito:** fechado. O `/test` da tarefa não encontrou defeito: contra o projeto Firebase de desenvolvimento, o
bearer de conta desativada recebeu `401 AUTH_INVALID_TOKEN` e voltou a passar quando a checagem foi retirada do
código; depois de desativar e reativar pelo `PUT`, o bearer antigo seguiu recusado. A passada de navegador
(pessoa desativada com o app aberto cai no sign-in) ficou 🔒 por custo, porque o diff não toca UI.

**Registro da feature:** o `STATE.md` traz as quatro etapas em `done` e `branch: fix/disabled-account-revocation
(proposta; …)`. Pela primeira vez desde a PR #29 o nome proposto foi o usado, mas ele não tem o `<project>` do
padrão, porque o diff cruza `packages/auth` e `apps/api` (ver E11). A branch segue viva no remoto (pendência 16).

A entrega anterior, `compliance-docs-kit` (PR #34, `c7aa4d9`), tem a evidência item a item na própria spec
arquivada, [`docs/features/compliance-docs-kit/spec.md`](../docs/features/compliance-docs-kit/spec.md), e a linha
dela em [Entregues](#entregues).

## Entrega parcial confirmada: fatia 1 de `account-security-mfa` (PR #29)

A PR #29 entrou em `main` como `597f641` ("feat: password policy and API sign-up") em 2026-09-26 às 17:07
UTC, da branch `feat/account-security-password-policy`. Os quatro checks passaram antes do merge (`gh pr view
29`) e a execução de merge também: `gh run 36257926749`, `success` em `changes`, `verify`, `coverage` e `e2e`.

A auditoria de 2026-09-27 conferiu o item 4 do corte no código, um ponto por vez:

| o que a fatia prometia | o que o código mostra |
|------------------------|-----------------------|
| regra de senha num lugar só | `packages/shared/utils/helpers/passwordPolicy.ts:2-10`: `PASSWORD_MIN_LENGTH = 8`, `PASSWORD_MAX_LENGTH = 1024`, `EXISTING_PASSWORD_MIN_LENGTH = 6` |
| as 11 cópias de `MIN_PASSWORD_LENGTH = 6` somem | `git grep "MIN_PASSWORD_LENGTH ="` em `apps/` e `packages/`: **0**. Os oito schemas de formulário (seis na `apps/app`, dois na `apps/web`) importam as constantes |
| a borda da API recusa senha curta | `apps/api/(shared)/validation/password.schema.ts:10-18` e `:29-33` (`400 AUTH_PASSWORD_TOO_SHORT`), aplicado no cadastro e na redefinição (`auth.schema.ts:23`, `:28`, `:82-83`), na troca (`account.schema.ts:47-48`, `:136-137`) e na criação pelo admin (`users/route.ts:48-49`); código traduzido nos 3 idiomas (`translations/packages/shared/utils.ts:73`, `:192`, `:311`); âncoras remedidas em 2026-09-30, depois da PR #33 |
| cadastro passa pela API | `apiClient.authApi.signUp` em `SignUpFormClient.tsx:114` e `sign-up-form-client.tsx:36`; rota `auth/sign-up/route.ts:19-77` cria a conta pelo Admin SDK; `git grep createUserWithEmailAndPassword` em `apps/` e `packages/`: **0**; `packages/auth/components/sign-up.tsx` apagado |
| login e senha atual seguem aceitando 6 | `signInSchema.ts` das duas front-ends e `existingPasswordSchema` usam `EXISTING_PASSWORD_MIN_LENGTH` |
| segundo fator e sessões ficam para depois | `git grep -niw` por `multiFactor`, `TOTP` e `passkey`: **0** |

**Veredito:** item 4 entregue. A spec passou a `in-progress` com `feature: account-security-mfa` e **não** foi
arquivada, porque os itens 2, 3 (resíduo), 5 e 6 seguem abertos. O estado das fatias ficou escrito na própria
spec.

**O que a fatia deixou de fora, por decisão do plano:** a checagem contra as senhas mais comuns (ASVS 6.2.4,
P2); o REST direto do Identity Toolkit com a chave pública, que ainda aceita 6 ou 7 caracteres (declaração em
`docs/PRE-PRODUCTION.md`, seção "o que a política de senha não alcança"); e o `create-dev-admin.mjs`, que não
aplica a regra (P4). O `/test` fechou com 16 ✅, 1 ❌ anterior à fatia (contraste do `--destructive` no dark) e 3
🔒 (Identity Platform, Arcjet e entrega de e-mail).

**Deriva de pipeline:** o `docs/features/account-security-mfa/STATE.md` segue com `review: in-progress` e
`branch: -`, com a nota de que os commits aguardavam aprovação. O merge saiu mesmo assim, então o `STATE.md`
não reflete o histórico. A auditoria só escreve em `docs/features/` para arquivar spec e deixa o arquivo como
está; o caso está estacionado em E11 de [Decisões estacionadas](#decisões-estacionadas-51). O nome da
branch mergeada também não segue o padrão `<project>/<type>/<title>` de `.claude/rules/git-commits.md`.

## Gates medidos nesta auditoria

Executados em 2026-09-30, com `--force`, neste workspace, com o `HEAD` em `1936369` (igual a `origin/main`) e o
working tree limpo. Não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **806 arquivos · 0 erros** (`No fixes applied`, 417 ms) |
| `pnpm turbo run lint typecheck test test:emulator --force`, com o JDK 21 de `/opt/homebrew/opt/openjdk@21` no `PATH` | ✅ **29/29 tasks · 0 em cache · 1 min 39,9 s**, na primeira execução; `api#test:emulator` **170 testes em 4 arquivos**. Ao fim, nenhuma das portas de emulador (8080, 9099, 9199, 4000, 4400, 4500, 9150, 8085) ficou ouvindo |
| `vitest run` da `apps/app`, 2 execuções seguidas depois do turbo | 2 passagens, 756 testes cada, nenhum erro não tratado |

O tempo subiu de 1 min 6,3 s para 1 min 39,9 s com a mesma quantidade de tasks. A suíte cresceu 14 testes, o que
não explica a diferença; é contenção da máquina, como o `PRE-PRODUCTION.md` §9 já avisa.

**O teste instável de `useListAuditEvents` não apareceu nesta rodada** (0 em 3 execuções da suíte da
`apps/app`, contando a do turbo). O acumulado é 2 falhas em 31, todas em 2026-09-28. O arquivo não muda desde a
PR #18 e o CI segue verde; o achado continua aberto.

| workspace | arquivos | testes | Δ vs. 2026-09-30 (PR #34) |
|-----------|---------:|-------:|---------------------------|
| `api` | 78 | 1031 | **+9** testes em arquivo existente (`usersAdminAuditTrail.test.ts`) |
| `app` | 91 | 756 | — |
| `@repo/email` | 7 | 202 | — |
| `@repo/auth` | 9 | 112 | **+5** testes em arquivo existente (`serverSessionRevocation.test.ts`) |
| `web` | 13 | 82 | — |
| `@repo/internationalization` | 6 | 59 | — |
| `@repo/design-system` | 6 | 45 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/next-config` | 1 | 32 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/payments` | 4 | 22 | — |
| `e2e` | 2 | 16 | — (testes unitários da suíte; os de navegador rodam no `pnpm e2e`) |
| **total** | **226** | **2466** | **+14**, os da PR #35 |
| `api#test:emulator` (fora da linha acima) | 4 | 170 | — |

O `docs/PRE-PRODUCTION.md` §9 registra 2452 testes em 226 arquivos, medidos no `c7aa4d9`. Ficou 14 testes
defasado com a PR #35 (ver [Contradições](#contradições-doc--código-medidas-nesta-rodada)).

CI: a execução de merge da **#35** (`1936369`, `gh run 36764362726`) terminou em **`success`** em `changes`,
`verify`, `coverage` e `e2e`. As 16 últimas execuções do CI na `main` (`gh run list --branch main --limit 16`)
estão verdes.

Branch protection segue **não ligado**, remedido hoje: `gh api repos/:owner/:repo/branches/main/protection`
→ **404** ("Branch not protected"), `rulesets` → **`[]`**. O repositório tem **35** PRs, nenhuma aberta.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Nenhuma spec está bloqueada por dependência.** A ordem de 2 a 5 foi escolhida pelo usuário em 2026-09-26;
com `brand-config`, `storage-emulator-rules-tests`, `accessibility-conformance`, `account-email-change` e
`compliance-docs-kit` entregues, a fila encolheu para quatro.

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | por que agora |
|---|----|---------------|
| 1 | [`plan-entitlements`](plan-entitlements.md) | `proposed`, por decisão do usuário. Única elegível. Prevalência baixa (2/10) e metade dos critérios só se prova com conta Stripe |
| 2 | [`account-security-mfa`](account-security-mfa.md), **fatia 2** (sessões) | `in-progress` desde 2026-09-27, com a fatia 1 entregue pela PR #29. **Fora do conjunto elegível** enquanto estiver `in-progress`. A fatia 2 exige identificar sessões, que o Firebase não oferece pronto |
| 3 | [`observability-logging`](observability-logging.md) | `in-progress`, 5 dos 6 itens. **Fora do conjunto elegível.** Estacionada (E1) |
| 4 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22. Estacionada (E2) |

**Recomendação para a próxima rodada: tarefa direta, sem spec, para o 🔴 da `ARCJET_KEY` lida no import.** A
única spec elegível, `plan-entitlements`, está `proposed` porque você a manteve assim em 2026-09-26, e o `/cycle`
não aprova spec. Com o 🔴 da conta desativada fechado pela PR #35, este é o único 🔴 aberto. A tarefa é esta:

- **O quê:** uma `ARCJET_KEY` presente e malformada (sem o prefixo `ajkey_`) deixa de derrubar as apps. O
  pacote passa a ler a chave na primeira chamada, não no import, e trata chave inválida como ausência: o
  limitador vira no-op, como já acontece sem a chave, e o problema aparece no log de boot da `apps/api` em vez
  de em cada requisição.
- **Por quê é a primeira:** é o último 🔴. O schema da chave (`packages/security/keys.ts:9-15`) recusa valor sem
  o prefixo, e `keys()` roda no topo do módulo (`packages/security/index.ts:11`). Os três `proxy.ts` importam o
  pacote (`apps/api/proxy.ts:1`, `apps/app/proxy.ts:5`, `apps/web/proxy.ts:5`). Na `apps/api` a exceção sobe
  no grafo de módulos do middleware e toda requisição falha, sem nada no boot: o aviso de
  `apps/api/instrumentation.ts:46-50` só olha se a variável existe. Basta colar a chave errada na Vercel.
  **Corrigido depois pela medição da tarefa:** em `apps/app` e `apps/web` o efeito é outro, o `next build`
  recusa a chave em "Collecting page data", porque o `env.ts` das duas estende o schema estrito. O 🔴 de
  runtime era só da API.
- **Arquivos:** `packages/security/index.ts:11` (leitura no import) e os usos de `arcjetKey` em `:32`,
  `:42-47` e `:85-91`; `packages/security/keys.ts:9-15` (o schema, que continua valendo para o `env.ts` da `apps/app`
  e da `apps/web`); `apps/api/instrumentation.ts:46-50` (aviso de boot que distingue ausente de malformada);
  testes em `packages/security/__tests__/rateLimit.test.ts` (já carrega o módulo com chaves diferentes,
  `:47-49`), `keys.test.ts` e `apps/api/__tests__/instrumentation.test.ts` (já faz `stubEnv("ARCJET_KEY", …)`
  em `:64`).
- **Tamanho:** P. Uma função de leitura preguiçosa no pacote, um ramo a mais no aviso de boot e testes de
  unidade. Sem i18n, sem variável nova, sem dependência nova.
- **O que a rodada autônoma prova sem infra:** tudo. A falha acontece na validação do schema, antes de
  qualquer chamada à Arcjet, então uma string como `ARCJET_KEY=invalida` reproduz o defeito no teste de
  unidade (importar o módulo não lança; `checkRateLimit` responde `enforced: false`; o boot loga). Nenhuma
  conta na Arcjet é necessária. O caminho com chave válida já tem teste com a Arcjet mockada.
- **Uma decisão que a tarefa toma sozinha:** chave malformada vira no-op com erro no log, e não queda do
  processo. É o que a [`cycle-policy`](../.claude/cycle-policy.md) §3 manda para feature opt-in ("sem a env, a
  app sobe"), e derrubar o boot não funcionaria de qualquer jeito: o `throw` do `CORS_ORIGIN` em
  `instrumentation.ts:40-44` não derruba o processo (achado aberto). Fica registrada como pergunta, com essa
  recomendação.
- **Medido depois, pelo `/analyze` e pelo `/test` da tarefa:** o `next build` de `apps/app` e de `apps/web`
  sai com exit 1 e `Invalid environment variables` com a chave malformada, inclusive na web, que usa
  `skipValidation: true`: o `security()` do `extends` valida por conta própria antes de ser descartado. O
  schema estrito ficou, como sinal alto no build.
- **Contenção:** `packages/security/*` e `apps/api/instrumentation.ts` não estão no `contends_on` de nenhuma
  spec viva.
- **Em execução** desde 2026-09-30 como
  [`arcjet-key-lazy-validation`](../docs/features/arcjet-key-lazy-validation/STATE.md), no working tree e sem
  PR: `readArcjetKey` e `arcjetKeyState` em `packages/security/keys.ts:11-26`, leitura por chamada em
  `index.ts:40` e `:84`, boot da API separando ausente (`warn`) de malformada (`error`, sem ecoar o valor) em
  `instrumentation.ts:30-45`. O `/test` fechou com 10 ✅, 0 ❌ e 1 🔒 (chave real da Arcjet). Fecha no
  `/spec --sync` depois do merge.

### O que **não** foi escolhido para #1, e por quê

- **`plan-entitlements`** só não é #1 porque está `proposed`: o usuário a manteve assim em 2026-09-26, e metade
  dos critérios fica 🔒 sem conta Stripe.
- **O admin que desativa a própria conta** (🟢, achado da PR #35) ficou mais caro com a correção: agora o admin
  perde o painel na mesma requisição. Mas é recuperável pelo console do Firebase, e a correção pede código de
  erro novo nos 3 idiomas e mudança na listagem. P, e o segundo da fila.
- **O "Excluir" do menu de ações pelo teclado** (WCAG 2.1.1) segue a tarefa direta P mais urgente da lista de
  UI, mas só se prova numa passada de navegador.

Os demais achados P (foco do diálogo de exclusão, rate limit de `payments/*` e `/account`, teste instável,
`getDictionary()` do servidor, item da `review-checklist.md`) seguem na seção de achados, com `arquivo:linha`, e
deixam de ser repetidos aqui pela §5.1 da `cycle-policy`.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-30**, depois
da reconciliação dos status, a partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 1 de 4.** Fora ficam `account-security-mfa` e `observability-logging` (`in-progress`) e
`teams-organizations` (`deferred`). A elegível não tem `depends_on` pendente.

| lote | specs | o que toca (`contends_on`) | por que não colide |
|------|-------|----------------------------|--------------------|
| **1** | `plan-entitlements` | `webhooks/payments/route.ts`, `billing-state.ts`, `packages/sdk/src/types/payments/payments.ts` | lote de uma spec só |

**Quem ficou fora do lote 1, nominalmente:** ninguém entre as elegíveis. Não há lote 2. **Mudança desta
rodada:** nenhuma no lote. Os `contends_on` foram relidos do disco; nenhum mudou desde a rodada anterior.

**A tarefa direta recomendada como #1 não é spec e não entra no cálculo**, mas o `contends_on` dela seria
`packages/security/index.ts`, `packages/security/keys.ts` e `apps/api/instrumentation.ts`. É disjunto do de
`plan-entitlements` e do de toda spec viva, então as duas podem correr em workspaces separados.

### Onde os lotes podem colidir mesmo disjuntos

- **`plan-entitlements` e o SDK**: acrescenta tipos em `types/payments/payments.ts`. Se mexer no índice de
  ações do cliente (`packages/sdk/src/client/index.ts`), que não declara, o conflito é com
  `teams-organizations`, que está fora da fila.
- **`plan-entitlements` e a tarefa da `ARCJET_KEY`**: nenhuma das duas declara `docs/PRE-PRODUCTION.md` nem
  `docs/SECURITY.md`, e as duas podem acabar editando esses arquivos (a segunda quase certamente, no §8 do
  `PRE-PRODUCTION.md`). O conflito seria de texto e se resolve no merge.
- Quase toda spec de código acrescenta códigos em `translations/packages/shared/utils.ts` (`apiErrors`). O
  conflito é aditivo e se resolve no merge.
- **Gate local:** `pnpm test` roda também `test:emulator` e exige JDK 21 no `PATH`. Nesta máquina o `java`
  padrão é o 17 e o 21 está em `/opt/homebrew/opt/openjdk@21/bin` (medido em 2026-09-30).
  `pnpm turbo run test` continua sem Java.

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](README.md#depends_on--contends_on)).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte
de MVP. `admin-billing-insights` declarou **5** arquivos e tocou **4**, e tocou sem declarar arquivos vizinhos
na mesma camada. `brand-config` declarou 5 e a PR #30 alterou os 5 e mais 17 arquivos de código e tradução
fora da lista. `storage-emulator-rules-tests` declarou 5 e a PR #31 alterou os 5, mais 12 fora da lista.
`accessibility-conformance` declarou 5 e a PR #32 alterou 4 deles (o `form.tsx` ficou intacto), mais 31
arquivos de código, tradução e configuração fora da lista, sem contar testes e documentos (os oito `HookForm*`, `select/index.tsx`,
`date-input.tsx`, `antd-app.tsx`, os dois layouts do painel, quatro seções da web). Nenhuma outra spec
declarava esses arquivos, então a previsão errou para menos sem custo, de novo.
`account-email-change` declarou 4 e a PR #33 alterou 3 deles (o `action-link.tsx` ficou intacto), mais 26
arquivos de código e tradução fora da lista, sem contar testes e documentos. `compliance-docs-kit` declarou 0 e
a PR #34 alterou `docs/PRE-PRODUCTION.md` e `docs/FORKING.md`, os dois arquivos compartilhados que a rodada
anterior tinha apontado nesta seção. A tarefa direta da PR #35 foi prevista com dois arquivos de código e tocou
exatamente esses dois, mais os dois testes, `docs/INCIDENT-RESPONSE.md` (previsto), `docs/BACKUP.md` e
`docs/PRE-PRODUCTION.md` (não previstos: uma âncora deslocada e a medição do §9).

## Precisam de decisão

**Duas perguntas novas nesta rodada**: a D1 acompanha a recomendação de #1, e a D8 veio da medição da tarefa.

| # | pergunta | recomendação | por quê |
|---|----------|--------------|---------|
| D1 | `ARCJET_KEY` malformada: o limitador vira no-op com erro no log de boot, ou o processo recusa subir? | no-op com erro no log | a `cycle-policy` §3 pede modo degradado para feature opt-in; e o `throw` de boot não derruba o processo hoje (achado do `CORS_ORIGIN`), então recusar subir não funcionaria sem mexer nisso também. **Adotada** pela tarefa `arcjet-key-lazy-validation`, no working tree; muda se você disser o contrário antes do merge |
| D8 | Ligar o bloqueio de bot da landing? Hoje ele nunca roda, nem com chave válida (achado do `skipValidation` da `apps/web`) | não ligar agora; declarar a decisão | ligar é pôr `detectBot` e `shield` em modo `LIVE` para visitante anônimo em todo fork que já tem a chave. Pede teste próprio (falso positivo de crawler, preview de link) e não cabe numa correção de configuração. Os documentos já descrevem o comportamento atual (`docs/ROPA.md:108`, `docs/SUBPROCESSORS.md:40`, `docs/FORKING.md` §7.3, no working tree) |

Os demais pontos foram resolvidos sem pergunta:

- **O CI no SHA de merge da PR #35** foi medido: verde nos quatro jobs (`gh run 36764362726`).
- **Se o 🔴 da conta desativada fechou de fato** foi medido no código, não lido do `STATE.md`: as duas mudanças
  estão em `main` e os 14 testes novos passam no gate desta rodada.
- **Aprovar `plan-entitlements`** é decisão sua desde 2026-09-26 e não é reapresentada como pergunta; a
  recomendação de #1 funciona com ou sem ela.
- **`plan-entitlements` (Stripe Entitlements ou mapa local?)** segue em "Perguntas em aberto" da própria spec,
  pela §5.1 da `cycle-policy`; o `/cycle` adota a recomendação escrita lá se você não disser nada.
- **O nome de branch fora do padrão** voltou na PR #35 (`fix/disabled-account-revocation`, sem `<project>`).
  Está em E11 e não é reapresentado.

## Decisões estacionadas (§5.1)


Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (12 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor |
| E2 | `teams-organizations` continua `deferred`? (14 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar, exigindo `verify` e `e2e`; não há pré-requisito técnico. É o que falta para o item 2 de [`e2e-testing`](../docs/features/e2e-testing/spec.md), arquivada com esse ⚠️. Remedido em 2026-09-30, pós-PR #35: 404, `[]`, 35 PRs |
| E4 | O gate `approved` não é usado (**oito** specs entregues sem passar por `approved`, incluindo `admin-billing-insights` e `e2e-testing`; a fatia 1 de `account-security-mfa` saiu da mesma forma, pela PR #29, com a spec em `proposed`). **Em 2026-09-26 o usuário aprovou cinco specs de uma vez, o primeiro uso do gate; `brand-config` (PR #30), `storage-emulator-rules-tests` (PR #31), `accessibility-conformance` (PR #32) e `account-email-change` (PR #33) e `compliance-docs-kit` (PR #34) são as cinco entregues depois de passar por ele** | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | O deep link das abas da conta (`?tab=`) não acompanha a barra lateral (3 rodadas) | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:55-57`), por isso precisa da sua palavra |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | este arquivo, achado A1 em [Achados](#-achados-abertos-reconferidos-ou-herdados) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer; a nota de medição do `docs/AUTH-SSO.md` fica como está |
| E11 | O registro da feature não acompanha o merge, e a branch sai fora do padrão (PRs #29 a #35) | você | `.claude/rules/git-commits.md` e `.claude/skills/spec-audit/SKILL.md` §4.1 | o `STATE.md` de `account-security-mfa` segue com `review: in-progress` e o de `brand-config` com `branch: -`, ambos já mergeados, de `feat/account-security-password-policy` e `feat/brand-config`. Na PR #31 o `STATE.md` acompanhou o merge (`review: done`, branch gravada), mas a branch saiu de novo como `feat/<slug>`. Na PR #32 as duas coisas voltaram: `feat/accessibility-conformance` e `review: in-progress` no `STATE.md` depois do merge. Na PR #33 a tabela do `STATE.md` acompanhou (`review: done`, branch gravada), mas as notas do mesmo arquivo dizem que a etapa segue `in-progress`, e a branch saiu como `feat/account-email-change`. Na PR #34 a tabela acompanhou, mas o campo `branch:` guarda um nome proposto que não foi usado (`docs/compliance-docs-kit`), e a PR saiu da `run-full-task-cycle-v2`. Na PR #35 o nome proposto no `STATE.md` foi o usado pela primeira vez (`fix/disabled-account-revocation`), mas sem `<project>`, porque o diff cruza `packages/auth` e `apps/api`; o `review.md` da tarefa justificou a omissão pela regra de commit, que aceita omitir o escopo, enquanto a de branch não aceita. Recomendação: a regra aceitar `feat/<slug>` para feature que cruza vários apps (como já aceita para épico), e a auditoria, ao confirmar o merge, gravar no `STATE.md` a linha `review` como `done` com o SHA e a branch |

**Duas recomendações repetidas são decisões técnicas e deveriam virar linha de política.** A auditoria
não edita `.claude/`, então elas ficam aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."* Caso medido: `onboarding-flow` ficou seis rodadas presa pelo corte
  contestado, ganhou o bloco numa rodada e foi entregue na seguinte, 5/5. Em 2026-09-26 a auditoria
  escreveu o bloco em `account-security-mfa`, então a linha não barra a próxima execução; continua valendo
  para a próxima spec contestada.
- Em `.claude/skills/spec-audit/SKILL.md` §4.1, antes do passo 5: *"Reescreva os links relativos de saída
  da spec para o caminho novo: `research/*.md` vira `../../../specs/research/*.md`, spec viva vira
  `../../../specs/<id>.md`, spec arquivada vira `../<slug>/spec.md`. Rode o verificador de links no
  arquivo movido e confirme zero mortos."* A rodada de 2026-09-25 fez isso à mão pela quinta vez, e as de
  2026-09-28, das duas de 2026-09-29 e as duas de 2026-09-30 repetiram (na última, dois links na spec movida).

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-30 |
|------|--------------|------------------------|
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`). A spec está `in-progress`, com a fatia 1 em `main` |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |
| [`plan-entitlements`](plan-entitlements.md) | — | ✅ sem dependência. Usa o estado de assinatura de `billing-subscription`, arquivada |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`plan-entitlements`](plan-entitlements.md) | Acesso por plano espelhado na API | produto | médio | M | `proposed` | — |
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `in-progress` (fatia 1 entregue, PR #29) | ✅ `account-settings` |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `in-progress` | — |
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
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`) |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`). ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`). ⚠️ O índice composto novo **precisa ser publicado** |
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`). ⚠️ **Três desvios registrados**; o índice composto de `auditEvent` **precisa ser publicado**. A imutabilidade da trilha ganhou uma exceção nomeada na PR #23 (`anonymizeUserLabels`) |
| `dashboard-home` | 2026-09-17 | [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md) — 5/5 do corte (PR #19, `bfc4d8f`). ⚠️ **Três índices compostos** precisam ser publicados |
| `session-refresh` | 2026-09-17 | [`docs/features/session-refresh/spec.md`](../docs/features/session-refresh/spec.md) — 6/6 do corte (PR #20, `cc93229`). ⚠️ A **revogação ponta a ponta segue 🔒 não verificada** |
| `user-activity-tracking` | 2026-09-19 | [`docs/features/user-activity-tracking/spec.md`](../docs/features/user-activity-tracking/spec.md) — 5/6 do corte (PR #21, `e656331`). ✅ O item 4 parcial foi pago pela entrega de `data-rights-lgpd` |
| `admin-analytics-dashboard` | 2026-09-23 | [`docs/features/admin-analytics-dashboard/spec.md`](../docs/features/admin-analytics-dashboard/spec.md) — 5/5 do corte (PR #22, `03498ae`). Gráfico entregue como histograma de recência |
| `data-rights-lgpd` | 2026-09-23 | [`docs/features/data-rights-lgpd/spec.md`](../docs/features/data-rights-lgpd/spec.md) — **5/5 do corte** (PR #23, `ab11a5b`), item 3 dividido: arquivos sem prova contra bucket real, assinatura transferida para `billing-subscription` e paga pela PR #25. **Quatro derivas registradas** |
| `onboarding-flow` | 2026-09-24 | [`docs/features/onboarding-flow/spec.md`](../docs/features/onboarding-flow/spec.md) — **5/5 do corte** (PR #24, `d52c4f0`), 20/20 critérios sob o emulador. Deriva no item 3: o deep link volta sem a query string |
| `billing-subscription` | 2026-09-25 | [`docs/features/billing-subscription/spec.md`](../docs/features/billing-subscription/spec.md) — **6/6 do corte** (PR #25, `a1f87d0`), mais o passo `billing` do expurgo herdado de `data-rights-lgpd`. 19 ✅ e 5 🔒 no `/test` (só conta Stripe real prova). ⚠️ Catálogo, portal, endpoint de webhook e chaves são passo manual por fork (`PRE-PRODUCTION.md` §12) |
| `admin-billing-insights` | 2026-09-25 | [`docs/features/admin-billing-insights/spec.md`](../docs/features/admin-billing-insights/spec.md) — **5/5 do corte** (PR #27, `0659ede`). 18 ✅, 4 🔒 e 1 ❌ anterior à entrega (hidratação em `/en` e `/es`). ⚠️ **Duas derivas** contra o bloco de reescopo, sem efeito na tela, aceitas pelo usuário; o endpoint da Stripe de cada fork precisa ganhar `invoice.paid` (`PRE-PRODUCTION.md:454-455`) |
| `e2e-testing` | 2026-09-25 | [`docs/features/e2e-testing/spec.md`](../docs/features/e2e-testing/spec.md) — **4/5 do corte e 1 parcial** (PR #26, `c71755e`). ⚠️ O item 2 roda em toda PR mas **não bloqueia o merge** até o branch protection ser ligado (E3). O `STATE.md` segue com `test: blocked` pelo D3, corrigido na própria PR; o job `e2e` passou nas quatro execuções seguintes |
| `brand-config` | 2026-09-28 | [`docs/features/brand-config/spec.md`](../docs/features/brand-config/spec.md) — **5/5 do corte** (PR #30, `e07252a`), 14 ✅, 0 ❌ e 1 🔒 no `/test` (nome não ASCII na Resend). Primeira spec entregue depois de passar por `approved`. ⚠️ Marca, logo e ícones por fork são passo manual (`PRE-PRODUCTION.md` §13) |
| `storage-emulator-rules-tests` | 2026-09-28 | [`docs/features/storage-emulator-rules-tests/spec.md`](../docs/features/storage-emulator-rules-tests/spec.md) — **5/5 do corte** (PR #31, `2c285de`), 18 ✅, 0 ❌ e 1 🔒 no `/test`; o 🔒 (`verify` no GitHub) passou no merge, com 170 testes contra emulador. Segunda spec entregue depois de passar por `approved`. ⚠️ Deriva no item 5: o `build` não roda os testes contra emulador. Publicar `storage.rules` e ativar o bucket seguem passo manual (`PRE-PRODUCTION.md` §6) |
| `accessibility-conformance` | 2026-09-29 | [`docs/features/accessibility-conformance/spec.md`](../docs/features/accessibility-conformance/spec.md) — **6/6 do corte** (PR #32, `3e5ec4c`), allowlist do axe vazia e `e2e` 22/22 no merge. Terceira spec entregue depois de passar por `approved`. ⚠️ Duas derivas de letra (título por área, `aria-invalid="false"` sem erro); checkout em carregamento e leitor de tela real seguem 🔒. O diff introduziu e corrigiu antes do merge o "Excluir" ilegível no hover |
| `account-email-change` | 2026-09-29 | [`docs/features/account-email-change/spec.md`](../docs/features/account-email-change/spec.md) — **5/5 do corte** (PR #33, `f377c84`), 16 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real do aviso pela Resend). Quarta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no comportamento; o diff introduziu e corrigiu antes do merge dois defeitos de foco no diálogo novo. Resend, `FIREBASE_WEB_API_KEY` e o e-mail de suporte são passo manual por fork (`PRE-PRODUCTION.md` §3, §4 e §13) |
| `compliance-docs-kit` | 2026-09-30 | [`docs/features/compliance-docs-kit/spec.md`](../docs/features/compliance-docs-kit/spec.md) — **6/6 do corte** (PR #34, `c7aa4d9`), 18 ✅, 0 ❌ e 2 🔒 no `/test` (backup no Blaze e conformidade jurídica). Quinta spec entregue depois de passar por `approved`. ⚠️ Cinco derivas sem efeito no conteúdo. Preencher os `[FORK]`, aceitar os DPAs e decidir o backup são passo manual por fork (`PRE-PRODUCTION.md` §14) |

**Verificado na auditoria de 2026-09-30 (pós-PR #35):** `docs/features/` tem **31** pastas e **25** `spec.md`
arquivados. As seis pastas sem `spec.md` são `account-security-mfa` e `observability-logging` (specs
`in-progress` em `specs/`), `auth-panel-context` e `impersonation-read-only` (as duas anteriores à semeadura),
`i18n-hydration-admin-delete-billing` e `disabled-account-revocation` (tarefas diretas, sem spec, listadas em
[Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec)). Nenhuma spec foi arquivada nesta rodada.

### O que a PR #27 entregou **além** do corte (registrado em 2026-09-25)

1. **O webhook parou de ecoar o evento Stripe** na resposta de sucesso: `route.ts:242` devolve só
   `{ ok: true }`.
2. **A checagem de `ALREADY_EXISTS` do Firestore virou helper compartilhado** (`isAlreadyExistsError`,
   `apps/api/(shared)/infra/firestore-errors.ts:4`), usado pelos repositórios de fatura e de ativação.
3. **Aviso de endpoint incompleto.** Com assinatura vigente e nenhuma fatura paga registrada, a seção avisa
   que falta `invoice.paid` no endpoint (`BillingInsightsSection.tsx:76-83`), em vez de mostrar receita
   zero sem explicação.
4. **A declaração do expurgo ganhou as duas coleções novas** (`docs/PRE-PRODUCTION.md:739`, âncora remedida
   em 2026-09-30 no working tree, com a PR #35 e a tarefa `arcjet-key-lazy-validation` somando seis linhas antes dela): ficam depois da exclusão, porque guardam só ids da Stripe, valor, moeda e datas.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida ao passar por ela. Nesta rodada foram medidos os documentos que a PR #35 alterou
(`docs/INCIDENT-RESPONSE.md`, `docs/BACKUP.md`, `docs/PRE-PRODUCTION.md`) e os que citam o `PUT /users/[id]`. A
auditoria não edita `docs/`; o que está defasado fica registrado aqui.

| documento | afirma | realidade medida em 2026-09-30 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md:613-622` (§9, gate) | medição no `c7aa4d9`: 29/29 tasks, 806 arquivos, 2452 testes em 226 arquivos | no `1936369`: 29/29 tasks, **806** arquivos, **2466** em **226**; `test:emulator` 170 em 4 | ⚠️ **defasado em 14 testes** pela PR #35, que atualizou o §9 com a medição da rodada anterior e somou os próprios testes depois. **No working tree**, a tarefa `arcjet-key-lazy-validation` já reescreveu o §9 com 2485 testes em 227 arquivos, contando os seus; a auditoria não remediu esse número |
| `docs/PRE-PRODUCTION.md:587-588` (§9) | proteção remedida em 2026-09-24: 404, `[]` | 404 e `[]` hoje | ✅ **honesto**; a data é a de uma medição antiga, o estado é o mesmo |
| `docs/SUBPROCESSORS.md:25-86` e `ROPA.md`, `INCIDENT-RESPONSE.md`, `BACKUP.md` (âncoras) | 91 `arquivo:linha` de código | todos existem e cabem no arquivo; seis conferidos por leitura (`server.ts:180-183`, `:323-325`, `users/[id]/route.ts:87`, `sessions/revoke/route.ts:7-8`, `session.ts:150`, `:161`) | ✅ **honesto** |
| os mesmos quatro (links) | 38 links relativos | 0 mortos | ✅ **honesto** |
| `docs/SUBPROCESSORS.md:88-96` (o que não entra) | `@stripe/agent-toolkit` sem consumidor; sem `next/font/google`; sem Firebase Analytics | `git grep` por `payments/ai`, `next/font/google`, `getAnalytics` e `firebase/analytics` em `apps` e `packages`: 0 | ✅ **honesto** |
| `docs/SUBPROCESSORS.md` (Vercel) | os `vercel.json` do repo não definem `regions` | `grep -c regions` nos três: 0 | ✅ **honesto** |
| `docs/INCIDENT-RESPONSE.md:51-52` (conta desativada) | a API recusa a conta desativada na requisição seguinte, nos dois transportes; o `PUT` revoga as sessões (`users/[id]/route.ts:87`, `:117-122`, `:124-126`); `server.ts:180-183`, `:284-302`; `resolve-api-actor.ts:24` | as seis âncoras conferem no `1936369`; `getCurrentUser` recusa `user.disabled` em `server.ts:182` | ✅ **honesto**, reescrito pela PR #35 junto com a correção. A célula tem uns 900 caracteres, como o `/review` da tarefa notou; o conteúdo confere |
| `docs/BACKUP.md:94` | o arquivamento pelo admin marca `deletedAt` em `users/[id]/route.ts:173` | `:173` é `userRepository.delete(id)` | ✅ **honesto**, âncora corrigida pela PR #35 |
| `docs/PRE-PRODUCTION.md:894-898` (contas de QA) | a tarefa `disabled-account-revocation` criou e apagou a própria conta de QA | o `test/report.md` da tarefa descreve a limpeza e a conferência (`auth/user-not-found`, 0 eventos) | ✅ **honesto** pelo artefato; o console do Firebase não foi aberto (pendência 15) |
| `docs/SECURITY.md:15-17` (guards) | 32 arquivos de rota, 20 com guard, 12 nus, 9 em `/auth/*` | recontado: 32, 20, 12 (9 em `/auth/*`, os dois `health` e o webhook) | ✅ **honesto** |
| `docs/FORKING.md:437` (link) | aponta para `../README.md#crud-de-referência` | o README renderizado pelo GitHub (`gh api repos/:owner/:repo/readme` em HTML) publica o id `user-content--crud-de-referência`, com `href="#-crud-de-referência"` | ❌ **link morto, medido**. A PR #34 empurrou a linha de `:432` para `:433` |
| `docs/features/disabled-account-revocation/STATE.md` | `branch: fix/disabled-account-revocation (proposta; o workspace segue em run-cycle-pipeline)`; notas citam `BACKLOG.md:617` e `:235-259` | a PR #35 saiu dessa branch; as linhas citadas eram do `BACKLOG.md` anterior à auditoria pós-PR #34 | ⚠️ **defasado só no parêntese e nas linhas**; o nome está certo. Fica como está: a auditoria só escreve em `docs/features/` para arquivar spec |
| `docs/features/compliance-docs-kit/STATE.md` (`branch:`) | `docs/compliance-docs-kit`, proposta | a PR #34 saiu de `run-full-task-cycle-v2` | ⚠️ **defasado**, estacionado em E11 |
| `docs/features/account-email-change/STATE.md` | tabela: `review` `done`; notas: "a etapa `review` segue `in-progress`" | PR #33 mergeada com CI verde | ⚠️ **contradição interna**, estacionada em E11 |
| `docs/features/e2e-testing/STATE.md` (`/test`) | `blocked` pelo D3 | o job `e2e` passou em todas as execuções seguintes, inclusive o merge da #34 | ⚠️ **defasado**, fica como está por decisão do usuário |
| `docs/features/accessibility-conformance/STATE.md`, `account-security-mfa/STATE.md` e `brand-config/STATE.md` | `review: in-progress` / `branch: -` | PRs #29, #30 e #32 mergeadas | ⚠️ **defasados**, estacionados em E11 |
| `docs/AUTH-SSO.md:66-71` e a pendência do modo `simple` no `PRE-PRODUCTION.md` | redirecionamento do comum para a web no `simple` | não remedido; estacionado (E10) | ⚠️ nota de medição anterior segue no lugar |

Os documentos que as rodadas anteriores mediram e que a PR #35 não tocou (`docs/ROPA.md`, `docs/SUBPROCESSORS.md`,
`docs/FORKING.md`, `docs/SECURITY.md`) mantêm o veredito da tabela acima; a PR #35 não criou rota nem mudou
guard, então as contagens do `docs/SECURITY.md:15-17` seguem certas. Os que a PR #34 também não tocou (`docs/PAYMENTS.md`, `docs/SETUP.md`,
`AGENTS.md`, `packages/CLAUDE.md`, `docs/ARCHITECTURE.md`, `apps/app/CLAUDE.md`, `README.md`) mantêm o veredito
de lá.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

**Nenhuma deriva de spec nesta rodada**: nenhuma spec foi entregue, e as quatro vivas não ganharam código. A
tarefa direta da PR #35 não tinha corte de spec; contra a recomendação da rodada anterior, entregou o que foi
prometido (as duas mudanças de código, os testes de unidade, o runbook e o achado em `account-security-mfa`) e
acrescentou duas correções de documento que o diff tornou necessárias (`docs/BACKUP.md:94` e o §9 do
`PRE-PRODUCTION.md`).

**Deriva de pipeline:** a branch `fix/disabled-account-revocation` não tem o `<project>` de
`<project>/<type>/<title>` e ficou viva no remoto depois do merge, como a `run-full-task-cycle-v2` da PR #34
(E11, pendência 16).

### Âncoras deslocadas, corrigidas nesta rodada

A PR #35 alterou quatro arquivos de código e três documentos. `packages/auth/server.ts` trocou três linhas de
JSDoc por três, então nenhuma âncora do arquivo se moveu (conferido: `getCurrentUser` segue em `:173`, a
checagem em `:182`, `revokeUserSessions` em `:323`). O `PUT /users/[id]` ganhou quatro linhas a partir da
`:124`. O `docs/PRE-PRODUCTION.md` ganhou uma linha na `:631` (§9) e cinco na `:889` (higiene). Cada âncora
abaixo foi lida no disco.

| onde | citado | real hoje | causa |
|------|--------|-----------|-------|
| este arquivo, achado do admin que se desativa | `users/[id]/route.ts:87-126` | **`:87-143`** | o `PUT` inteiro, que agora termina na `:143`; a faixa antiga cortava o handler no meio |
| este arquivo, lacuna "Banir usuário pelo admin" | `users/[id]/route.ts:117-121`, `UsersListClient.tsx:102-119` | **`:117-126`**, **`:102-125`** | a revogação entrou em `:124-126`; o `onCheckedChange` do switch vai até a `:125` |
| este arquivo, pendência 26 | `PRE-PRODUCTION.md:690-701` (§13) | **`:691-702`** | a linha nova do §9 |
| este arquivo, PR #27 item 4 | `PRE-PRODUCTION.md:733` | **`:734`** | idem |
| este arquivo, 🔴 da conta desativada | `server.ts:180-184`, `users/[id]/route.ts:117-122` | movido para os fechados, com `server.ts:181-183` e `route.ts:124-126` | o achado fechou |

**Deslocadas pela tarefa `arcjet-key-lazy-validation`, ainda no working tree.** O diff dela acrescentou 23
linhas a `apps/api/instrumentation.ts`, tirou 2 de `packages/security/index.ts` e mexeu em cinco documentos. As
âncoras abaixo foram remedidas no arquivo do working tree e só valem depois do merge; em `main` seguem as
antigas.

| onde | citado | real no working tree | causa |
|------|--------|----------------------|-------|
| `observability-logging`, linhas 56 e 60 | `apps/api/instrumentation.ts:19` | **`:20`** | o import de `arcjetKeyState` na linha 1 |
| `observability-logging`, linhas 81 e 163 | `instrumentation.ts:58-59` | **`:76-77`** | `warnOnDisabledRateLimit` (`:25-45`) |
| `observability-logging`, linha 123 | `instrumentation.ts:35-56` | **`:58-74`** | idem |
| `observability-logging`, linhas 148 e 241; `account-security-mfa`, linha 341 | `packages/security/index.ts:42-44` | **`:40-43`** | a leitura da chave passou para dentro de `checkRateLimit` (`:40`) |
| este arquivo, `CORS_ORIGIN` | `instrumentation.ts:40-44` | **`:63-67`** | idem ao primeiro |
| este arquivo, `isRateLimitEnforced()` | `index.ts:32` | **`:30`** | o `const` do topo saiu |
| este arquivo, contradições, pendências e achados | `PRE-PRODUCTION.md:583-584`, `:609-617`, `:691-702`, `:734`, `:889-893`, §8 `:567-577` | **`:587-588`**, **`:613-622`**, **`:696-707`**, **`:739`**, **`:894-898`**, **`:567-582`** | quatro linhas no §8 (chave malformada) e uma no §9 |
| este arquivo, link do CRUD de referência | `FORKING.md:433` | **`:437`** | quatro linhas no §7.3 (Arcjet) |
| este arquivo, cadastro sem trava | `SECURITY.md:159` | **`:160`** | uma linha sobre a chave sem prefixo em `:158` |

**Não corrigidas, porque a auditoria não edita spec arquivada:** a
[`spec de compliance-docs-kit`](../docs/features/compliance-docs-kit/spec.md) cita `PRE-PRODUCTION.md:670`
(real `:671`), `:702-718` (real `:703-719`), `:704-707` (real `:705-708`) e `:741` (real `:742`), na linha 32 e
na linha 60. O texto apontado é o mesmo, uma linha abaixo.

As demais âncoras em `docs/PRE-PRODUCTION.md` citadas neste arquivo (`:54-58`, `:454-455`, `:567-577`,
`:575-577`, `:583-584`, `:609-617`) ficam antes da `:631` e foram relidas em `main`: conferem (as que a
tarefa seguinte deslocou no working tree estão na tabela acima). As specs vivas não citam
linha de `docs/`. As âncoras de `users/[id]/route.ts` em `account-security-mfa` (`:120-126`),
`observability-logging` (`:163`) e `plan-entitlements` (`:49`) conferem, assim como as deste arquivo para o
`DELETE` (`:161`, `:162-171`, `:161-173`), corrigidas pelo `/review` da tarefa. A contagem de `logEvent(` fora de
testes em `observability-logging` segue em **33**, recontada; a PR #35 não acrescentou nem tirou chamada de
`logEvent` ou de `console` (`git diff c7aa4d9 1936369 -- apps packages`, fora de testes: 0 linhas). A tarefa `arcjet-key-lazy-validation` acrescenta, no working tree, um `console.error` de boot
(`apps/api/instrumentation.ts:41`), do mesmo tipo dos avisos de boot que a spec já conta; a contagem não foi
refeita.

### O que a auditoria **não** encontrou

Nenhuma spec `done` perdeu código. Nenhuma feature em `docs/features/*/STATE.md` deveria ter `spec:` e não tem.
Nenhuma entrega parcial órfã: as quatro specs que seguem em `specs/` foram conferidas por `grep` (entitlements,
segundo fator, organizações e coletor de erro) e nenhuma ganhou código por tabela. Nenhum arquivamento, então
nenhuma colisão possível.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-09-30 (pós-PR #35).** A rodada anterior fechou com 83 linhas abertas (82 da auditoria e
> o 🟢 que o `/review` da tarefa acrescentou); o número não foi recontado linha a linha nesta rodada. A PR #35
> alterou quatro arquivos de código: `packages/auth/server.ts`, `apps/api/app/(routes)/users/[id]/route.ts` e
> dois testes. As linhas que citam esses arquivos foram reabertas no disco; as demais seguem iguais, porque o
> arquivo é o mesmo byte a byte. **Placar: 1 fechado (o 🔴 da conta desativada) · 1 novo (`GET /auth/me` sem
> `error.code`, visto no `/test` da tarefa) · 2 âncoras remedidas (o achado do admin que se desativa e a lacuna
> "Banir usuário") · 83 abertos.** As duas lacunas de
> teste novas do `/test` da tarefa estão na seção dela e não entram no placar, como nas rodadas anteriores.

### ✅ Fechados na auditoria de 2026-09-30 (PR #35)

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| 🔴 **Conta desativada pelo admin seguia com o ID token aceito pela API até ele expirar** | `packages/auth/server.ts:180-184` · `apps/api/app/(routes)/users/[id]/route.ts:117-122` (antes da PR #35) | `getCurrentUser` recusa `user.disabled` no registro que já carrega (`server.ts:181-183`) e o `PUT` revoga as sessões ao desativar (`route.ts:124-126`). Testes de unidade com o Firebase mockado: `serverSessionRevocation.test.ts:140-190` e `usersAdminAuditTrail.test.ts:258-297`, 4 deles derrubados por mutação no `/test`. Medido contra o projeto de desenvolvimento pelo `/test` da tarefa: `401 AUTH_INVALID_TOKEN` no bearer da conta desativada. O runbook (`docs/INCIDENT-RESPONSE.md:51-52`) e a seção ligada de [`account-security-mfa`](account-security-mfa.md) foram reescritos no mesmo diff |

### ✅ Fechados na auditoria de 2026-09-29 (PR #32)

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| 🟡 **Sete grupos de violação passavam pela allowlist da suíte E2E** | `apps/e2e/a11y/allowlist.ts` (antes da PR #32) | A allowlist é `[]` (`allowlist.ts:20`) e o `e2e` do merge passou 22/22. Toggle de senha, `Link` dentro de `Button` na web (hero, CTA, FAQ, preços), contraste de `muted` sobre `muted`, `<title>` do painel, `Select` do navbar e `Switch` das linhas corrigidos no componente ou no call site |
| 🟡 **Os `HookForm*` publicavam `aria-invalid="false"` com o erro visível** | `packages/design-system/components/form/hookform/` (antes da PR #32) | Os oito usam `FormField` + `FormControl`, e os compostos repassam `aria-describedby`. Teste: `hookformAria.test.tsx` |
| 🟡 **`--destructive` do escuro com 1,97:1 como texto** | `packages/design-system/styles/globals.css:63` (antes da PR #32) | Token no valor do upstream (`:63`) e override do `Dropdown` no antd (`antd-app.tsx:75-78`). O `/test` mediu o texto de erro e o "Excluir" em repouso e hover nos dois temas. Teste: `themeContrast.test.ts` |
| 🟡 **`Button` com `loading` perdia o nome acessível** | `packages/design-system/components/ui/button.tsx:72-73` (antes da PR #32) | O texto fica em `sr-only` e o spinner sai da árvore (`button.tsx:63-84`). Teste: `button.test.tsx`. O checkout em carregamento segue 🔒 sem Stripe de teste |
| 🟡 **O gatilho do `ActionsMenu` era um `<div>` sem papel nem nome** | `packages/design-system/components/ui/action-menu.tsx:103-110` (antes da PR #32) | É um `<button>` com `aria-label` do dicionário (`action-menu.tsx:104-113`); a suíte E2E passou a clicar por papel e nome (`entityCrud.spec.ts`) |
| 🟡 **O `ActionsMenu` não tinha teste do próprio componente** | `apps/app/__tests__/usersListArchiveLabels.test.tsx:37` (só mock) | `packages/design-system/__tests__/actionMenu.test.tsx` renderiza o componente real (4 testes) |
| 🟡 **Iniciais do avatar abaixo do AA no claro** | `ui/avatar.tsx` · `Sidebar.tsx` | `--muted-foreground` do claro em `oklch(0.54 0 0)` (`globals.css:21`); o `/test` mediu no estilo computado |
| 🟡 **Avatar do menu de perfil sem `alt`** | `apps/app/shared/components/ui/ProfileDropdown.tsx:45` | `<AvatarImage alt="" src={avatarSrc} />`; o `/test` rodou o axe com avatar enviado, sem `image-alt` |
| ◐ **O formulário de contato da `apps/web` falhava a hidratação** (`button` dentro de `button`) | `apps/web/app/[locale]/contact/components/contact-form-client.tsx:79-80` | `PopoverTrigger asChild` (`:79`) tira o aninhamento. **Fechado só por leitura:** o `Minified React error #418` em `next build && next start` não foi remedido, e a rota `/contact` não está na suíte E2E |

**Fechado pela metade:** "`packages/shared` sem `typecheck`; `@repo/design-system` sem `test`". O design system
ganhou a task (`package.json:7`); o `packages/shared` segue sem `typecheck`. A linha continua na seção de
dependências.

### ✅ Fechados nas auditorias de 2026-09-26 (PR #28) e 2026-09-28 (PR #30)


| achado | onde estava | como fechou |
|--------|-------------|-------------|
| ⚠️ **Soft delete de usuário pelo admin não cancelava a assinatura** (A2) | `apps/api/app/(routes)/users/[id]/route.ts:117` (antes da PR #28) | A PR #28 cancela a assinatura viva antes do soft delete (`route.ts:161`) e recusa com 503 `USERS_DELETE_BILLING_FAILED` quando não consegue (`:162-171`). Teste: `usersAdminDeleteBilling.test.ts` |
| 🟡 **Componente client renderizava em pt-br no servidor em `/en` e `/es`**, e a hidratação falhava | `packages/internationalization/utils/cookies.ts:2-4` · `client.ts:8` (antes da PR #28) | A PR #28 pôs o `LocaleProvider` nos root layouts e fez o `getDictionary()` do client ler o segmento `[locale]` (`client.ts:40-57`). O cookie ficou só como fallback de árvore sem provider. Teste: `localeProvider.test.ts` |
| ◐ **`Link` dentro de `Button` na web**, parte do header | `apps/web/app/[locale]/components/header/index.tsx` | A PR #28 tirou os quatro `<a>` de dentro de `<button>` e o `a > button > a` do header (teste `headerInteractiveNesting.test.tsx`). Hero, CTA, FAQ e preços seguem com o padrão; o achado da allowlist continua aberto |
| 🟡 **`/favicon.ico` não existia na `apps/app` e caía no segmento `[locale]`** | `apps/app/app/` (antes da PR #30) | A PR #30 pôs `favicon.ico`, `icon.png` e `apple-icon.png` na raiz de `apps/app/app/`; o `/test` mediu `200 image/x-icon` em `next start`. Teste: `appIcons.test.ts` |
| 🟡 **`emailBrand.supportEmail` era configuração morta** | `packages/email/brand.ts:9` (antes da PR #30) | O contato de suporte saiu de `emailBrand` e virou `getBrand().supportEmail`, lido pelo rodapé dos e-mails (`packages/email/components/layout.tsx:98-104`) |
| 🟡 **`NEXT_PUBLIC_APP_NAME` era lida sem estar declarada** | `packages/seo/metadata.ts:14` · `apps/web/shared/lib/seo.ts:18` (antes da PR #30) | Declarada em `packages/next-config/keys.ts:45`, que os três `env.ts` estendem (`apps/app/env.ts:8`, `apps/web/env.ts:8`, `apps/api/env.ts:9`), junto com logo e suporte (`:46-47`) |
| 🟡 **O "Acme" e o "company name" que um fork esquecia** | `packages/email/brand.ts:7` · `Sidebar.tsx:79` (antes da PR #30) | Os dois leem `getBrand().name` (`Sidebar.tsx:68`, `:88`; `packages/email/components/layout.tsx:39`). `git grep -i "acme\|company name"` fora de testes: só o seed e um comentário |

### ⚠️ Achados abertos, reconferidos ou herdados

Reconferidos em 2026-09-30, pós-PR #35, que não alterou nenhum dos arquivos desta tabela.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| 🟡 **As rotas de `payments/` que chamam a Stripe estão fora do rate limit** | `apps/api/proxy.ts:45-58` | Cada chamada vai à Stripe: o catálogo lista preços, o checkout cria cliente (com chave de idempotência) e sessão, o portal cria sessão. As três exigem sessão, então o abuso depende de conta válida, mas um cliente em loop consome a cota de API da Stripe do fork. `docs/SECURITY.md:151-153` não as lista entre as que ficam de fora (âncoras remedidas em 2026-09-30) |
| 🟡 **`findByStripeCustomerId` devolve o documento cru, sem mapper** | `apps/api/(shared)/repositories/user.repository.ts:67-78` | `{ ...(live.data() as UserDTO), id }` entrega `Timestamp` onde o tipo promete `Date`. Hoje o webhook só lê `id` e `stripeCustomerId`, então não quebra nada. Com o A2 fechado, o perfil arquivado já não tem assinatura viva quando o webhook deixa de achá-lo; quebra no primeiro chamador que ler uma data. Contraria a regra de ouro 5 (normalizar no mapper) |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:26-27` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **O webhook responde 500 para assinatura inválida** (A4) | `webhooks/payments/route.ts:222-224` → `failure()` em `:187-191` | A Stripe reentrega por até três dias um evento que nunca vai validar. Um 400 encerra as tentativas. `api-hardening` está arquivada, então é tarefa direta |
| 🟡 **O deep link do onboarding perde a query string** | `apps/app/proxy.ts:222` | O proxy grava só o `pathname`. Afeta link de listagem filtrada ou paginada aberto antes do onboarding. Saiu de "Precisam de decisão" pela §5.1: tarefa direta P, gravar `pathname + search` e um caso a mais em `proxy.test.ts` |
| 🟡 **O `getDictionary()` do servidor lê o cookie `x-locale`, não a URL** (fusão, em 2026-09-26, dos achados de `<html lang>` e das páginas da web) | `packages/internationalization/server.ts:18-20` · `apps/app/app/layout.tsx:48`, `:73` · `apps/web/app/[locale]/layout.tsx:23`, `:30` · `apps/web/proxy.ts:107-111` · ex.: `apps/web/app/[locale]/pricing/page.tsx`, `(home)/components/hero.tsx` | O `<html lang>` das duas apps sai do cookie: `/en/sign-in` com `x-locale=pt-br` sai com `lang="pt-br"` (O4 do `/test` da PR #24). Na `apps/web`, o proxy grava o cookie na mesma resposta, então a primeira visita a `/en` sem cookie renderiza os Server Components em pt-br e os componentes client em inglês (medido pelo `/test` da PR #28, que corrigiu só o lado client). Atinge as ~20 páginas e componentes da web que chamam `getDictionary()` sem argumento; leitor de tela pronuncia a página no idioma errado. Era a pergunta 3 da seção 14 do plano de `i18n-hydration-admin-delete-billing`. Tarefa M |
| 🟡 **Lacunas de teste do arquivamento pelo admin** (nova, PR #28) | `apps/api/app/(routes)/users/[id]/route.ts:161-173` · `apps/api/__tests__/usersAdminDeleteBilling.test.ts` | Não há teste para o cancelamento que passa seguido do soft delete que falha (Firestore fora) nem para o duplo clique no "Sim" do diálogo. O `/review` da PR descreveu por leitura o primeiro caso como recuperável: a assinatura já cancelada conta como cancelada na tentativa seguinte (`(shared)/lib/billing.ts:162-173`) |

### 🆕 Achados da entrega `e2e-testing`

Registrados pelo `/review` da suíte E2E. Eram três: a allowlist e o gatilho do `ActionsMenu` fecharam com a PR
#32 e estão na lista de fechados. O CTA do hero segue aberto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O CTA primário do hero diz "Entrar" e leva a `/contact`** | `apps/web/app/[locale]/(home)/components/hero.tsx:28-42` (destino em `:36`) · o mesmo par no bloco final (`cta.tsx:29`, `:33`) | Texto e destino não combinam. A suíte E2E não afirma esse comportamento, para não transformar o defeito em contrato. Reconferido em 2026-09-29: a PR #32 trocou o `Button` por `Link` com `buttonVariants` e manteve rótulo e destino |

### 🆕 Achados da fatia 1 de `account-security-mfa` (PR #29)

Vindos do plano, do `/review` e do `/test` da fatia, conferidos no código em 2026-09-27. Nenhum bloqueia a
entrega; os três ficaram fora dela por decisão registrada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Reenviar o cadastro depois de conta criada e login falho responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`** | `apps/app/.../sign-up/components/SignUpFormClient.tsx:112-119` · `apps/web/.../sign-up/components/sign-up-form-client.tsx:34-40` | A criação e o login são duas chamadas. Se a primeira passa e a segunda falha (rede, 429, cookie de sessão), a pessoa reenvia, recebe "e-mail já cadastrado" e precisa ir ao login por conta própria. O `/review` deixou como está porque a correção muda o fluxo; a alternativa registrada é tentar o `signIn` quando o reenvio receber esse código logo depois de um 201 na mesma tela |
| 🟡 **`create-dev-admin.mjs` não aplica a política de senha** | `apps/api/scripts/create-dev-admin.mjs:36-46` | O script cria administrador com qualquer senha que o Firebase aceite (6 ou mais). Fora da fatia por decisão do plano (P4): o script roda em Node puro e repetir a constante criaria a 12ª cópia. Afeta só quem opera o fork |
| 🟡 **Sem `ARCJET_KEY`, nada limita a criação de contas em massa** | `apps/api/proxy.ts:47` (`/auth/sign-up` na lista) · `docs/PRE-PRODUCTION.md:575-577` · `docs/SECURITY.md:160` (âncoras remedidas em 2026-09-30, a segunda no working tree) | A rota cria a conta pelo Admin SDK, que não passa pelo limite do Firebase de 100 contas por hora por IP. A rota está na lista de rate limit, mas o limite é no-op sem a chave. Está escrito nos dois documentos; o critério 19 do `/test` ficou 🔒 |

### 🔴 Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/security/index.ts:11`** lê `keys().ARCJET_KEY` no **import**, e a `apps/api` publica um build que responde erro a toda requisição | `packages/security/index.ts:11` · `packages/security/keys.ts:9-15` · `apps/api/proxy.ts:1` · `apps/api/instrumentation.ts:46-50` (âncoras de `main`, `1936369`) | Reconferido em 2026-09-30, pós-PR #35, e **corrigido pela medição da tarefa**: uma `ARCJET_KEY` presente e sem o prefixo `ajkey_` lança dentro do grafo de módulos do middleware da API, e toda requisição falha (o `/test` mediu `500` sem `x-request-id` em `GET /health` com o `index.ts` de `main`). O aviso de boot só confere se a variável existe. Em `apps/app` e `apps/web` o efeito é outro, e menos grave: o `next build` recusa a chave em "Collecting page data", porque o `env.ts` das duas estende o schema estrito; nenhuma das duas chega a publicar. Único 🔴 aberto. **Em execução** desde 2026-09-30 como [`arcjet-key-lazy-validation`](../docs/features/arcjet-key-lazy-validation/STATE.md), no working tree e sem PR: fecha no `/spec --sync` depois do merge |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** | `apps/api/instrumentation.ts:63-67` | Reconferido: `throw` em `:63-67` no working tree (desceu 23 linhas com o aviso de chave malformada da tarefa `arcjet-key-lazy-validation`; em `main` segue em `:40-44`), zero `process.exit`. `/health/ready` detecta parte das falhas, não esta |
| ⚠️ **Quatro das sete rotas de `/account` seguem fora do rate limit**, entre elas a troca de senha | `apps/api/proxy.ts:45-58` | Recontado em 2026-09-30: a PR #33 criou `POST /account/email` já na lista (`:57`). Ficam fora o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding`. A PR #25 acrescentou `POST /payments/checkout` e `POST /payments/portal`, também fora; cada checkout pode criar uma sessão na Stripe |
| ⚠️ **Superfície não-guardada da API: 12 de 32** arquivos de rota exportam handler nu, 9 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado em 2026-09-30: 32 arquivos, 20 com guard. A PR #33 acrescentou `account/email` (com guard) e `auth/email-change/confirm` (nua, como as outras confirmações por link, e na lista de rate limit). Os 12 nus: 9 em `/auth/*`, os dois `health` e o webhook de pagamento. `docs/SECURITY.md:15-17` traz os mesmos números |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:87` · `packages/auth/session.ts:78-81` | Reconferido. A parte documental está fechada (`docs/SECURITY.md:155`, âncora remedida em 2026-09-30); o comportamento segue |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Dependência importada sem ser declarada**: `apps/app/env.ts:1` importa `@repo/email/keys` sem `@repo/email` no `package.json`; `apps/web` importa `@repo/auth` em **8 arquivos** sem declará-lo | `apps/app/package.json` · `apps/web/package.json` | Reconferido, os dois `grep` no `package.json` devolvem 0. Funciona por hoisting; o turbo não invalida `web#*` quando `@repo/auth` muda |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` não existe. **Vigésima primeira auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` do resto | `packages/auth/package.json:24` | Reconferido em 2026-09-27; a âncora subiu uma linha porque a PR #29 tirou o export `./components/sign-up` |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: 0 |
| 🟡 **`input-otp.tsx` é código morto** | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: só ele, o barril, o `package.json` do pacote e o `playground`. `account-security-mfa` (fatia 3, segundo fator) é quem o usaria |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: 0 importadores |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-12` | Reconferido em 2026-09-26, depois da PR #28 mexer no arquivo: falta `"./utils/*"`, e `"."` (`:6`) aponta para `index.ts`, que não existe |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:30` | Reconferido no working tree: a tarefa `arcjet-key-lazy-validation` passou a função a ler a chave por chamada e a âncora subiu de `:32` para `:30`. Todas as referências seguem em `__tests__/rateLimit.test.ts` (agora 9) |
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts:109` (âncora remedida em 2026-09-30) segue sem relação |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:214` | Reconferido em 2026-09-27 (a âncora subiu dez linhas com a saída do `signUp` na PR #29): só `useEmailVerification.test.tsx`, que a mocka |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`** | `packages/shared/package.json:11` (só `test`) | Metade fechada pela PR #32: o `@repo/design-system` ganhou a task de `test` (`packages/design-system/package.json:7`, 45 testes). Falta o `typecheck` do `packages/shared`, adiado desde a primeira auditoria |
| 🟡 **`welcomeEmail` sem chamador de produção**; o formulário de contato da landing segue maquete | `packages/email/templates/welcome.tsx:50` | Reconferido: 4 ocorrências, 3 em teste. O canal de privacidade da `apps/web` cai nesse formulário quando `NEXT_PUBLIC_PRIVACY_CONTACT` está vazia (`privacyContact.ts:17-18`), então o fallback do canal aponta para uma maquete |
| 🟡 **`useListAuditEvents.test.tsx` deixa trabalho do React pendente depois do teardown** (novo, 2026-09-28) | `apps/app/__tests__/useListAuditEvents.test.tsx:55-70` (um `QueryClient` por teste, sem `clear()` nem `unmount` ao fim) | A suíte da `apps/app` falhou em 2 de 6 execuções locais em 2026-09-28 com `ReferenceError: window is not defined`, que o Vitest atribui a este arquivo: os testes passam e o erro não tratado reprova a task. Na auditoria pós-PR #31 passou nas 6 execuções (688 testes cada) na pós-PR #32 também (6 de 6, 702 testes cada) e na pós-PR #33 também (6 de 6, 756 testes cada), então o acumulado é 2 falhas em 24. O arquivo não muda desde a PR #18. O CI passou nas execuções de merge das PRs #29 a #33. Correção provável, não testada: limpar o `QueryClient` e desmontar o hook no `afterEach`. Tarefa direta P |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:138` | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:148`). N+1 do Admin SDK. Décima rodada aberto; âncoras desceram de novo com os agregados de cobrança da PR #27 |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:122` · `:134` · `:138` · `:157` · `:175` | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` da api não tem consumidor e não segue o contrato de erro** | `apps/api/app/(routes)/auth/sign-in/route.ts:12` | Reconferido: zero `try`, `:12` devolve string crua (`"User not found"`). Viola a regra de ouro 3. O `sign-up` ganhou chamador indireto de `createDefaultUserProfile` na PR #24 e tem `try`. **Medido em 2026-09-30** pelo `/test` de `arcjet-key-lazy-validation`, contra o build de produção da API: sem corpo, `req.json()` (`:5`) lança `SyntaxError: Unexpected end of JSON input` e a rota responde `500`; com `{}`, o Identity Toolkit recusa a credencial, `identitySignInWithPassword` (`:7`) lança `IdentityToolkitError` e a resposta é `500` de novo. Nos dois casos o proxy passou (a resposta traz `x-request-id`), então o erro é do handler |
| 🟡 **`GET /auth/me` responde 401 com `{ message }`, sem `error.code`** (novo, 2026-09-30) | `apps/api/app/(routes)/auth/me/route.ts:9-12`, `:18-21` | Visto no `/test` da PR #35 (`test/report.md:88`): o bearer da conta desativada recebe `401 {"message":"Invalid or expired token"}` aqui e `401 AUTH_INVALID_TOKEN` nas rotas com guard. Viola a regra de ouro 3; o front não consegue traduzir. O consumidor é o `apps/app/lib/server/authSession.ts`. Mesma família do `/auth/sign-in`; P, junto com ele |
| 🟡 **`skipValidation` incondicional na `apps/web`, e por causa dele o bloqueio de bot da landing nunca roda** (ampliado em 2026-09-30) | `apps/web/env.ts:33` · `apps/web/proxy.ts:63` (`if (!env.ARCJET_KEY) return;`) · `:68` (`secure()`) | Com `skipValidation: true`, o `createEnv` do `@t3-oss/env-core@0.13.8` devolve só o `runtimeEnv` do próprio módulo e descarta o que veio de `extends` (`if (skip) return runtimeEnv;`, antes do merge). Como o `runtimeEnv` da web não declara `ARCJET_KEY`, `env.ARCJET_KEY` sai sempre `undefined`, mesmo com chave válida, e o `secure()` é pulado. Medido pelo `/test` de `arcjet-key-lazy-validation` com um probe de import: `ajkey_ok` dá `"ajkey_ok"` no `env.ts` da `apps/app` e `undefined` no da `apps/web`. A metade do `NEXT_PUBLIC_APP_URL` fechou com a PR #25. **§5.1:** o `skipValidation` já tinha voltado intacto em várias rodadas como "recomendação"; ele fica aqui como dívida técnica com `arquivo:linha`, e a parte que exige julgamento (ligar o bloqueio de bot) sai como a pergunta D8 e não é reapresentada depois. Tirar o `skipValidation` sem decidir a D8 liga o bloqueio por tabela, então as duas coisas andam juntas. P, depois da D8 |
| ◐ **O bounce do proxy apaga a query string**, corrigido só para as rotas de `oobCode` | `apps/app/proxy.ts:196-210` | Reconferido: `redirectUrl.search = ""` em `:208` (âncoras desceram quatro linhas com a CSP do emulador de Storage da PR #31). Mesma família do achado novo do deep link do onboarding |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:177,181` | Reconferido em 2026-09-29: `cookieStore.set` sem `maxAge` |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Décima rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O header logado da `apps/web` rola na horizontal no desktop** | `apps/web/app/[locale]/components/header/index.tsx` (grupo de ações à direita) | A 1280 px o "Sign Out" termina em x=1270 e a página rola 5 px; a 1024 px rola 29 px. Os números são os mesmos no `HEAD` anterior à correção do header, então o defeito é antigo. Medido em 2026-09-25 pelo `/test` da PR #28, já com o header corrigido. Não remedido nesta auditoria, que não sobe browser |
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:51-53` (estado lido uma vez) · `:55-62` (`history.replaceState`) | Reconferido. A barra lateral muda a URL e a aba fica onde estava. Estacionado (E9) |
| 🟡 **`"Pick a date"` literal no `DateInput`** | `packages/design-system/components/ui/date-input.tsx:51` | Reconferido em 2026-09-29; a âncora desceu uma linha com o `aria-describedby` da PR #32. Sobreviveu às PRs #11 a #32 |
| 🟡 **O `DateInput` formata sempre em inglês** | `date-input.tsx:86` | Reconferido em 2026-09-29: `format(selected, "PPP")` sem `locale` |
| 🟡 **Strings de UI soltas**: `"Switch language"` nos dois apps, `"Toggle theme"` e `"Toggle Sidebar"` no design-system e `"Início"` no breadcrumb | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/app/[locale]/components/header/language-switcher.tsx:68` · `packages/design-system/components/ui/mode-toggle.tsx:39` · `ui/sidebar.tsx:299`, `:311`, `:314` · `PageBreadcrumb.tsx:30` | Reconferido em 2026-09-26. Os dois do design-system entraram nesta rodada, vistos pelo `/test` da PR #28 nos 3 idiomas. O breadcrumb ainda crava `href="/painel"` em `:28`. **Ampliado em 2026-09-29** com o levantamento do plano de `accessibility-conformance` (§12.2): também `"Light"`/`"Dark"`/`"System"` em `mode-toggle.tsx:14-18`, `"Close"` em `dialog.tsx:75` e `sheet.tsx:79`, e os rótulos em inglês de `pagination.tsx:74,91,114`, `breadcrumb.tsx:101`, `carousel.tsx:209,239` e o `"Loading"` de `spinner.tsx:9`, usado avulso em `Container.tsx:28` e `FullScreenLoader.tsx:17` |
| 🟡 **A mensagem de erro padrão está cravada em pt-br num pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal |
| 🟡 **`signInSchema.ts` da `apps/web` crava as mensagens em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:5`, `:10` | Remedido em 2026-09-26: a PR #29 trocou o número pela constante `EXISTING_PASSWORD_MIN_LENGTH`, mas `"Email inválido"` (`:5`) e `"A senha deve ter pelo menos 6 caracteres"` (`:10`) seguem literais. O cadastro da web foi traduzido na mesma PR; o login não |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | Reconferido. A exclusão de conta apaga o perfil e anonimiza os rótulos, então esses eventos ficam sem entrada no `select` |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | Reconferido |
| 🟡 **`images.domains` deprecado com `www.google.com` sem uso** | `apps/app/next.config.ts:19` | Reconferido, literal |
| 🟡 **`setTimeout` sem cleanup no carrossel da landing** | `apps/web/app/[locale]/(home)/components/cases-client.tsx:29` | Reconferido: nenhum `clearTimeout` |
| 🟡 **`useHealthCheck` não exporta a função imperativa** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: um único `export` |
| 🟡 **`provider-error` não distingue as falhas do provedor de e-mail** | `packages/email/index.ts:121-131` | Reconferido em 2026-09-28. Descartar o objeto de erro é deliberado |
| 🟡 **O rodapé da `apps/web` depende de `data-cookie-banner` sem teste** | `apps/web/app/[locale]/components/footer.tsx:56` | Reconferido |
| 🟡 **`turbo run` aborta na primeira falha no CI** | `.github/workflows/ci.yml:53` | Reconferido em 2026-09-29, sem `--continue`; a linha agora roda também `test:emulator` |

### 🆕 Achados do inventário da descoberta (2026-09-26)

Vistos pelos quatro inventários paralelos desta rodada. Nenhum vira spec.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A `apps/web` não tem `not-found` nem `error`, e o `global-error` pode estar inerte** | `apps/web/app/[locale]/global-error.tsx` · `apps/web/app/` (sem `layout.tsx`, `not-found.tsx` nem `error.tsx`) | Rota inexistente na landing cai no 404 padrão do Next, sem tradução nem marca. O Next só reconhece `global-error` na raiz de `app/`, e a web não tem root layout ali; **não medido** se o arquivo em `[locale]` chega a ser usado. A `apps/app` tem `not-found.tsx` e `global-error.tsx` na raiz, mas nenhum `error.tsx` de segmento |
| 🟡 **O `package.json` da raiz ainda é o do next-forge** | `package.json:2-5` · `:42` | Reconferido em 2026-09-28: a PR #30 não tocou no arquivo; o `FORKING.md` ("Resíduos do projeto de origem") descreve a limpeza que cada fork faz à mão. `"name": "next-forge"` e um `bin` para `dist/index.js`, gerado de `scripts/index.ts`, que não existe. `engines.node` diz `>=18` e o `.nvmrc`, `22.12.0`. Todo fork herda os três |
| 🟢 **Link do `FORKING.md` para o CRUD de referência está morto** (novo, 2026-09-28; medido em 2026-09-30) | `docs/FORKING.md:437` · `README.md:306` | O link usa `#crud-de-referência`; o título é `### 🧬 CRUD de referência`. Medido no README renderizado pelo GitHub (`gh api repos/:owner/:repo/readme` com `Accept: application/vnd.github.html`): o id publicado é `user-content--crud-de-referência`, e o próprio título aponta para `#-crud-de-referência`. Correção: trocar a âncora ou tirar o emoji do título |

### 🆕 Achados do `/test` de `brand-config` (2026-09-27)

Medidos pelo `analista-qa` com o nome padrão da marca, em `build && start`, e reconferidos no código em 2026-09-28. A inicial do avatar abaixo do AA fechou com a PR #32. Nenhum bloqueia a entrega; o detalhe e o repro estão em [`docs/features/brand-config/test/report.md`](../docs/features/brand-config/test/report.md).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O `/favicon.ico` da `apps/web` devolve o HTML da home** | `apps/web/app/` (sem ícone na raiz) · `apps/web/proxy.ts:57` (matcher) | Resposta 200 com `text/html`; o `/icon.png` responde 307 para `/pt-br/icon.png`. Já existia antes da entrega. **Descrição corrigida em 2026-09-28:** o matcher do proxy já exclui `favicon.ico` (`:57`), então o pedido não passa pelo proxy e cai no segmento `[locale]` com `favicon.ico` no lugar do idioma. Correção provável, não testada: servir o arquivo na raiz de `apps/web/app/`, que hoje não tem root layout |
| 🟡 **O header deslogado da `apps/web` passa da largura a 1024 px** | `apps/web/app/[locale]/components/header/index.tsx` | 6 px em pt-br e 49 px em es, com o nome padrão. Complementa o achado do header logado acima, que media 29 px a 1024 px |
| 🟢 **Nome de marca com 30 caracteres quebra em duas linhas na barra lateral** | `apps/app/shared/components/ui/Sidebar.tsx` | O critério de 30 caracteres da spec só valia para o header da web. Decidir truncar ou aceitar a quebra |

O atraso de idioma numa navegação (cookie `x-locale` lido no servidor) é o mesmo achado do `getDictionary()` do servidor, já registrado neste arquivo.

### 🆕 Achados da rodada de `storage-emulator-rules-tests` (2026-09-28)

Vindos do plano e do `/test` da spec, entregue pela PR #31. Eram dois; o `alt` do avatar do menu de perfil
fechou com a PR #32 e está na lista de fechados. O outro segue aberto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Nada impede um `*_EMULATOR_HOST` em produção** | `packages/auth/emulator.ts:27-32`, `:44` · `apps/app/env.ts:25` · `apps/app/shared/lib/storageEnabled.ts:6` | Nenhuma checagem de boot recusa um host de emulador configurado por engano, e isso vale também para o `FIREBASE_STORAGE_EMULATOR_HOST` e o `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` novos. Se só a variante `NEXT_PUBLIC_` for copiada para a Vercel, o app mostra o seletor de arquivo e põe `http://<host>` no `img-src` da CSP; o upload falha com `error.code` e nada vaza. É o risco R-5 do plano da spec, deixado fora do corte |

**Lacunas de teste herdadas do `/review` e do `/test` da entrega, com o veredito da auditoria pós-PR #31 (a PR #32
não tocou nesses arquivos):**

| lacuna | veredito 2026-09-29 | motivo |
|--------|---------------------|--------|
| O `playwright.config.ts` espera só a porta do Auth, e o caminho em que o Playwright sobe o `pnpm emulators` com o Storage não rodou no `/test` | **fechada** | a execução de merge (`gh run 36491617313`, job `e2e`) subiu `firebase emulators:start --only auth,firestore,storage` pelo Playwright, com o Storage em `127.0.0.1:9199`, e passou 22/22 |
| O `docs/SETUP.md` não tem número para o tempo do `verify` | **fechada como medição**, o documento continua sem o número | 2 min 56 s na PR e 3 min 13 s no merge, as duas com o cache dos JARs vazio. Falta o tempo com cache quente, que a próxima PR mede |
| O `emulator-tests.mjs` não repassa sinal ao filho, e um Ctrl-C poderia deixar Java órfão | **fechada** pelo `/test` | item 4 da lista "Verificar no `/test`": sem Java órfão depois do SIGINT |
| Nenhum teste da `apps/app` renderiza o seletor com só o host de emulador | **continua aberta**, fora do corte | cobertura atual: `storageEnabled.test.ts` e `securityPolicySources.test.ts` |
| O `signReadUrl` emulado não codifica o `path` | **continua aberta, condicional** | só vira defeito se o `STORAGE_OBJECT_PATH_RE` (`apps/api/(shared)/lib/storage.ts:26-27`) afrouxar |
| O `listAll` das rules do Storage só é testado na raiz `uploads` | **continua aberta**, risco baixo | uma mutação `allow list` em `/uploads/{uid}/{file}` passou pela suíte; não foi medido se ela abre de fato a listagem de `uploads/<uid>/` |
| Objeto que não abre sem assinatura e expiração da URL V4 | **fora de escopo** | exige bucket real (`docs/PRE-PRODUCTION.md` §6, pendência 11) |

### 🆕 Achados da entrega `accessibility-conformance` (2026-09-29)

Vindos do §12.2 do plano, do handoff, do `/review` e do `/test` da spec, entregue pela PR #32 e arquivada nesta
rodada. Todos são anteriores ao diff ou ficaram fora do corte por decisão registrada; nenhum bloqueou a entrega.
Reconferidos no código em 2026-09-29.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **"Excluir" do menu de ações não funciona pelo teclado** | `packages/design-system/components/ui/action-menu.tsx:85-94` (o `Popconfirm` embrulha só o rótulo) | Com o foco em "Excluir", Enter fecha o menu sem abrir a confirmação e o foco cai no `body` (medido pelo `/test`). O defeito já existia; a PR #32 o expôs ao tornar o gatilho alcançável por Tab. WCAG 2.1.1. Tarefa direta P, a mais urgente desta lista |
| 🟡 **O gatilho do menu de ações não publica `aria-haspopup` nem `aria-expanded`** | `action-menu.tsx:104-113` | O antd não põe os atributos no filho do `Dropdown`. Leitor de tela não anuncia que o botão abre um menu |
| 🟡 **`--destructive` do claro abaixo de 4,5:1 sobre `--accent` e `--muted`** | `packages/design-system/styles/globals.css:24` | 4,38:1 no "Excluir" com foco de teclado (fundo `--accent`, medido pelo `/test`) e 4,37:1 como texto de erro dentro de card `muted` (calculado no plano). Não aparece nas rotas que a suíte cobre |
| 🟡 **Seed tokens do antd passados como variável CSS viram `#000000`** | `packages/design-system/providers/antd-app.tsx:17-21`, `:36-38` | `colorPrimary`, `colorSuccess`, `colorWarning`, `colorInfo`, `colorLink` e o `colorError` global passam pelo algoritmo de paleta do antd, que não lê variável CSS. Componente antd que pinte com eles sai preto nos dois temas (o ícone do `Popconfirm` já sai). Só o `Dropdown` foi corrigido, por override de componente (`:75-78`) |
| 🟡 **Os tokens `Menu.dangerItem*` não alcançam o `Dropdown`** | `antd-app.tsx:66-70` | Configuração que não tem efeito onde o `danger` aparece no repo |
| 🟡 **`<title>` igual em todas as páginas de cada área do painel** | `(common)/layout.tsx:23-30` · `(admin)/admin/layout.tsx:22-29` | Satisfaz o axe, mas o WCAG 2.4.2 pede título que descreva a página. Os rótulos por rota já existem em `common/routes` e `admin/routes`. Quatro das onze páginas são `"use client"` e precisariam de `layout.tsx` de segmento |
| 🟡 **A página 404 da `apps/app` sai com `document.title` vazio** | `apps/app/app/not-found.tsx:3-5` | Fica fora dos layouts do painel, que são os que ganharam `generateMetadata` |
| 🟡 **O `RadioGroup` não tem nome de grupo** | `packages/design-system/components/ui/radio-group-input.tsx:43` (`Label` sem `htmlFor`) · `form/hookform/hookformRadioGroup.tsx` | O grupo de gênero recebe como nome o texto das opções juntas ("Não informarMasculinoFemininoOutro"). Falta `aria-labelledby` |
| 🟡 **O botão do menu mobile da web não tem nome** | `apps/web/app/[locale]/components/header/index.tsx:261` | `Button` só com ícone (`Menu`/`X`), sem `aria-label`, a 390 px |
| 🟡 **`Button` em carregamento encolhe para a largura do spinner** | `packages/design-system/components/ui/button.tsx:73-77` | 74 → 48 px no "Salvar", medido pelo `/test`. Já acontecia antes da PR #32 |
| 🟡 **`disabled={loading}` vem antes do spread das props** | `button.tsx:69-71` | Um `disabled={false}` explícito do chamador desfaz a trava de carregamento. Já documentado em `sharedFooterPendingState.test.tsx:35-37` |
| 🟡 **`HookFormInputPassword` ignora o `placeholder` do chamador** | `form/hookform/hookformInputPassword.tsx:83` | O valor `"••••••••"` é fixo |
| 🟡 **A dica do `TextareaInput` não entra no `aria-describedby`** | `packages/design-system/components/ui/textarea-input.tsx:42-43` | O `<p>` do `hint` não tem id |
| 🟢 **No formulário de contato, `<Label htmlFor="date">` aponta para um id que não existe** | `apps/web/app/[locale]/contact/components/contact-form-client.tsx:72` | O rótulo não se liga ao botão de data. O formulário é maquete (ver `welcomeEmail`) |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-29 | motivo |
|--------|---------------------|--------|
| `Select` mobile do navbar sem asserção de nome | **fechada** pelo `/test` | cenário novo em `panelNavbarControls.test.tsx` |
| `generateMetadata` dos layouts sem teste | **fechada** pelo `/test` | `panelLayoutTitle.test.ts`, 8 casos |
| `NotFoundPage` sem teste de componente | **fechada** pelo `/test` | `notFoundPageHomeLink.test.tsx` |
| Cor dos filhos do item `danger` sem teste | **fechada** pelo `/review` | caso novo em `actionMenu.test.tsx:95`, que duas mutações derrubam |
| Links da web (hero, CTA, FAQ, preços) sem teste de componente | **continua aberta**, risco baixo | a regra `nested-interactive` do axe na suíte E2E barra a regressão nas rotas cobertas |
| Botão de checkout em carregamento | **fora de escopo** | exige chave de teste da Stripe (pendência 23) |
| Campo com erro lido por leitor de tela de verdade | **continua aberto** | o `/test` conferiu atributos na árvore de acessibilidade; nenhum NVDA ou VoiceOver rodou. Não cabe em rodada autônoma |
| Hidratação do contato em `next build && next start` | **continua aberta** | ver o achado fechado por leitura acima |

### 🆕 Achados da entrega `account-email-change` (2026-09-30)

Vindos do `/review`, do handoff e do `/test` da spec, entregue pela PR #33 e arquivada em 2026-09-30. Nenhum
bloqueou a entrega. Reconferidos no código em 2026-09-30.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O diálogo de exclusão de conta não leva o foco para dentro ao abrir** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx:137` (`AlertDialogContent` sem `AlertDialogCancel` e sem `onOpenAutoFocus`) | O `AlertDialogContent` do Radix foca o `cancelRef`, que só o `AlertDialogCancel` preenche; o rodapé é o `Footer` do app, então o foco fica no botão "Excluir minha conta", fora do diálogo (medido pelo `/test` nas duas rodadas). WCAG 2.4.3. A correção conhecida é a do diálogo de troca de e-mail. São 2 call sites nesse molde, abaixo do limite de 3 da `cycle-policy` §3 para corrigir no design system. Tarefa direta P |
| 🟡 **`lacksPasswordProvider` duplica `requiresPrivacyChannel`** | `AccountEmailChangeDialog.tsx:29`, `:36-46` · `AccountPrivacyPanel.tsx:29`, `:40-48` | A mesma checagem de provedor `password` e a mesma constante `PASSWORD_PROVIDER_ID` em dois arquivos da aba de conta. O plano da feature já previa (§15) |
| 🟢 **A confirmação da troca mostra o mesmo cartão de erro para qualquer código** | `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx:53-62` | Um `429 AUTH_RATE_LIMITED` diz que o link pode ter expirado, embora o código não tenha sido gasto e recarregar resolva. Espelha o `VerifyEmailResult` por decisão do plano (§5.2) |
| 🟢 **O aviso ao endereço antigo sugere que trocar a senha resolve** | `packages/internationalization/translations/packages/email/index.ts:58`, `:126`, `:193` | "Troque sua senha agora e fale com o suporte": trocar a senha não invalida um link já emitido; quem reverte é o suporte. A frase não mente, mas a ordem engana. Decisão de copy |
| 🟢 **Endereço que o Zod aceita e o Admin SDK recusa vira 500** | `apps/api/(shared)/lib/auth-action-links.ts:122-129` · `account/email/route.ts:127-137` | Se `getUserByEmail` responder `auth/invalid-email`, o erro sobe e a rota devolve `500 ACCOUNT_UPDATE_FAILED`, com `error.code` e sem stack. Raro, não vaza nada |
| 🟢 **Código de troca aplicado direto no Identity Toolkit pula a revogação e a trilha** | `auth/email-change/confirm/route.ts:79`, `:91-101` · `docs/SECURITY.md:11` | Quem tem o link e a chave web pública aplica o código sem passar pela rota. O e-mail muda, as sessões antigas não caem pela revogação explícita e o evento não é gravado. Declarado no documento; fora do corte |

**Ampliado:** o achado do `getDictionary()` do servidor lendo o cookie ganhou a medição do `/test` da PR #33:
na `apps/app`, o `<html lang>` fica uma navegação atrasado ao trocar de idioma pela URL (`/en/verify-email`
aberto logo depois de `/es/account` saiu com `lang="es"`), porque o proxy grava o cookie na resposta
(`apps/app/proxy.ts:181`) e o layout lê o da requisição (`apps/app/app/layout.tsx:73`).

**Lacunas de teste herdadas da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-30 | motivo |
|--------|---------------------|--------|
| Retorno do foco ao fechar o diálogo sem teste | **fechada** pelo `/test` | 3 casos em `accountEmailChangeDialog.test.tsx`; a mutação sem `onCloseAutoFocus` derruba os 3 |
| Foco ao abrir o diálogo sem teste | **fechada** pelo `/review` na rodada 2 | caso novo no mesmo arquivo; a mutação sem `onOpenAutoFocus` derruba 4 |
| Rota de verificação aceitando código de troca | **fechada** pelo `/review` | 5 casos em `authEmailVerification.test.ts`, conferido no navegador pelo `/test` |
| Confirmação contra o emulador de Auth sem teste automatizado | **continua aberta**, fora do corte | o `test:emulator` sobe Firestore e Storage, não o Auth (decisão D13 do plano); o `/test` mediu à mão |
| Comportamento do Firebase de produção (conferir sem gastar, link pendente que perde a validade, gerador que recusa endereço em uso) | **fora de escopo** | exige projeto real; declarado no `PRE-PRODUCTION.md` §3 |
| Entrega real dos dois e-mails | **fora de escopo**, 🔒 | pendência 13 |

### 🆕 Achados da entrega `compliance-docs-kit` (2026-09-30)

Vindos do plano, do `/review` e do `/test` da spec, entregue pela PR #34 e arquivada em 2026-09-30. O 🔴 da conta
desativada fechou com a PR #35 e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A `review-checklist.md` não cobra atualizar `SUBPROCESSORS.md` e `ROPA.md` quando entra integração nova** | `docs/review-checklist.md:37-58` (§0, transversal, sem item sobre provedor novo) · `docs/SUBPROCESSORS.md` · `docs/ROPA.md` (em `main` desde a PR #34) | A lista de subprocessadores e o registro de operações descrevem as integrações que o código tem hoje. Sem um item no checklist, o primeiro provedor novo entra no código e fica fora dos dois documentos. Apareceu no plano (`analyze/plan.md:751`) e no `/review` (`review/review.md:129`) da entrega; pela §5.1 da `cycle-policy` vira achado em vez de voltar ao relatório. Correção de documento, P. O pré-requisito (os dois arquivos em `main`) caiu com a PR #34; reconferido em 2026-09-30, `grep` por `SUBPROCESSORS` e `ROPA` na `review-checklist.md`: 0 |

### 🆕 Achado da tarefa `disabled-account-revocation` (2026-09-30)

Vem da decisão D7 do plano da tarefa, entregue pela PR #35. O plano deixou o ponto para o backlog e nenhuma etapa
o registrou; o `/review` da tarefa o trouxe para cá. Reconferido no `1936369`: o `PUT` segue sem comparar o alvo
com o ator.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O admin pode desativar a própria conta** | `apps/api/app/(routes)/users/[id]/route.ts:87-143` (o `PUT` não compara o `id` com `ctx.actorProfile.id`) · `UsersListClient.tsx:102-125` (o switch de status aparece também na linha do próprio admin) | Já acontecia antes da tarefa: o cookie de sessão recusava o admin desativado. Com a correção, o bearer também cai na requisição seguinte e as sessões são revogadas, então o admin perde o painel na hora e só volta pelas mãos de outro admin ou pelo console do Firebase. Num fork com um admin só, ninguém consegue reativá-lo pelo painel. Correção provável: a API recusa `disabled: true` para o próprio perfil, com `error.code` nos 3 idiomas, e a listagem esconde o switch nessa linha. P |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-30 | motivo |
|--------|---------------------|--------|
| `resolveApiActor` sem teste ponta a ponta com conta desativada | **fechada por medição**, sem teste persistente | o `/test` rodou a cadeia sem mock contra o projeto de desenvolvimento; `resolve-api-actor.ts` segue sem arquivo de teste próprio |
| `revokeUserSessions` lançando dentro do `PUT` | **fora de escopo** | a função engole a falha (`server.ts:326-328`) e a rota nunca vê o erro; o `catch` sem teste é anterior à tarefa |
| Pessoa desativada com o app aberto cai no sign-in com a mensagem certa, nos 3 idiomas | **continua aberta**, 🔒 | sem passada de navegador, por custo: o diff não toca UI e o 401 é o mesmo que a revogação de sessão já produzia |
| Admin desativado como alvo (critério 1 medido só com conta comum) | **continua aberta**, nova, risco baixo | mesmo caminho de código; o `/test` não desativou a conta de QA de admin, que é compartilhada entre rodadas |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md).
> Na auditoria pós-PR #35 foram remedidas as linhas 6, 8 e 16, e a 4, a 12 e a 15 ganharam informação do `/test`
> da tarefa. As outras mantêm o veredito anterior com motivo: exigem console de provedor, ou dependem de arquivos
> que a PR #35 não tocou. A PR #35 não criou índice, rule nem variável de ambiente, e não acrescentou passo
> manual ao `PRE-PRODUCTION.md` ("Pré-requisitos manuais de infra: nenhum", no `STATE.md` da tarefa).

| # | pendência | onde vive | veredito 2026-09-30 |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto**; não remedido nesta rodada, nada no repositório mudou |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto, medido**: o `/test` da PR #35 recebeu `503 PAGINATION_INDEX_MISSING` em `GET /entities` contra o projeto de desenvolvimento (`test/report.md:85`), então o índice não está publicado nem lá. São **seis** índices sem publicação; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido em 2026-09-30 pós-PR #35 (404, `[]`, 35 PRs); estacionado (E3). É o que falta para o item 2 de `e2e-testing`, arquivada com esse ⚠️ |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**, remedido em 2026-09-30 pós-PR #35: `grep` por `@sentry`/`@logtail`/`@axiomhq`/`betterstack` nos `package.json` versionados devolve 0; estacionado (E1) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto** em produção. Desde a PR #31, upload, avatar e o passo `storage` do expurgo rodam e têm teste sob o emulador; contra bucket real seguem sem prova o objeto que não abre sem assinatura e a expiração da URL V4 |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **metade fechada**, reconhecido na auditoria pós-PR #34: o `/test` de `compliance-docs-kit` mediu em 2026-09-30, contra o projeto Firebase de desenvolvimento, que depois de `revokeRefreshTokens` o cookie emitido antes volta `null`, o bearer volta `null` em `resolveApiActor` e `createSessionCookie` com o token anterior lança `auth/id-token-expired` (`docs/features/compliance-docs-kit/test/report.md`, tabela "Resultado bruto"). É a prova que a ressalva de `session-refresh` pedia para a camada de verificação. **Continua aberto** só o percurso de navegador: sair numa app e ver a outra perder a sessão. O `/test` da PR #35 somou a medição da conta desativada (bearer recusado com e sem revogação, e depois da reativação) e também não subiu navegador |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado. O `/test` da PR #29 deixou 🔒 o e-mail de verificação depois do cadastro pela API (critério 20). O `/test` de `brand-config` deixou 🔒 o nome da marca com acento na caixa de entrada. O `/test` da PR #33 deixou 🔒 a entrega do aviso ao endereço antigo e do link ao novo; sem Resend o pedido responde `503 EMAIL_NOT_CONFIGURED`, medido nos 3 idiomas |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #35 criou e apagou a própria conta (`PRE-PRODUCTION.md:894-898`) e usou a `qa-admin@` compartilhada, sem senha; não acumulou nada |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**, remedido em 2026-09-30 pós-PR #35: `git ls-remote --heads origin` devolve 34, ou seja, 33 além de `main` (eram 32; a `fix/disabled-account-revocation` ficou viva depois do merge, como a `run-full-task-cycle-v2`) |
| 17 | Login com Google sem passe manual com conta real | *(só neste arquivo)* | **continua aberto**. O `/test` da PR #24 também não percorreu o Google no emulador; o nome do Google como valor inicial do passo 1 ficou fechado só por leitura |
| 18 | `storage.rules` nunca publicado (o teste veio com a PR #31) | `PRE-PRODUCTION.md` §6 e `:54-58` | **metade fechada** pela PR #31: `storage.rules` e `firestore.rules` têm teste contra emulador no `verify` (20 e 145 testes; entrega em [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md)). **Continua aberto** publicar no projeto real, que depende da 11 |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto**. Vazia, o canal cai no formulário de contato, que é maquete |
| 23 | Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com **cinco** eventos (a PR #27 acrescentou `invoice.paid`, `PRE-PRODUCTION.md:454-455`), chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **continua aberto**. A PR #33 acrescentou ao §12 habilitar a edição do e-mail no Customer Portal, porque a troca de e-mail não atualiza o `customer`. Cinco critérios de `billing-subscription`, quatro de `admin-billing-insights` o cancelamento real no arquivamento pelo admin (PR #28) e o botão de checkout em carregamento (PR #32) seguem 🔒 até uma conta real existir. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |
| 24 | 🆕 `ARCJET_KEY` por fork: sem ela o rate limit é no-op, e o cadastro pela API passa a depender dela (a rota usa o Admin SDK, fora do limite do Firebase por IP) | `PRE-PRODUCTION.md` §8 (`:567-582`) | **aberto**, entrou com a PR #29. Critério 19 do `/test` da fatia 1 🔒 |
| 25 | 🆕 Fechar o cadastro pelo REST do Identity Toolkit com a chave pública, que ainda aceita senha de 6 ou 7 (Identity Platform: password policy em `ENFORCE` ou cadastro pelo cliente desligado) | `PRE-PRODUCTION.md`, "Declaração — o que a política de senha não alcança" | **opcional, declarado**: o upgrade tem custo ou teto (3.000 DAU no Spark). Critério 18 do `/test` da fatia 1 🔒 |
| 26 | 🆕 Marca por fork: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` nos projetos `app`, `web` e `api`, logo numa URL `https` pública, ícones do produto no lugar dos padrões | `PRE-PRODUCTION.md` §13 (`:696-707`) | **aberto**, entrou com a PR #30. Sem ela, o produto sobe com o nome `next-boilerplate`; não bloqueia nada. Desde a PR #33, sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL` o aviso de troca de e-mail sai sem a linha de suporte, que é o canal para contestar (`PRE-PRODUCTION.md` §3) |

A 21 foi fechada pelo usuário em 2026-09-25. A 18 fechou pela metade em 2026-09-29, e a 12 em 2026-09-30. A 4 foi medida no projeto de desenvolvimento em 2026-09-30. A 23 cresceu com as PRs #27, #28, #32 e #33; a 24 e a 25 vieram da PR #29; a 26, da PR #30, e ganhou peso com a #33. A 13 ganhou um 🔒 com a #33.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

> **Em 2026-09-26, cinco linhas saíram daqui** porque viraram spec ou foram absorvidas:
> gate por plano → [`plan-entitlements`](plan-entitlements.md) (o bloqueio em `past_due`, trial, cupom,
> reembolso e faturas em UI própria voltaram como linha própria abaixo); RoPA, incidente, DPA e transferência
> internacional → [`compliance-docs-kit`](../docs/features/compliance-docs-kit/spec.md), entregue em 2026-09-30; troca de e-mail →
> [`account-email-change`](../docs/features/account-email-change/spec.md), entregue em 2026-09-29; emulador de Storage e testes de rules →
> [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md), entregue em 2026-09-28 ("promover admin pela UI" saiu porque já
> existe: campo de tipo no formulário de edição de usuário, `users/[id]/route.ts:108-109`); task de teste do
> design system → [`accessibility-conformance`](../docs/features/accessibility-conformance/spec.md), entregue em 2026-09-29.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Bloqueio em `past_due` · trial, cupom, reembolso e faturas em UI própria · nome do plano traduzido** | — | Fora do corte de [`billing-subscription`](../docs/features/billing-subscription/spec.md) e de [`plan-entitlements`](plan-entitlements.md). O Customer Portal cobre trial, cupom, reembolso e faturas; o bloqueio por situação é decisão de produto de cada fork. |
| 🆕 **Jobs agendados (Vercel Cron) para expurgo e retenção** | — | Avaliado em 2026-09-26. Não há job concreto que o core precise rodar: o expurgo da trilha depende do prazo de retenção (E5) e o TTL de `paymentEvent` já é nativo do Firestore. Infra sem consumidor vira código morto. Reabrir quando E5 for decidida. |
| 🆕 **Exportar tabelas do admin em CSV** | não medido | Avaliado em 2026-09-26. Nenhuma tabela exporta hoje e nenhuma referência do painel foi verificada. Sem prevalência, é decisão de fork. |
| 🆕 **Aceite de termos e privacidade registrado no cadastro** | não medido | Avaliado em 2026-09-26. O aviso de privacidade é dever de informação (LGPD art. 9º), não consentimento; aceite de termos é decisão contratual de cada fork. Um link para os dois documentos junto ao botão de cadastro é achado P, não spec. |
| 🆕 **Avisos de segurança por e-mail (senha trocada, sessões encerradas, login novo)** | — | Avaliado em 2026-09-26. É o requisito 6.3.7 da ASVS 5.0.0, **nível 3** (6.3.5, login suspeito, também é nível 3). O aviso ao endereço antigo entrou em [`account-email-change`](../docs/features/account-email-change/spec.md), entregue pela PR #33, por ser barato; o resto espera pedido. |
| 🆕 **OpenAPI / documentação da API gerada** | — | Avaliado em 2026-09-26. O SDK é o contrato e a única porta para a API (regra de ouro 1); um segundo contrato gerado envelhece junto. Vale só se o produto for uma API, como as API keys. |
| 🆕 **Banir usuário pelo admin** | 4/10 (admin) | Já existe como desativar: `disabled` no `PUT /users/[id]` (`user-admin.schema.ts:21`, `users/[id]/route.ts:117-126`) e o switch da listagem (`UsersListClient.tsx:102-125`). Desde a PR #35, desativar também corta o bearer e revoga as sessões na hora. |
| 🆕 **CLI de criação de fork** | 1 de 4 verificados (next-forge) | Fora do corte de [`brand-config`](../docs/features/brand-config/spec.md), entregue em 2026-09-28 com o roteiro escrito (`docs/FORKING.md`). O script só vale depois que o roteiro se mostrar estável em forks reais. |
| 🆕 **`/.well-known/security.txt` e política de divulgação de vulnerabilidade** | não medido | Fora do corte de [`compliance-docs-kit`](../docs/features/compliance-docs-kit/spec.md), entregue em 2026-09-30 sem ele. É código na web, e o campo `Expires` do RFC 9116 exige manutenção. |
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Estacionado (E1). |
| **Passos de onboarding condicionais por papel ou plano · checklist de ativação · tour interativo** | — | Fora do corte de [`onboarding-flow`](../docs/features/onboarding-flow/spec.md), arquivada. Dependem de haver produto, e cada fork tem o seu. O fork acrescenta um passo editando `ONBOARDING_STEPS`. |
| **Coleta de dados de domínio no onboarding (empresa, cargo, segmento)** | — | Fora do mesmo corte. Não é genérico; é código do fork. |
| **Onboarding para a conta criada pelo admin** | — | Decisão D3 da entrega: o admin já informa o nome, e a mesma rota cria admins. O perfil sem o campo conta como concluído. |
| **Demais direitos do art. 18 com fluxo próprio · painel de pedidos de titular · exportação assíncrona** | — | Fora do corte de [`data-rights-lgpd`](../docs/features/data-rights-lgpd/spec.md), arquivada. O canal de privacidade cobre os demais pedidos por ora. |
| **Exclusão de conta sem senha (conta só Google)** | — | Fora da entrega: reautenticar conta federada exige outro fluxo. Pertence à iteração de "sessão recente" de [`account-security-mfa`](account-security-mfa.md). |
| **Histórico de acessos · IP, user-agent, dispositivo e geolocalização · presença em tempo real** | — | Fora do corte de [`user-activity-tracking`](../docs/features/user-activity-tracking/spec.md). IP mudaria a natureza jurídica do dado (Marco Civil art. 5º, VIII). |
| **Série temporal de acessos na home do admin** | — | `lastAccessAt` guarda um instante por perfil; série temporal exigiria a coleção de eventos que `user-activity-tracking` descartou. |
| **Backfill retroativo do último acesso** | — | Fora do corte, e a tela diz quando o registro de cada pessoa começa. |
| **Ordenação da coluna de último acesso pelo servidor** | — | O índice por `lastAccessAt` existe declarado (não publicado). Reavaliar quando a fila drenar. |
| **Tela de sessões e dispositivos ativos** | 1/10 | Pertence a [`account-security-mfa`](account-security-mfa.md), fatia 2. |
| **Rotação de refresh token com detecção de reuso** | — | O refresh token é do Firebase. |
| **"Continuar conectado" · reautenticação para operação sensível · aviso de inatividade** | — | Fora do corte de `session-refresh`. A exclusão de conta já nasceu com reautenticação própria; o contrato geral fica com `account-security-mfa`. |
| **Rate limit próprio para as rotas de sessão** | — | Virou achado de segurança; o mecanismo existe e não alcança os front-ends. |
| **Widgets configuráveis na home · comparação com período anterior · exportar métricas · tempo real** | — | Fora dos cortes de `dashboard-home` e `admin-analytics-dashboard`. |
| **Contador materializado / agregação incremental** | — | A home do admin faz oito agregações por carregamento. Medir quando alguma coleção crescer. |
| **Exportar a trilha de auditoria · expurgo automático** | — | Dependem do prazo de retenção (E5). |
| **Alerta em tempo real sobre ação sensível** | — | Depende de haver coletor (E1). |
| **Auditar toda escrita de qualquer recurso** | — | Começa caro e gera ruído. |
| **Busca textual no servidor** | — | Fora do corte de `cursor-pagination`. Estacionado (E7). |
| **Medir visitas à `apps/web`** | — | Nenhuma das três saídas teve preço ou prevalência levantados. Estacionado (E8). |
| **Contagem total de registros na listagem** | — | O `countQuery` (`base.repository.ts:138`) é a peça que faltava. Reavaliar quando alguém pedir. |
| **Registro auditável de consentimento no servidor** | — | Fora do corte de `cookie-consent`. A escolha vai no arquivo de exportação, lida do cookie do navegador (`useAccountDataRights.tsx:23-36`); prova no servidor segue inexistente. |
| **CMP certificada · TCF do IAB · geolocalização do visitante** | — | Arrastam serviço pago para todo fork. |
| Notificações in-app + preferências | 3/10 | Esforço G à mão; a referência terceiriza num serviço pago. |
| Command palette (⌘K) | 2/10 | Valor estético. |
| Metering / limites de uso / créditos | 2/10 | Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Variável de ambiente basta num MVP; `ONBOARDING_ENABLED` é o exemplo mais recente. |
| Firebase App Check | — | Exige configuração de projeto por fork. |
| Waitlist / captura de lead | 2/10 | Decisão do fork. |
| **Consertar o formulário de contato da landing** | — | Não é spec, é achado. É o fallback do canal de privacidade. |
| **Migrar a listagem de usuários para o cursor** | — | O N+1 de `userRepository.list()` vem primeiro. |
| **Detector de teste instável no CI** | — | O primeiro caso foi consertado na PR #22. Em 2026-09-28 apareceu um segundo, de causa diferente, só local (`useListAuditEvents.test.tsx`, 2 falhas em 24 execuções somando as rodadas de 2026-09-29 e 2026-09-30; ver achados), e o CI passou. O critério de reabertura era um segundo *flake* **no CI**; este ainda não conta. Consertar o teste é tarefa direta P. |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale nas 13 últimas execuções de merge na `main`, de `e656331` a `f377c84` (`gh run list`, remedido em 2026-09-30). Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | A cobertura já é medida e consolidada (`pnpm coverage`, job `coverage` do CI), pela PR #26. O limiar ficou fora do corte de [`e2e-testing`](../docs/features/e2e-testing/spec.md); reavaliar depois de algumas medições. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
