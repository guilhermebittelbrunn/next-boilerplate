# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última rodada:** 2026-10-16 (`/spec --sync`, pós-merge da PR #47, passo 1 de um `/cycle`; medições de
> 2026-10-16, entre 20:40 e 20:55 BRT) · **anteriores:** 2026-10-16 (`/spec --sync`, pós-merge da PR #46) · 2026-10-16 (`/spec` de
> descoberta, foco em `produto`, pedida pelo usuário) · 2026-10-14 (`/spec --sync`, pós-merge da PR #45) · 2026-10-14 (PR #44, três passadas) · 2026-10-13 (PR #43) · 2026-10-08 (PR #42) · 2026-10-07 (PR #41) · 2026-10-07 (PR #40) · 2026-10-04 (PRs #37, #38 e #39) · 2026-10-03 (PR #36) ·
> 2026-09-30 (PR #35) · 2026-09-30 (PR #34) · 2026-09-30 (PR #33) · 2026-09-29 (PR #32) · 2026-09-29 (PR #31) · 2026-09-28 (PR #30) · 2026-09-27 (PR #29) · 2026-09-26 (`/spec` de descoberta, pedida pelo usuário) · 2026-09-26
> (PR #28) · 2026-09-25 (PRs #26 e #27) · 2026-09-25 (PR #25) · 2026-09-24 (PR #24) · 2026-09-23 (PR #23) ·
> 2026-09-23 (PR #22) · 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) ·
> 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 ·
> 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) ·
> 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada (2026-10-16, pós-PR #47):**
> 1. **`pricing-page-catalog` foi entregue e arquivada.** A PR #47 (`dd31a95`) entrou em `main` às 23:39 UTC, e a
>    execução de merge do CI (`gh run 38982571426`) passou nos quatro jobs. Os cinco itens do corte foram relidos no
>    código de `main`, um a um, e estão todos lá. A spec mudou para
>    [`docs/features/pricing-page-catalog/spec.md`](../docs/features/pricing-page-catalog/spec.md), com a seção
>    "Estado da entrega" e quatro derivas, nenhuma que piore o que o corte pedia. Detalhe em
>    [Entregas desta rodada](#entregas-desta-rodada-pr-47).
> 2. **Uma transição:** `pricing-page-catalog`, de `in-progress` para `done`. As outras nove specs ficam como estavam.
>    A primeira spec aprovada na triagem de 2026-10-16 já está em `main`; restam duas aprovadas.
> 3. **A próxima é `linked-sign-in-methods`** (`approved`, alto por M, prova inteira no emulador de Auth). O lote 1
>    passa a ser ela com `contact-support-channel`, que não divide arquivo com ela; o lote 2,
>    `magic-link-sign-in` com `in-app-notifications`.
> 4. **Gates remedidos com `--force` e JDK 21:** 30/30 tasks em 1 min 11 s, 902 arquivos no `pnpm check`, **3010**
>    testes em 281 arquivos (+57, todos da PR #47) e 186 contra o emulador. A primeira tentativa falhou antes de rodar
>    teste: o `node_modules` deste workspace tinha só o binário x64 do `rollup`. Um `pnpm install --frozen-lockfile`
>    acrescentou o de arm64 sem mudar arquivo versionado, e a segunda rodada passou inteira.
> 5. **Achados: 2 fechados, 6 novos, 4 ampliados, 119 abertos** pela soma (115 − 2 + 6). Fecharam o deep link do
>    onboarding sem a query e o bounce do proxy que escrevia a query dentro do caminho. A PR também fechou um open
>    redirect que não tinha linha aqui. O novo de maior peso é o `docs/SECURITY.md`, que ainda conta 36 rotas e 13 sem
>    guard; são 37 e 14. Detalhe em [Achados](#achados-correções-pontuais-não-specs).
> 6. **Âncoras corrigidas em seis specs vivas e neste arquivo.** A PR #47 pôs quatro linhas de comentário acima da
>    lista de rate limit de `apps/api/proxy.ts` e mexeu em `apps/app/proxy.ts`, nos formulários de login e cadastro e
>    em sete documentos. O `develop/handoff.md` da feature listou as referências de `specs/` que ficariam velhas; esta
>    rodada conferiu cada uma no código e corrigiu.
> 7. **Nenhuma pergunta nova.** D9 segue esperando `one-time-purchase` voltar da fila, e as estacionadas (E1 a E13)
>    não são reapresentadas.
>
> **O que mudou na rodada anterior (2026-10-16, pós-PR #46):** a PR #46 entregou as tarefas diretas
> `web-docs-link-and-mobile-menu` e `api-auth-webhook-error-codes`, sem transição de status; a auditoria corrigiu a
> própria afirmação de que um `400` encerra as reentregas da Stripe, localizou a perda da query string em três pontos
> de `apps/app/proxy.ts` para o plano de `pricing-page-catalog` e remediu os gates em 2953 testes. As tabelas de
> conferência daquela rodada ficaram na versão deste arquivo em `dd31a95` (a PR #47 levou a auditoria pós-PR #46
> junto).
>
> **Duas rodadas antes (2026-10-16, descoberta):** sete specs novas (`pricing-page-catalog`,
> `linked-sign-in-methods`, `contact-support-channel`, `magic-link-sign-in`, `in-app-notifications`,
> `one-time-purchase` e `social-sign-in-providers`), duas linhas da tabela de lacunas reabertas como spec, nove
> lacunas descartadas, oito achados novos do inventário e o adendo de 2026-10-16 na nota
> [`saas-starter-feature-benchmark`](research/saas-starter-feature-benchmark.md). Na triagem do mesmo dia (D3), você
> aprovou `pricing-page-catalog`, `linked-sign-in-methods` e `contact-support-channel`, manteve `magic-link-sign-in` e
> `in-app-notifications` em `proposed` e adiou `one-time-purchase` e `social-sign-in-providers`, com o motivo no topo
> de cada spec; D4 a D8 foram respondidas pela recomendação.

## Contadores

Sobre as **9 specs que seguem em `specs/`**. Recontados do disco em 2026-10-16, depois do arquivamento, lendo o
frontmatter de cada arquivo; os 27 `spec.md` arquivados em `docs/features/` têm todos `status: done`.

| status | qtd |
|--------|-----|
| `proposed` | 2 |
| `approved` | 2 |
| `in-progress` | 2 |
| `done` (arquivadas) | 27 |
| `deferred` | 3 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 7 (2 `approved`, 2 `proposed`, 3 `deferred`) · `confianca` 1 (`in-progress`) · `dx` 1
(`in-progress`). **Por esforço:** P 1 · M 7 · G 1. **Por valor:** alto 3 · médio 6 · baixo 0.

**Transições aplicadas nesta rodada: 1.** `pricing-page-catalog`, de `in-progress` para `done`, arquivada em
`docs/features/pricing-page-catalog/spec.md`. O arquivo foi movido com `mv`, não com `git mv`, para não deixar nada
preparado no índice (o incidente registrado em `.claude/rules/git-commits.md`): o git reconhece o rename quando a
remoção de `specs/pricing-page-catalog.md` e a adição do arquivo novo entram no mesmo commit. Nada foi commitado.

> **Elegíveis: 4 de 9.** As quatro primeiras da [ordem recomendada](#ordem-recomendada). Fora ficam
> `one-time-purchase`, `social-sign-in-providers` e `teams-organizations` (`deferred`; a segunda também depende de
> `linked-sign-in-methods`, não entregue) e `account-security-mfa` e `observability-logging` (`in-progress` sem
> feature em andamento).

**Registro da rodada anterior (2026-10-16, pós-PR #46):** nenhuma transição.

## Tarefas diretas entregues (sem spec)

Correções que vieram de achados deste arquivo, sem spec própria. Ficam registradas aqui porque a pasta
`docs/features/<slug>/` delas não tem `spec.md`.

| feature | PR | achados fechados |
|---------|----|------------------|
| [`i18n-hydration-admin-delete-billing`](../docs/features/i18n-hydration-admin-delete-billing/STATE.md) | #28, `295c8de`, 2026-09-26 | hidratação do dicionário client em `/en` e `/es`; A2 (arquivamento pelo admin sem cancelar a assinatura) |
| [`disabled-account-revocation`](../docs/features/disabled-account-revocation/STATE.md) | #35, `1936369`, 2026-09-30 | 🔴 conta desativada pelo admin com o ID token aceito pela API por até 1 hora |
| [`arcjet-key-lazy-validation`](../docs/features/arcjet-key-lazy-validation/STATE.md) | #36, `e791d3a`, 2026-09-30 | 🔴 `ARCJET_KEY` malformada lida no import de `packages/security`, que fazia a API responder 500 a toda requisição |
| [`admin-self-lockout-guard`](../docs/features/admin-self-lockout-guard/STATE.md) | #37, `02c31b5`, 2026-10-04 | 🟢 o admin podia desativar, arquivar ou rebaixar a própria conta e perder o painel; D9 |
| [`action-menu-keyboard-delete`](../docs/features/action-menu-keyboard-delete/STATE.md) | #40, `5f4a8e9`, 2026-10-07 | 🟡 "Excluir" do menu de ações não funcionava pelo teclado (WCAG 2.1.1); 🟡 o gatilho do menu não publicava `aria-haspopup` nem `aria-expanded` |
| [`server-locale-from-url`](../docs/features/server-locale-from-url/STATE.md) | #41, `0a49a3b`, 2026-10-07 | 🟡 o `getDictionary()` do servidor lia o cookie `x-locale`, não a URL: primeira visita a `/en` e `/es` da web com Server Components em pt-br, e `<html lang>` das duas apps uma navegação atrasado (WCAG 3.1.1) |
| [`antd-theme-seed-colors`](../docs/features/antd-theme-seed-colors/STATE.md) | #42, `dbcac2a`, 2026-10-07 | 🟡 as cores-semente do antd, passadas como variável CSS, viravam `#000000`: ícone e "Sim" da confirmação de exclusão do `ActionsMenu` a 1,06:1 e anel de foco dos componentes antd a 1,31:1 no tema escuro (WCAG 1.4.11) |
| [`account-deletion-dialog-focus`](../docs/features/account-deletion-dialog-focus/STATE.md) | #43, `7fb2fe9`, 2026-10-09 | 🟡 o diálogo de exclusão de conta não levava o foco para dentro ao abrir (WCAG 2.4.3); de quebra, a senha digitada e a mensagem de validação voltavam ao reabrir depois de "Cancelar" |
| [`ui-strings-and-password-focus`](../docs/features/ui-strings-and-password-focus/STATE.md) | #43, `7fb2fe9`, 2026-10-09 | 🟡 strings de UI soltas no design system, nos dois seletores de idioma e no breadcrumb (regra de ouro 2); 🟡 a paginação do antd em inglês nos três idiomas; e, sem linha prévia neste arquivo, o foco perdido depois de uma recusa da API nos dois diálogos de conta e o campo de senha da exclusão sem `autoComplete` nem `required` |
| [`date-input-locale`](../docs/features/date-input-locale/STATE.md) | #44, `fa7041b`, 2026-10-14 | 🟡 "Pick a date" cravado no `DateInput`; 🟡 a data escolhida, o calendário e o seletor de mês em inglês em qualquer idioma; e, sem linha prévia neste arquivo, a data do formulário de contato da web também em inglês |
| [`date-input-navigation`](../docs/features/date-input-navigation/STATE.md) | #45, `eb47e80`, 2026-10-14 | 🟡 o calendário abria no mês atual, e o nascimento de `entity` só navegava mês a mês; 🟡 a hidratação da `/contact` com fuso diferente; 🟢 o `initialFocus` obsoleto; 🟢 o caso de teste preso a outubro de 2026; 🟢 o `<Label htmlFor="date">` sem alvo na `/contact` |
| [`form-field-focus-and-names`](../docs/features/form-field-focus-and-names/STATE.md) | #45, `eb47e80`, 2026-10-14 | 🟡 o campo de senha (e o de texto) desabilitado no envio, com perda de foco; 🟡 o `placeholder` do chamador ignorado; 🟡 o grupo de rádio sem nome; 🟡 o `Button` que encolhia no carregamento; 🟡 o `disabled` antes do spread |
| [`web-header-reflow-and-menu-name`](../docs/features/web-header-reflow-and-menu-name/STATE.md) | #45, `eb47e80`, 2026-10-14 | 🟡 o botão do menu mobile da web sem nome; 🟡 o header logado rolando de lado a 1024 e 1280 px; 🟡 o header deslogado passando da largura a 1024 px e, em es, a 1280 px |
| [`web-docs-link-and-mobile-menu`](../docs/features/web-docs-link-and-mobile-menu/STATE.md) | #46, `c8577b7`, 2026-10-16 | 🟡 o link de documentação da web que nunca aparecia, no header nem no footer; 🟢 o menu mobile da web que continuava aberto depois de seguir um link. Tabela de conferência na versão deste arquivo em `dd31a95` |
| [`api-auth-webhook-error-codes`](../docs/features/api-auth-webhook-error-codes/STATE.md) | #46, `c8577b7`, 2026-10-16 | 🟡 A4 (o webhook respondia 500 para assinatura recusada); 🟡 `/auth/sign-in` sem validação, com 500 e string crua; 🟡 `GET /auth/me` com `{ message }` sem `error.code`. Tabela de conferência na versão deste arquivo em `dd31a95` |

As tabelas de conferência item a item das PRs #28, #35 e #36 ficaram na versão deste arquivo em `02c31b5` (a PR
#37 levou a auditoria pós-PR #36 junto); as das PRs #37, #38 e #39, na versão em `5f4a8e9` (a PR #40 levou a
auditoria pós-PR #39 junto); a da PR #40, na versão em `0a49a3b` (a PR #41 levou a auditoria pós-PR #40 junto); a
da PR #41, na versão em `dbcac2a` (a PR #42 levou a auditoria pós-PR #41 junto); a da PR #42, na versão em
`7fb2fe9` (a PR #43 levou a auditoria pós-PR #42 junto); as duas da PR #43, na versão em `fa7041b` (a PR #44 levou
a auditoria pós-PR #43 junto); a da PR #44 e a leitura das duas primeiras tarefas no working tree, na versão em
`eb47e80` (a PR #45 levou a auditoria pós-PR #44 junto); as três da PR #45, na versão em `c8577b7` (a PR #46 levou a
auditoria pós-PR #45 junto); as duas da PR #46, na versão em `dd31a95` (a PR #47 levou a auditoria pós-PR #46 junto).
As nove versões estão em `main`, e as pastas das features guardam o resto.

## Entregas desta rodada (PR #47)

A PR #47 entrou em `main` em 2026-10-16 às 23:39 UTC (20:39 no horário de Brasília), com os quatro checks verdes na
PR (`gh pr view 47`) e na execução de merge, `gh run 38982571426`, no SHA `dd31a95`: `success` em `changes`, `verify`
(2 min 46 s), `coverage` e `e2e` (3 min 27 s). A branch `feat/pricing-page-catalog` tinha 18 commits, e o squash
juntou os 18 num só. Ela levou junto a auditoria pós-PR #46 e as sete specs da descoberta, que estavam no working
tree.

`git diff --stat c8577b7 dd31a95`, fora de `docs/features` e `specs`: 51 arquivos, +1571 e −479. Código em
`apps/api` (a rota `payments/catalog`, o cache `plan-catalog-cache.ts` e o comentário do `proxy.ts`), `apps/web` (a
página, três componentes novos, `planCatalog.ts` e `pricingCta.ts`), `apps/app` (o proxy, as páginas e os
formulários de login e cadastro, `authRedirectLink.ts`, a aba de cobrança e o card do plano), `packages/auth`
(`redirect.ts`), `packages/sdk` (`listCatalog`), `packages/shared` (o formatador de preço, movido da `apps/app`) e
dois dicionários. Testes: seis arquivos novos, dez editados e um movido com o formatador
(`formatPlanPrice.test.ts`, da `apps/app` para `packages/shared`). Fora do código: sete documentos em `docs/`, o
`.env.example` da API e a skill `payments-flow`. Nenhuma dependência nova, nenhuma variável nova.

### `pricing-page-catalog` (PR #47, spec `approved`)

Era a recomendação #1 da auditoria pós-PR #46 e o foco do `/cycle` daquela rodada. Conferência contra o corte,
lendo `main`:

| item do corte | veredito | o que o código mostra |
|---------------|----------|-----------------------|
| (1) o visitante vê os planos ativos da Stripe em `/pricing`, com preço, intervalo e recursos no idioma da página | ✅ | `apps/web/app/[locale]/pricing/page.tsx:29-81`; `components/plan-card.tsx:34` (`describePlanPrice`), `:52-54` (recursos); o formatador em `packages/shared/utils/helpers/formatPlanPrice.ts`; os intervalos em `translations/apps/web/pages/pricing/index.ts:6-13` |
| (2) leitura pública pela API, sem login, com cache | ✅ | `apps/api/app/(routes)/payments/catalog/route.ts:13-32`, sem guard; `plan-catalog-cache.ts:19-37`, uma hora e uma chamada para visitas simultâneas; `listCatalog` em `packages/sdk/src/actions/payments/action.ts:33-35`; `planCatalogCache.test.ts` (4 casos) |
| (3) o botão preserva a escolha pelo cadastro e pelo onboarding até a aba de cobrança; quem tem sessão vai direto | ✅ | `pricingCta.ts:16-32`; `apps/app/proxy.ts:247` (login com a query), `:161-165` e `:265` (`pointAt` no bounce), `:280` (`x-app-path` com a query); `AccountBillingPanel.tsx:243`, `:301`; selo em `BillingPlanCard.tsx:43-50`. O `/test` percorreu landing → cadastro → onboarding → aba nos três idiomas, claro, escuro e 375 px |
| (4) sem Stripe ou em `simple`, nenhum preço inventado e estado vazio traduzido | ✅ | `route.ts:16-18`; `apps/web/shared/lib/planCatalog.ts:23-37`; `components/pricing-empty-state.tsx`; `index.ts:14-16` e equivalentes. O `/test` mediu em modo `simple`, sem chave e com a API fora do ar |
| (5) preços, nomes e a tabela de exemplo saem do dicionário | ✅ | `git grep` por "R$ 40" e "$40" em `translations/apps/web`: 0 |

**Veredito:** entregue, 5/5, arquivada. O `/test` fechou com 21 ✅, 0 ❌ e 3 🔒 (catálogo, chamadas e checkout
contra uma conta Stripe real, pendência 23). Quatro derivas, descritas na spec arquivada e em [Deriva](#deriva):
rota nova em vez da `payments/plans`, cache por instância, rota fora do rate limit de propósito, e quem tem sessão
volta pelo bounce do proxy. Além do corte, a PR fechou a deriva do deep link de `onboarding-flow`, fechou um open
redirect real em `main` (`packages/auth/redirect.ts:40-43`) e levou o formatador de preço para `@repo/shared`.

## Gates medidos nesta auditoria

Executados em 2026-10-16, às 20:42 BRT, com `--force`, neste workspace, com o `HEAD` em `dd31a95` (igual a
`origin/main`) e o working tree limpo. Não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` (a task `//#lint` da linha abaixo) | ✅ **902 arquivos · 0 erros** (`No fixes applied`, 1,2 s). Os treze a mais são os arquivos novos da PR #47 |
| `pnpm turbo run lint typecheck test test:emulator --force`, com o JDK 21 de `/opt/homebrew/opt/openjdk@21` no `PATH` | ✅ **30/30 tasks · 0 em cache · 1 min 11 s**; `api#test:emulator` **186 testes em 4 arquivos**; zero `error TS` e zero erro não tratado no log. Ao fim, nenhuma das portas de emulador (8080, 9099, 9199, 4000, 4400, 4500, 9150, 8085) ficou ouvindo |

**A primeira execução falhou antes de rodar teste**, em 6 s: `Cannot find module @rollup/rollup-darwin-arm64` no
`@repo/shared#test`, e o turbo abortou o resto. O `node_modules` deste workspace tinha só o binário
`@rollup/rollup-darwin-x64`, com o Node em arm64. `pnpm install --frozen-lockfile` acrescentou 14 pacotes, o binário
de arm64 entre eles, sem mudar arquivo versionado (`git status` limpo depois). É problema de ambiente do workspace,
não do código; a segunda execução é a que vale. O load average estava entre 4,9 e 5,5. O Node local é o 22.13.0, e o
`.nvmrc` pede 22.12.0.

O log do `@repo/design-system` segue trazendo uma ocorrência do aviso `In HTML, <button> cannot be a descendant of
<button>`, do caso do `DialogFooter` com `showCloseButton` (achado aberto em
[Achados da PR #43](#-achados-da-pr-43-2026-10-09)).

**O teste instável de `useListAuditEvents` não apareceu** (uma execução da suíte da `apps/app`, 861 testes). O
acumulado fica em 2 falhas em 47. O arquivo não muda desde a PR #18; o achado continua aberto.

| workspace | arquivos | testes | Δ vs. 2026-10-16 pós-PR #46 |
|-----------|---------:|-------:|-----------------------------|
| `api` | 97 | 1236 | **+2** arquivos, **+14** testes (`paymentsCatalogRoute`, `planCatalogCache` e casos novos em `proxyArcjetKey`) |
| `app` | 107 | 861 | **+1** arquivo, **+15** testes (+2 novos, −1 movido: `authPagesRedirect` e `authRedirectLink` entram, `formatPlanPrice` sai; casos novos no proxy, no guard de redirect e na aba de cobrança) |
| `@repo/email` | 7 | 202 | — |
| `@repo/design-system` | 14 | 171 | — |
| `web` | 20 | 131 | **+1** arquivo, **+15** testes (`planCatalog` e a página reescrita) |
| `@repo/auth` | 10 | 127 | — (o guard de `redirect.ts` é testado na `apps/app`; ver o achado novo) |
| `@repo/internationalization` | 7 | 67 | — |
| `@repo/shared` | 5 | 56 | **+1** arquivo, **+12** testes (`formatPlanPrice`, que veio da `apps/app`) |
| `@repo/security` | 3 | 45 | — |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/next-config` | 1 | 32 | — |
| `@repo/payments` | 4 | 22 | — |
| `e2e` | 2 | 16 | — (testes unitários da suíte; os de navegador rodam no `pnpm e2e`) |
| `@repo/sdk` | 2 | 10 | **+1** arquivo, **+1** teste (`paymentsCatalog`) |
| **total** | **281** | **3010** | **+57** testes, **+6** arquivos, todos da PR #47 |
| `api#test:emulator` (fora da linha acima) | 4 | 186 | — |

Os números batem com o `/test` da feature, que mediu os mesmos totais por workspace (`app` 861, `api` 1236, `web`
131, `@repo/sdk` 10, `@repo/shared` 56, emulador 186).

O `docs/PRE-PRODUCTION.md` §9 segue com a medição de 2026-09-30 (29/29 tasks, 806 arquivos, 2485 testes em 227,
170 contra emulador, 13 configs). O parágrafo data os números e manda remedir antes de citar, então está honesto;
só ficou para trás (ver [Contradições](#contradições-doc--código-medidas-nesta-rodada)).

CI: a execução de merge da PR **#47** (`gh run 38982571426`, SHA `dd31a95`) terminou em **`success`** nos quatro
jobs. As 30 últimas execuções do CI na `main` (`gh run list --branch main --limit 30`) estão verdes.

Branch protection segue **não ligado**, remedido hoje depois do merge da PR #47:
`gh api repos/:owner/:repo/branches/main/protection` → **404** ("Branch not protected"), `rulesets` → **`[]`**. O
repositório tem **47** PRs, nenhuma aberta.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter em 2026-10-16, depois do arquivamento) e prioriza valor × esforço × custo de
adiar. Só `social-sign-in-providers` está bloqueada por dependência. Ela e `one-time-purchase` ficaram `deferred` na
triagem de 2026-10-16, e as três specs antigas seguem paradas por decisão sua.

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | valor · esforço | situação |
|---|----|-----------------|----------|
| 1 | [`linked-sign-in-methods`](linked-sign-in-methods.md) | alto · M | `approved` em 2026-10-16. Destrava a exclusão de conta, a troca de e-mail e a troca de senha para quem entrou pelo Google; tudo prova-se sob o emulador de Auth. Prevalência baixa (1/10), valor vindo do próprio repositório |
| 2 | [`contact-support-channel`](contact-support-channel.md) | médio · P | `approved` em 2026-10-16, reaberta. O canal de privacidade, o card "Enterprise" da `/pricing` e a app sem ajuda dependem de um formulário que não envia. Desde a PR #47 a página de preços é real e o card de contato fica ao lado de planos de verdade. A entrega real do e-mail fica 🔒 sem a Resend (pendência 13) |
| 3 | [`magic-link-sign-in`](magic-link-sign-in.md) | médio · M | `proposed`. 5/10, gratuito no Firebase, opt-in por variável. Divide `packages/auth/client.ts` com a #1 e `apps/api/proxy.ts` com a #2 |
| 4 | [`in-app-notifications`](in-app-notifications.md) | médio · M | `proposed`, reaberta. 4/10, sem serviço pago. Você decidiu que o core terá o recurso, com o corte da spec (D6); ficou `proposed` para vir depois do lote das aprovadas |
| 5 | [`one-time-purchase`](one-time-purchase.md) | médio · M | `deferred` em 2026-10-16. 4/10. Toca todo o núcleo de cobrança e não tem consumidor no core; volta quando um fork precisar vender avulso. A `/pricing` já lê o catálogo, mas só preços recorrentes |
| 6 | [`social-sign-in-providers`](social-sign-in-providers.md) | médio · M | `deferred` em 2026-10-16 e **bloqueada** por `linked-sign-in-methods`. 5/10; volta quando a dependência for entregue e um fork pedir o provedor |
| 7 | [`account-security-mfa`](account-security-mfa.md), **fatia 3** (segundo fator) | médio · M | `in-progress`, 4 de 6 itens entregues (fatias 1 e 2, PRs #29 e #39). Nenhuma feature ativa e **fora do conjunto elegível** enquanto o status não mudar (E12). O preço do MFA no Identity Platform segue não confirmado, e a fatia exige ativar o recurso no projeto Firebase, então metade dos critérios ficaria 🔒 numa rodada autônoma |
| 8 | [`observability-logging`](observability-logging.md) | alto · M | `in-progress`, 5 dos 6 itens. O que falta é o coletor, que exige conta num provedor. Estacionada (E1) |
| 9 | [`teams-organizations`](teams-organizations.md) | alto · G | `deferred` desde 2026-08-22. Estacionada (E2) |

### A próxima: `linked-sign-in-methods`

- **Valor × esforço:** alto por M. Hoje a conta criada pelo Google não exclui a própria conta, não troca o e-mail e
  vê um formulário de troca de senha que sempre falha. Excluir a conta é direito do titular, e para essa pessoa ele
  depende do suporte.
- **Status:** `approved` desde a triagem de 2026-10-16. Pode ir direto para `/analyze linked-sign-in-methods`.
- **Dependências:** nenhuma. `account-settings` e `account-email-change`, que ela estende, estão arquivadas.
- **Risco de adiar:** cresce com cada fork que ligar o login pelo Google, porque cada conta só Google criada até lá
  herda o bloqueio.
- **O que desbloqueia:** `social-sign-in-providers`, que depende dela, e o achado da aba Segurança que mostra "trocar
  senha" para a conta só Google.
- **Prova:** Vitest e o fluxo de vincular, desvincular e definir senha sob o emulador de Auth, que aceita o provedor
  Google sem conta real. O 🔒 é o de sempre: o login com uma conta Google de verdade (pendência 17).

### O que não foi escolhido como próxima, e por quê

- **`contact-support-channel`**: a menor (P) e, desde a PR #47, a que fecha o card "Enterprise" de uma página de
  preços que agora é real. Fica em #2 porque a entrega da mensagem só se prova com a Resend, que nenhuma rodada
  autônoma tem (pendência 13), e porque o valor depende de o fork definir `NEXT_PUBLIC_APP_SUPPORT_EMAIL`. Cabe no
  mesmo lote da #1, sem arquivo em comum: se houver dois workspaces, rode as duas.
- **`magic-link-sign-in`** e **`in-app-notifications`**: seguem `proposed`. Aprovar ou não é decisão sua; enquanto
  isso, a auditoria não as recomenda à frente das aprovadas.

### Tarefas diretas candidatas

Nenhuma é recomendada à frente de `linked-sign-in-methods`. A lista fica para quando a fila de specs elegíveis secar,
na ordem em que a auditoria as pegaria.

- **Arquivamento pelo admin que não tira o acesso** (`users/[id]/route.ts:172-218`, `user-merge.ts:20-24`): a
  confirmação da tela promete "perde o acesso" e, pela leitura, o código não cumpre. P a M, com uma medição no
  emulador de Auth antes da correção.
- **Contrato de erro de `POST /auth/sign-in/google`** (`auth/sign-in/google/route.ts:10`, `:27-29`): o mesmo par
  de defeitos que a PR #46 corrigiu no `/auth/sign-in`, numa rota que tem consumidor
  (`apps/app/shared/lib/googleSignInApi.ts:36`). P, só `apps/api`, e o método de teste está pronto em
  `authSignInRoute.test.ts`. A spec `social-sign-in-providers` cobre essa rota, mas está `deferred`.
- **`docs/SECURITY.md` com o inventário de guards antigo** (`:16-33`): diz 36 rotas e 13 sem guard; são 37 e 14 desde
  a PR #47. Correção de texto, P. Achado novo desta rodada.
- **`typecheck` do `packages/shared` e o hash do `typecheck` no turbo** (`packages/shared/package.json:11`,
  `turbo.json:11-14`): P e medido, mas é ferramenta de quem mantém o repositório, mexe no lockfile (o
  `@types/node`) e no `turbo.json`, que toda tarefa usa. Desde a PR #47 o pacote guarda também o formatador de preço.
- **`radix-ui: latest` no design system** (`packages/design-system/package.json:25`): P, fixar a versão que o lockfile
  tem hoje.
- **Guard de redirect: decodificação dupla e teste fora do pacote** (`packages/auth/redirect.ts:27`,
  `apps/app/__tests__/postAuthRedirectTarget.test.ts`): P, só `packages/auth` e um teste movido. Achados novos desta
  rodada.
- **A `apps/web` sem `not-found`, `error` e `favicon.ico`** (raiz de `apps/web/app/` sem layout): M, e criar um root
  layout na web mexe no mesmo lugar que o idioma do servidor usa (PR #41).
- **Aparelho encerrado com a tela aberta não sai sozinho** e **sessão expirada que perde a query**
  (`packages/auth/provider.tsx`): M, e encostam no `packages/auth`, que `linked-sign-in-methods` declara em
  `contends_on` (`provider.tsx`). Melhor depois dela.
- **Nome de marca longo no header a 1024 px**: decisão de produto (a marca sai do centro).
- **Fatia 3 de `account-security-mfa` e coletor de `observability-logging`**: dependem de ativar recurso ou abrir
  conta num provedor (E12 e E1).

**Os demais candidatos não mudaram de motivo desde 2026-10-07 e não são mais reapresentados** (§5.1): o contraste
do seletor de tamanho da paginação, o `CommandDialog` em inglês, o 404 de arquivo inexistente (O1 da PR #41), as
rotas fora do rate limit, as âncoras de documento deslocadas, o código do erro em recusa esperada, o idioma das
preferências, o asterisco do `Label`, o foco que sai do botão de enviar e o `data-day`. O motivo de cada um está na
linha do achado, em [Achados](#achados-correções-pontuais-não-specs).

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Recalculado em **2026-10-16**, na
auditoria pós-PR #47, a partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3. Os 36 caminhos declarados pelas nove specs existem no disco (conferido em 2026-10-16).

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 4 de 9.** Com `pricing-page-catalog` fora da fila, `apps/api/proxy.ts` deixou de separar
`contact-support-channel` da primeira do lote.

| lote | specs | o que cada uma toca (`contends_on`) | por que não colidem |
|------|-------|--------------------------------------|---------------------|
| 1 | `linked-sign-in-methods` · `contact-support-channel` | `packages/auth/client.ts`, `provider.tsx` e `AccountSecurityForm.tsx` · formulário de contato da web, `apps/api/proxy.ts`, `ProfileDropdown.tsx` e o barril do SDK | os dois conjuntos não têm arquivo em comum |
| 2 | `magic-link-sign-in` · `in-app-notifications` | `packages/auth/client.ts`, `SignInForm.tsx`, `auth-action-links.ts` e `apps/api/proxy.ts` · barril do SDK, `account-export.ts`, `account-erasure.ts`, rota do webhook e `firestore.indexes.json` | os dois conjuntos não têm arquivo em comum |

Por que cada spec ficou fora do lote 1, nominalmente:

- **`magic-link-sign-in`** colide com `linked-sign-in-methods` em `packages/auth/client.ts` e com
  `contact-support-channel` em `apps/api/proxy.ts`.
- **`in-app-notifications`** colide com `contact-support-channel` no barril do SDK (`packages/sdk/src/client/index.ts`).
  Com `linked-sign-in-methods` não colide; se você quiser rodar só a #1 e ela, as duas cabem juntas.
- O lote 1 tem duas specs, abaixo do teto de 3, porque as outras duas colidem; não é o teto que as barra.
- **`one-time-purchase`** (`deferred`, fora dos lotes) colide com `in-app-notifications` na rota do webhook e em
  `account-export.ts`. Com a saída de `pricing-page-catalog`, deixou de colidir em `billing.ts` e em
  `AccountBillingPanel.tsx`.
- **`social-sign-in-providers`** não é elegível: está `deferred` e depende de `linked-sign-in-methods`. Quando
  entrar, colide com `magic-link-sign-in` em `client.ts` e `SignInForm.tsx`, e com `linked-sign-in-methods` em
  `client.ts`.

Contra as specs antigas: nenhum arquivo das quatro elegíveis está no `contends_on` de `account-security-mfa`
(`server.ts`, `session.ts` e `session-routes.ts` em `packages/auth`, e `resolve-api-actor.ts`) nem no de
`observability-logging` (`requestErrorReporter.ts`). `in-app-notifications` e `contact-support-channel` dividem o
barril do SDK com `teams-organizations`, e `in-app-notifications` divide também o `firestore.indexes.json`; como
`teams-organizations` está `deferred`, isso só pesa se ela voltar.

### Registro da rodada anterior (2026-10-16, pós-PR #46)

O lote 1 era `pricing-page-catalog`, `linked-sign-in-methods` e `in-app-notifications`; o lote 2,
`contact-support-channel`; o lote 3, `magic-link-sign-in`. Só `pricing-page-catalog` rodou, sozinha.

Previsão contra resultado da PR #47: a spec declarava sete arquivos no `contends_on` e tocou cinco
(`pricing/page.tsx`, `pricingCta.ts`, `AccountBillingPanel.tsx`, `apps/api/proxy.ts`, só no comentário, e
`apps/app/proxy.ts`). Não tocou `payments/plans/route.ts` nem `billing.ts`, porque o plano criou uma rota própria.
Fora da lista, tocou os formulários e as páginas de login e cadastro da app (`SignInForm.tsx`, que está no
`contends_on` de `magic-link-sign-in` e de `social-sign-in-providers`, e `SignUpFormClient.tsx`, que está no de
`social-sign-in-providers`), `packages/auth/redirect.ts`, o `BillingPlanCard.tsx`, a ação de pagamentos do SDK e o
barril de `packages/shared`. O plano previu a diferença (seção 10.14). Se `magic-link-sign-in` tivesse rodado em
paralelo, as duas teriam dividido o `SignInForm.tsx`, e só uma delas o declarava.

### Onde os lotes colidiram de fato (PRs #38 e #39)

Na auditoria de 2026-10-03, `plan-entitlements` era o lote 1 sozinho. Na prática, o `/cycle` rodou `plan-entitlements` e a
fatia 2 de `account-security-mfa` em paralelo, as duas a partir de `e791d3a`, embora a segunda estivesse
`in-progress` e, pelo algoritmo, fora do conjunto elegível. As duas mergearam em sequência, com CI verde, e
tocaram os mesmos seis arquivos, nenhum deles no `contends_on` das duas:

- `apps/api/(shared)/lib/account-export.ts` e `apps/api/__tests__/accountExportRoute.test.ts`: as duas
  acrescentaram campos à exportação de dados do titular;
- `packages/sdk/src/types/account/account.ts`: as duas mexeram no `AccountDTO` e no `AccountDataExportDTO`;
- `apps/api/.env.example` e `docs/PRE-PRODUCTION.md`: as duas acrescentaram texto;
- `translations/packages/shared/utils.ts`: excluído do `contends_on` por regra, e de fato aditivo.

`plan-entitlements` declarou 3 arquivos e tocou 2 (`webhooks/payments/route.ts` e `billing-state.ts`; o tipo
novo foi para um arquivo próprio, `plan-access.ts`, e `payments.ts` ficou intacto). `account-security-mfa`
declarou 4 e a fatia 2 tocou 3 (`session.ts` ficou intacto). **Lição para o campo:** a exportação de dados
(`account-export.ts` e o `AccountDataExportDTO`) é ponto de convergência de toda spec que grava dado pessoal novo,
e deve entrar no `contends_on` de qualquer spec assim. O efeito colateral do paralelo apareceu nos documentos, não
no código: ver as âncoras deslocadas em [Contradições](#contradições-doc--código-medidas-nesta-rodada).

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](README.md#depends_on--contends_on)). As PRs #38 e #39 seguiram a nota: nenhuma das duas
tocou o `BACKLOG.md`. As PRs #40 a #47 tocaram, mas só para levar a auditoria anterior, feita num workspace só.

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte de
MVP, e o histórico mostra que ela erra para menos: `admin-billing-insights` declarou 5 arquivos e tocou 4;
`brand-config`, `storage-emulator-rules-tests`, `accessibility-conformance` e `account-email-change` tocaram de
12 a 31 arquivos de código fora da lista; as PRs #38 e #39, acima, dividiram seis arquivos sem declarar nenhum;
a tarefa direta da PR #41 tocou quatro dos cinco previstos e mais quatro fora. A da PR #42 acertou os dois arquivos
de código, a primeira da PR #43 acertou os dois previstos, a da PR #44 tocou os dois previstos e mais dois arquivos
de código fora da lista, e as três da PR #45 tocaram tudo o que previam e mais quatro arquivos de código fora da lista
(`hookformInput.tsx`, `useSubmitEnterGuard.ts` e os dois footers da `apps/app`). As duas da PR #46 erraram para mais e
para menos ao mesmo tempo: a da web previu o `footer.tsx`, que não precisou mudar, e não previu o `package.json` da web;
a da API não previu o `auth.schema.ts`. A da PR #47 errou nos dois sentidos também: dois dos sete arquivos ficaram
intactos, e os formulários de login e cadastro da app, que outras duas specs declaram, entraram sem previsão.
Nenhuma rodada registrou conflito de merge causado por esses erros.

## Precisam de decisão

Segue aberta só a D9, que espera a compra avulsa voltar da fila. Esta auditoria não abriu pergunta nova. As decisões
que se repetem seguem em [Decisões estacionadas](#decisões-estacionadas-51), com a mesma recomendação.

| # | pergunta | recomendação | por quê |
|---|----------|--------------|---------|
| D9 | Na compra avulsa, o estorno feito no painel da Stripe retira o acesso? | sim, quando a spec voltar da fila | sem isso, o acesso vitalício sobrevive ao dinheiro devolvido. A spec está `deferred` desde 2026-10-16, então a pergunta só volta junto dela |

Respondidas por você na triagem de 2026-10-16, todas pela recomendação. Cada uma está registrada na seção
"Decisões" da spec: D3 (a triagem), D4 (o CTA de preços leva ao cadastro da app, cumprido pela PR #47 em
`pricingCta.ts:30-31`), D5 (definir a primeira senha numa conta só Google encerra as outras sessões), D6 (o core terá
central de notificações, com o corte da spec), D7 (o contato entrega em `NEXT_PUBLIC_APP_SUPPORT_EMAIL`) e D8 (o link
mágico não cadastra no MVP). D1 e D2 fecharam com a PR #46.

Resolvidos sem pergunta nesta rodada, por medição:

- **O CI no SHA de merge da PR #47**: verde nos quatro jobs (`gh run 38982571426`), e as 30 últimas execuções na
  `main` também. No momento em que a auditoria começou, a execução ainda estava em andamento; o resultado foi
  conferido depois que ela terminou, antes de arquivar a spec.
- **Se `pricing-page-catalog` entregou o corte**: lido no código de `main`, item a item, e pela suíte nesta auditoria,
  não pelo `STATE.md` (que registra `review: done` e `test: done`).
- **Se a branch da PR #47 foi apagada no remoto**: não. `feat/pricing-page-catalog` segue em `git ls-remote`
  (pendência 16).
- **Se a deriva do deep link de `onboarding-flow` fechou**: sim. `apps/app/proxy.ts:280` grava `pathname` e query no
  `x-app-path`, que o portão do onboarding lê (`apps/app/lib/server/onboarding.ts:39`), e `:247` leva a query ao
  `redirect` do login.
- **Se o `docs/SECURITY.md` acompanhou a rota nova sem guard**: só em parte. A linha do rate limit (`:155`) cita
  `/payments/catalog`, mas o inventário (`:16-33`) segue com 36 rotas e 13 sem guard. Virou achado.
- **Se o teste instável de `useListAuditEvents` reapareceu**: não, numa execução com 861 testes.

## Decisões estacionadas (§5.1)

Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (14 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor. A E12 pede a mesma coisa para `account-security-mfa` |
| E2 | `teams-organizations` continua `deferred`? (16 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar, exigindo `verify` e `e2e`; não há pré-requisito técnico. É o que falta para o item 2 de [`e2e-testing`](../docs/features/e2e-testing/spec.md), arquivada com esse ⚠️. Remedido em 2026-10-16, pós-PR #47: 404, `[]`, 47 PRs |
| E4 | O gate `approved` não é usado. Em 2026-09-26 você aprovou cinco specs de uma vez, e as cinco foram entregues depois de passar por ele (PRs #30 a #34). `plan-entitlements` foi a nona entregue sem passar por `approved`: você a manteve `proposed` em 2026-09-26, e o `/analyze` de uma rodada do `/cycle` a levou direto a `in-progress` | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | O deep link das abas da conta (`?tab=`) não acompanha a barra lateral (3 rodadas) | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:55-57`), por isso precisa da sua palavra. O `PlanGate` da PR #38 leva a `/account?tab=billing` e funciona porque a aba é lida ao montar |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | este arquivo, achado A1 em [Achados](#-achados-abertos-reconferidos-ou-herdados) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer; a nota de medição do `docs/AUTH-SSO.md` fica como está |
| E11 | O registro da feature não acompanha o merge, e a branch sai fora do padrão `<project>/<type>/<title>` | você | `.claude/rules/git-commits.md` e `.claude/skills/spec-audit/SKILL.md` §4.1 | **Atualizado em 2026-10-16, pós-PR #47:** a PR #47 saiu da branch `feat/pricing-page-catalog`, sem `<project>`, porque o diff cruza `apps/api`, `apps/web`, `apps/app` e quatro pacotes. É a nona PR (#37, #40 a #47) cujo squash leva a auditoria anterior junto, e desta vez também as sete specs da descoberta. Ponto positivo: o `STATE.md` registra `review: done`, `test: done` e o nome da branch que de fato subiu. A contagem de `STATE.md` com `review: in-progress` depois do merge fica em **17**, agora entre 47. **Registro anterior, pós-PR #46:** a PR #46 saiu da branch `guilhermebittelbrunn/cycle-2-features-implement`, que o `/review` das duas tarefas reprovou na regex e recomendou renomear para `fix/web-docs-link-and-api-error-codes`; a renomeação não aconteceu. É a oitava PR (#37, #40 a #46) cujo squash leva a auditoria anterior junto. Os dois `STATE.md` da PR (`web-docs-link-and-mobile-menu` e `api-auth-webhook-error-codes`) ficaram com `review: in-progress`, então a contagem subiu de 15 para **17**, entre 46 (recontada nesta rodada, lendo a linha `review` de cada um). **Registro anterior, pós-PR #45:** a PR #45 saiu como `fix/date-pickers-form-fields-and-header`, sem `<project>`, porque o diff cruza `packages/design-system`, `apps/app`, `apps/web` e `packages/internationalization`. É a sétima PR (#37, #40 a #45) cujo squash leva a auditoria anterior junto. Ponto positivo: os três `STATE.md` da PR (`date-input-navigation`, `form-field-focus-and-names` e `web-header-reflow-and-menu-name`) registram `review: done` e o nome da branch que de fato subiu; a contagem de `STATE.md` com `review: in-progress` depois do merge segue em 15, agora entre 44. **Registro anterior, pós-PR #44:** a PR #44 saiu como `fix/date-input-locale`, sem `<project>`, porque o diff cruza `packages/internationalization`, `packages/design-system` e `apps/web` (o `/review` dela citou esta linha como precedente). É a sexta PR (#37, #40, #41, #42, #43 e #44) cujo squash leva a auditoria anterior junto; na branch, a auditoria tinha commit `docs(specs)` próprio, como a regra pede. Das PRs #29 a #44, só a #36, a #40 e a #42 seguiram o padrão de branch; as três tocam código de um pacote só. **Contagem corrigida nesta rodada:** a auditoria anterior dizia que seis `STATE.md` seguiam com `review: in-progress` depois do merge. Lendo a linha `review` de todos os 41 `STATE.md` em `fa7041b`, são **15**: `api-hardening`, `cursor-pagination`, `audit-log`, `user-activity-tracking`, `onboarding-flow`, `accessibility-conformance`, `account-security-mfa`, `observability-logging`, `plan-entitlements`, `account-active-sessions`, `server-locale-from-url`, `antd-theme-seed-colors`, `account-deletion-dialog-focus`, `ui-strings-and-password-focus` e `date-input-locale`, todas com PR mergeada e CI verde (`observability-logging` com a parte entregue). As outras rodadas contavam só as features recentes. Os 26 restantes têm `review: done`; `e2e-testing` tem `test: blocked`, por decisão sua. A auditoria não os edita, porque a `spec-audit` só a autoriza a acrescentar `spec:` ao arquivar. Recomendação: a regra aceitar `fix/<slug>` e `feat/<slug>` para tarefa que cruza vários apps (como já aceita para épico), e a auditoria, ao confirmar o merge, gravar no `STATE.md` a linha `review` como `done` com o SHA e a branch |
| E12 | O destino da fatia 3 de `account-security-mfa` (segundo fator com códigos de recuperação, itens 5 e 6). Era a D10, aberta em 2026-10-04; estacionada em 2026-10-07, na segunda aparição. Opções: **(a)** arquivar a spec como entregue em 4/6, em `docs/features/account-security-mfa/spec.md`, e abrir uma spec `proposed` só do segundo fator; **(b)** voltar a spec para `proposed`, com as fatias entregues registradas nela, para que entre nos lotes; **(c)** manter `in-progress`; **(d)** marcar a fatia 3 como `deferred` dentro da spec | você | a spec [`account-security-mfa`](account-security-mfa.md) | **(a)**. Com `in-progress` e nenhuma feature ativa, a spec fica fora dos lotes para sempre, e o status afirma um trabalho que ninguém está fazendo. (a) segue o padrão recomendado na E1, deixa a evidência das fatias 1 e 2 junto da feature e abre uma spec pequena sobre o que falta: prevalência de 3/10, preço no GCIP não confirmado, ativação do recurso no projeto Firebase. A pasta de destino tem o mesmo nome do `id` e ainda não tem `spec.md` (reconferido em 2026-10-16, pós-PR #47), então não há colisão. (b) é a saída de menor esforço se você quiser manter o histórico num arquivo só |
| E13 | Ligar o bloqueio de bot da landing? Hoje ele nunca roda, nem com chave válida (achado do `skipValidation` da `apps/web`). Era a D8, aberta em 2026-09-30; estacionada em 2026-10-07, na quarta aparição | você | este arquivo, [Achados](#-repositório-rotas-e-proxy), linha do `skipValidation` | não ligar agora e declarar a decisão. Ligar é pôr `detectBot` e `shield` em modo `LIVE` para visitante anônimo em todo fork que já tem a chave; pede teste próprio (falso positivo de crawler, preview de link) e não cabe numa correção de configuração. Os documentos em `main` já descrevem o comportamento atual (`docs/ROPA.md:108`, `docs/SUBPROCESSORS.md:40`, `docs/FORKING.md:317-318`, no §7.3). Tirar o `skipValidation` sem esta decisão liga o bloqueio por tabela |

**Duas recomendações repetidas são decisões técnicas e deveriam virar linha de política.** A auditoria
não edita `.claude/`, então elas ficam aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."* Caso medido: `onboarding-flow` ficou seis rodadas presa pelo corte
  contestado, ganhou o bloco numa rodada e foi entregue na seguinte, 5/5. O bloco de `account-security-mfa`,
  escrito em 2026-09-26, levou às fatias 1 e 2.
- Em `.claude/skills/spec-audit/SKILL.md` §4.1, antes do passo 5: *"Reescreva os links relativos de saída
  da spec para o caminho novo: `research/*.md` vira `../../../specs/research/*.md`, spec viva vira
  `../../../specs/<id>.md`, spec arquivada vira `../<slug>/spec.md`. Rode o verificador de links no
  arquivo movido e confirme zero mortos."* A rodada de `plan-entitlements` fez isso à mão nos dois links de saída, e esta
  fez de novo nos três de `pricing-page-catalog` (a nota de pesquisa, `contact-support-channel` e `onboarding-flow`). O mesmo passo não cobre o link de entrada que o `analyze/plan.md` da feature tem para
  `specs/<id>.md` e que morre com o movimento: aconteceu de novo nesta rodada, com
  `docs/features/pricing-page-catalog/analyze/plan.md:3` (ver o achado).

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-10-16, pós-PR #47 |
|------|--------------|------------------------|
| [`linked-sign-in-methods`](linked-sign-in-methods.md) | — | ✅ sem dependência |
| [`contact-support-channel`](contact-support-channel.md) | — | ✅ sem dependência |
| [`magic-link-sign-in`](magic-link-sign-in.md) | — | ✅ sem dependência |
| [`in-app-notifications`](in-app-notifications.md) | — | ✅ sem dependência |
| [`one-time-purchase`](one-time-purchase.md) | — | ✅ sem dependência |
| [`social-sign-in-providers`](social-sign-in-providers.md) | `linked-sign-in-methods` | ⛔ não satisfeita: a dependência está `approved`, ainda não entregue |
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`). A spec está `in-progress`, com as fatias 1 e 2 em `main` |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`linked-sign-in-methods`](linked-sign-in-methods.md) | Métodos de login vinculados à conta | produto | alto | M | `approved` | — |
| [`contact-support-channel`](contact-support-channel.md) | Canal de contato e suporte que entrega a mensagem | produto | médio | P | `approved` (reaberta) | — |
| [`magic-link-sign-in`](magic-link-sign-in.md) | Entrar com link enviado por e-mail | produto | médio | M | `proposed` | — |
| [`in-app-notifications`](in-app-notifications.md) | Central de notificações no app | produto | médio | M | `proposed` (reaberta) | — |
| [`one-time-purchase`](one-time-purchase.md) | Compra avulsa com acesso vitalício | produto | médio | M | `deferred` | — |
| [`social-sign-in-providers`](social-sign-in-providers.md) | Login com GitHub e Microsoft, ligados por configuração | produto | médio | M | `deferred` | ⛔ `linked-sign-in-methods` |
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `in-progress` (fatias 1 e 2 entregues, PRs #29 e #39) | ✅ `account-settings` |
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
| `onboarding-flow` | 2026-09-24 | [`docs/features/onboarding-flow/spec.md`](../docs/features/onboarding-flow/spec.md) — **5/5 do corte** (PR #24, `d52c4f0`), 20/20 critérios sob o emulador. Deriva no item 3, o deep link que voltava sem a query string: **fechada pela PR #47** (`apps/app/proxy.ts:280`, `:247`). O texto da spec arquivada (`spec.md:246`) descreve a deriva como aberta e não foi editado |
| `billing-subscription` | 2026-09-25 | [`docs/features/billing-subscription/spec.md`](../docs/features/billing-subscription/spec.md) — **6/6 do corte** (PR #25, `a1f87d0`), mais o passo `billing` do expurgo herdado de `data-rights-lgpd`. 19 ✅ e 5 🔒 no `/test` (só conta Stripe real prova). ⚠️ Catálogo, portal, endpoint de webhook e chaves são passo manual por fork (`PRE-PRODUCTION.md` §12) |
| `admin-billing-insights` | 2026-09-25 | [`docs/features/admin-billing-insights/spec.md`](../docs/features/admin-billing-insights/spec.md) — **5/5 do corte** (PR #27, `0659ede`). 18 ✅, 4 🔒 e 1 ❌ anterior à entrega (hidratação em `/en` e `/es`). ⚠️ **Duas derivas** contra o bloco de reescopo, sem efeito na tela, aceitas pelo usuário; o endpoint da Stripe de cada fork precisa ganhar `invoice.paid` (`PRE-PRODUCTION.md:455`, âncora remedida em 2026-10-04) |
| `e2e-testing` | 2026-09-25 | [`docs/features/e2e-testing/spec.md`](../docs/features/e2e-testing/spec.md) — **4/5 do corte e 1 parcial** (PR #26, `c71755e`). ⚠️ O item 2 roda em toda PR mas **não bloqueia o merge** até o branch protection ser ligado (E3). O `STATE.md` segue com `test: blocked` pelo D3, corrigido na própria PR; o job `e2e` passou nas quatro execuções seguintes |
| `brand-config` | 2026-09-28 | [`docs/features/brand-config/spec.md`](../docs/features/brand-config/spec.md) — **5/5 do corte** (PR #30, `e07252a`), 14 ✅, 0 ❌ e 1 🔒 no `/test` (nome não ASCII na Resend). Primeira spec entregue depois de passar por `approved`. ⚠️ Marca, logo e ícones por fork são passo manual (`PRE-PRODUCTION.md` §13) |
| `storage-emulator-rules-tests` | 2026-09-28 | [`docs/features/storage-emulator-rules-tests/spec.md`](../docs/features/storage-emulator-rules-tests/spec.md) — **5/5 do corte** (PR #31, `2c285de`), 18 ✅, 0 ❌ e 1 🔒 no `/test`; o 🔒 (`verify` no GitHub) passou no merge, com 170 testes contra emulador. Segunda spec entregue depois de passar por `approved`. ⚠️ Deriva no item 5: o `build` não roda os testes contra emulador. Publicar `storage.rules` e ativar o bucket seguem passo manual (`PRE-PRODUCTION.md` §6) |
| `accessibility-conformance` | 2026-09-29 | [`docs/features/accessibility-conformance/spec.md`](../docs/features/accessibility-conformance/spec.md) — **6/6 do corte** (PR #32, `3e5ec4c`), allowlist do axe vazia e `e2e` 22/22 no merge. Terceira spec entregue depois de passar por `approved`. ⚠️ Duas derivas de letra (título por área, `aria-invalid="false"` sem erro); checkout em carregamento e leitor de tela real seguem 🔒. O diff introduziu e corrigiu antes do merge o "Excluir" ilegível no hover |
| `account-email-change` | 2026-09-29 | [`docs/features/account-email-change/spec.md`](../docs/features/account-email-change/spec.md) — **5/5 do corte** (PR #33, `f377c84`), 16 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real do aviso pela Resend). Quarta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no comportamento; o diff introduziu e corrigiu antes do merge dois defeitos de foco no diálogo novo. Resend, `FIREBASE_WEB_API_KEY` e o e-mail de suporte são passo manual por fork (`PRE-PRODUCTION.md` §3, §4 e §13) |
| `compliance-docs-kit` | 2026-09-30 | [`docs/features/compliance-docs-kit/spec.md`](../docs/features/compliance-docs-kit/spec.md) — **6/6 do corte** (PR #34, `c7aa4d9`), 18 ✅, 0 ❌ e 2 🔒 no `/test` (backup no Blaze e conformidade jurídica). Quinta spec entregue depois de passar por `approved`. ⚠️ Cinco derivas sem efeito no conteúdo. Preencher os `[FORK]`, aceitar os DPAs e decidir o backup são passo manual por fork (`PRE-PRODUCTION.md` §14) |
| `plan-entitlements` | 2026-10-04 | [`docs/features/plan-entitlements/spec.md`](../docs/features/plan-entitlements/spec.md) — **5/5 do corte** (PR #38, `2ed0df2`), 15 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real da Stripe). Entregue sem passar por `approved` (E4). Sem deriva. ⚠️ Recursos cadastrados no Dashboard da Stripe, o sexto evento no endpoint e o custo do Entitlements são passo manual por fork (`PRE-PRODUCTION.md` §12, a partir da `:455`); a demo em `entity` fica desligada sem `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` |
| `pricing-page-catalog` | 2026-10-16 | [`docs/features/pricing-page-catalog/spec.md`](../docs/features/pricing-page-catalog/spec.md) — **5/5 do corte** (PR #47, `dd31a95`), 21 ✅, 0 ❌ e 3 🔒 no `/test` (catálogo, chamadas e checkout contra conta Stripe real). Sexta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: rota nova `GET /payments/catalog`, cache de uma hora por instância, rota fora do rate limit de propósito, e quem tem sessão volta pelo bounce do proxy. Fechou a deriva do deep link de `onboarding-flow` e um open redirect em `packages/auth/redirect.ts`. Nenhum passo manual novo: o catálogo é o mesmo do `PRE-PRODUCTION.md` §12 |

**Verificado na auditoria de 2026-10-16 (pós-PR #47):** `docs/features/` tem **47** pastas e **27** `spec.md`
arquivados, todos com `status: done`. As vinte pastas sem `spec.md` são `account-security-mfa` e
`account-active-sessions` (fatias 1 e 2 da spec `in-progress` em `specs/`), `observability-logging` (spec
`in-progress`), `auth-panel-context` e `impersonation-read-only` (as duas anteriores à semeadura), e
`i18n-hydration-admin-delete-billing`, `disabled-account-revocation`, `arcjet-key-lazy-validation`,
`admin-self-lockout-guard`, `action-menu-keyboard-delete`, `server-locale-from-url`, `antd-theme-seed-colors`,
`account-deletion-dialog-focus`, `ui-strings-and-password-focus`, `date-input-locale`, `date-input-navigation`,
`form-field-focus-and-names`, `web-header-reflow-and-menu-name`, `web-docs-link-and-mobile-menu` e
`api-auth-webhook-error-codes` (tarefas diretas, listadas em
[Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec)). A última arquivada é `pricing-page-catalog`,
nesta rodada; o `STATE.md` dela já trazia `spec: pricing-page-catalog`, então não precisou de edição.

### O que a PR #27 entregou **além** do corte (registrado em 2026-09-25)

1. **O webhook parou de ecoar o evento Stripe** na resposta de sucesso: `route.ts:298` devolve só
   `{ ok: true }` (âncora remedida em 2026-10-16; a PR #46 a deslocou de `:242`).
2. **A checagem de `ALREADY_EXISTS` do Firestore virou helper compartilhado** (`isAlreadyExistsError`,
   `apps/api/(shared)/infra/firestore-errors.ts:4`), usado pelos repositórios de fatura e de ativação.
3. **Aviso de endpoint incompleto.** Com assinatura vigente e nenhuma fatura paga registrada, a seção avisa
   que falta `invoice.paid` no endpoint (`BillingInsightsSection.tsx:76-83`), em vez de mostrar receita
   zero sem explicação.
4. **A declaração do expurgo ganhou as duas coleções novas** (`docs/PRE-PRODUCTION.md:766`, relida em `main` em
   2026-10-04, depois da PR #39; era `:759` até a PR #47): ficam depois da exclusão, porque guardam só ids da Stripe, valor, moeda e datas.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida ao passar por ela. A PR #47 alterou sete documentos fora de `docs/features/` e `specs/`
(`docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md`, `docs/SECURITY.md`, `docs/FORKING.md`, `docs/ROPA.md`,
`docs/SUBPROCESSORS.md` e `docs/INCIDENT-RESPONSE.md`) e a skill `payments-flow`. Esta auditoria releu as linhas que
eles mudaram contra o código. Quase todas conferem; a exceção é o inventário de guards do `SECURITY.md`, que não
contou a rota nova. A PR acrescentou texto ao `PAYMENTS.md` (+34 linhas) e ao `PRE-PRODUCTION.md` (+7), o que
deslocou as âncoras que este arquivo cita nos dois; as linhas abaixo trazem o número novo. As linhas medidas antes e
sem arquivo alterado mantêm o veredito e a data de lá. A auditoria não edita `docs/`; o que está defasado fica
registrado aqui.

| documento | afirma | realidade medida | veredito |
|-----------|--------|------------------|----------|
| `docs/SECURITY.md:16-33` (inventário de guards) | 36 arquivos de rota, 23 com guard, 13 nus ("medido em 2026-10-14") | recontado em 2026-10-16, pós-PR #47: `find "apps/api/app/(routes)" -name route.ts` dá **37**, e 14 não chamam `require(CommonPanel\|Admin\|Plan)Api`: os 13 de antes e `payments/catalog`, sem guard de propósito. A tabela `:21-25` não tem linha para a rota nova | ❌ **defasado pela PR #47**, que editou a linha `:155` do mesmo arquivo e não o inventário. Achado novo |
| `docs/SECURITY.md:155` | `/payments/catalog` fica fora do rate limit, protegido pelo cache de uma hora; cita `apps/api/proxy.ts:49-62` | a lista está em `apps/api/proxy.ts:49-62`, sem a rota; o comentário em `:43-45` dá o motivo; o cache em `plan-catalog-cache.ts:19-37` | ✅ **honesto**, novo pela PR #47. As outras rotas de `payments/` seguem fora da lista sem menção (achado aberto) |
| `docs/PRE-PRODUCTION.md:414` | o cookie `x-locale` é gravado em `apps/app/proxy.ts:230,234` | os dois `cookieStore.set("x-locale", …)` estão em `:230` e `:234` | ✅ **corrigido pela PR #47** no mesmo diff que deslocou o código |
| `docs/features/pricing-page-catalog/analyze/plan.md:3` | link para `../../../../specs/pricing-page-catalog.md` | a spec foi movida nesta rodada para `../spec.md` | ❌ **link morto, criado por este arquivamento**, como o de `plan-entitlements`. A auditoria não edita o plano; ver o achado |
| `docs/features/pricing-page-catalog/analyze/plan.md:349` e `develop/handoff.md:113` | o preço em BRL sai "R$ 29,00 / mes" em `es` | o `Intl` (CLDR) formata "29,00 BRL / mes", como a aba da app; o `/test` mediu | ⚠️ **expectativa errada no plano**, já registrada no `review/review.md` e no `test/report.md`; o código está certo |
| `docs/features/onboarding-flow/spec.md:246` (arquivada) | a deriva do item 3 segue aberta: o proxy grava só o `pathname` | desde a PR #47 o `x-app-path` leva `pathname` e query (`apps/app/proxy.ts:280`) | ⚠️ **histórico**: a spec descreve a data da entrega. A tabela [Entregues](#entregues) registra o fechamento |
| os oito documentos (âncoras de código) | 127 `arquivo:linha` com caminho único no repositório | em 2026-10-04, todos existem e cabem no arquivo. As que apontam para código alterado pelas PRs foram lidas uma a uma; as deslocadas estão nas linhas seguintes | ✅ **honesto** na existência |
| `docs/SECURITY.md:157` | sete das dez rotas de `/account` fora do rate limit, as quatro de sessões entre elas | `apps/api/proxy.ts:49-62` (era `:45-58` até a PR #47): a lista tem `/account/export`, `/account/deletion` e `/account/email`; dez arquivos de rota em `account/` | ✅ **honesto**. A linha desceu de `:154` para `:157` com o parágrafo do `/auth/sign-in` que a PR #46 acrescentou |
| `docs/ARCHITECTURE.md:64`, `AGENTS.md:25`, `apps/app/CLAUDE.md:47`, `.claude/skills/i18n-sync/SKILL.md:14` | no servidor, o idioma vem do segmento da URL, repassado pelos proxies no header `x-request-locale`; sem header válido, cookie e depois padrão; fora do `matcher` o header chega como o navegador mandou | `server.ts:31-34`, `apps/web/proxy.ts:133`, `apps/app/proxy.ts:281` (era `:264` até a PR #47; os documentos não citam a linha); o `matcher` da app exclui `api` e `_next/*` (`apps/app/proxy.ts:122`) | ✅ **honesto**, por leitura |
| `docs/features/i18n-hydration-admin-delete-billing/test/report.md:67` | na troca suave de `/en/entities` para `/es/entities`, `document.documentElement.lang` "passou a `es`" | o `/test` da PR #41 mediu o contrário no código anterior à correção (`5f4a8e9`), em build: `lang` ficou `"en"` até recarregar. O root layout da app fica acima de `[locale]` e não renderiza de novo; quem atualiza o atributo hoje é o `DocumentLangSync` | ❌ **afirmação não reproduzida**; o modo da medição antiga (dev ou build) não está registrado. Sem efeito hoje, porque o comportamento correto passou a existir |
| `docs/PRE-PRODUCTION.md:416` | o cookie `sidebar_state` é declarado em `sidebar.tsx:29` | o `SIDEBAR_COOKIE_NAME` está em `packages/design-system/components/ui/sidebar.tsx:29` | ✅ **corrigida pela PR #44** (era ⚠️, deslocada pela PR #43) |
| `docs/RESEARCH-tanstack-vs-next.md:40` | o `"use client"` do seletor de idioma da app está em `LanguageSwitcher.tsx:3` | está em `apps/app/shared/components/ui/LanguageSwitcher.tsx:1`; o documento não muda desde a PR #39 | ⚠️ **deslocada**, medida pela primeira vez em 2026-10-14 |
| `docs/FORKING.md:366` (era `:364` até a PR #47) e `docs/SETUP.md:72` | `NEXT_PUBLIC_DOCS_URL` liga o link "Documentação" no header e no footer da web, só na web | o `env` da web declara a variável (`apps/web/env.ts:24`, `:34`), e o header e o footer a leem (`header/index.tsx:91-100`, `footer.tsx:28-35`); o `/test` da PR #46 mediu nos dois, em build | ✅ **corrigido pela PR #46** (era ❌). O `SETUP.md` perdeu o `app`. A variável segue preenchida em `apps/app/.env.example:74` e `apps/api/.env.example:87`, sem consumidor (achado aberto) |
| `docs/AUTH-SSO.md:105` | o link "Ir para o painel" do header da web depende do modo, em `header/index.tsx:38` | a PR #46 deslocou o arquivo de novo: a checagem do modo está em `:66` (`isSubscriptionMode() && panelUrl`), e o link em `:250-264`; `:38` hoje é o meio da constante `FULL_BAR_FROM` | ⚠️ **deslocada**, remedida em 2026-10-16. O parágrafo pertence à nota do modo `simple` (E10) |
| `specs/BACKLOG.md` (auditoria pós-PR #45, achado A4 e recomendação #2) | um `400` no webhook encerra as reentregas da Stripe | a documentação da Stripe trata `4xx` como falha, como `5xx`, e reentrega por até três dias em produção ([docs.stripe.com/webhooks](https://docs.stripe.com/webhooks), seções "Corrigir códigos de status HTTP" e "Novas tentativas automáticas", relida em 2026-10-16). O `/analyze` de `api-auth-webhook-error-codes` pegou o erro; o código (`webhooks/payments/route.ts:248-253`) e o `docs/PAYMENTS.md:99-107` dizem a coisa certa | ❌ **erro da auditoria pós-PR #45**, corrigido na auditoria pós-PR #46. O `400` continua certo por outro motivo: a requisição é recusada, não é falha do servidor |
| `docs/ROPA.md:108` e `docs/SUBPROCESSORS.md:40` | o `skipValidation` está em `apps/web/env.ts:33`; o bloqueio de bot é pulado em `apps/web/proxy.ts:63` (ROPA) e chamado em `apps/web/proxy.ts:68` (SUBPROCESSORS) | `skipValidation: true` em `apps/web/env.ts:36` (a PR #46 acrescentou três linhas acima); `if (!env.ARCJET_KEY)` em `apps/web/proxy.ts:67` e `secure(` em `:72`, deslocados pela PR #41 | ⚠️ **deslocadas**, medidas em 2026-10-16. O comportamento descrito segue verdadeiro (E13) |
| `.claude/skills/write-tests/SKILL.md:8` | todo `vitest.config.mts` usa `environment: "jsdom"` | 2 dos 14 configs de workspace usam `jsdom` (`apps/app` e `packages/design-system`); os outros 12, `node`. A web testa em `node` e liga `jsdom` por arquivo (`apps/web/CLAUDE.md:28-35`, desde a PR #46) | ❌ **não descreve o repositório**. Registrado pelo `/review` de `web-docs-link-and-mobile-menu`; medido em 2026-10-16, pós-PR #46 |
| `docs/RESEARCH-tanstack-vs-next.md:85` | o webhook usa `headers()` em `route.ts:4,43-44` | o import está em `webhooks/payments/route.ts:7` e a chamada em `:270` | ⚠️ **deslocada**, medida pela primeira vez em 2026-10-16, pós-PR #46; o documento é nota de pesquisa e não muda desde a PR #39 |
| `docs/features/web-docs-link-and-mobile-menu/STATE.md` e `docs/features/api-auth-webhook-error-codes/STATE.md` | `review: in-progress`; as notas citam `specs/BACKLOG.md:240-280`, `:1263` e `:286-328` | PR #46 mergeada com CI verde, da branch que o campo `branch` registra; as linhas são da versão pós-PR #45 deste arquivo, que esta rodada reescreveu | ⚠️ **defasados**, estacionados em E11 |
| `docs/features/date-input-navigation/analyze/plan.md` §9 e §10 (em `main` desde a PR #45) | clicar no rótulo "Data" foca o botão; sob personificação o campo de nascimento continua desabilitado | o clique no `<label for="date">` abre o calendário (medido pelo `/test`); `EntityFormFields.tsx` não passa `disabled` aos campos, e a personificação bloqueia só o envio | ⚠️ **texto do plano não descreve o código**; o código está certo e o `/test` corrigiu os dois textos em `test/criterios-aceite.md`, que entrou em `main` junto |
| `docs/features/date-input-navigation/STATE.md`, `form-field-focus-and-names/STATE.md` e `web-header-reflow-and-menu-name/STATE.md` | `review: done`; o campo `branch` diz "a renomear a partir de guilhermebittelbrunn/cycle-command-v4"; as notas citam `specs/BACKLOG.md:231-278`, `:281-330` e `:323-358` | PR #45 mergeada com CI verde, da branch `fix/date-pickers-form-fields-and-header`, que o campo acerta; as linhas são da versão pós-PR #44 deste arquivo, que esta rodada reescreveu | ⚠️ **defasado** só nas linhas citadas, estacionado em E11 |
| `docs/features/date-input-locale/STATE.md` | `review: in-progress`; notas citam `specs/BACKLOG.md:230-272` (a recomendação) | PR #44 mergeada com CI verde, da branch `fix/date-input-locale`, que o campo `branch` acerta; as linhas são da versão pós-PR #43 deste arquivo, que esta rodada reescreveu | ⚠️ **defasado**, estacionado em E11 |
| `docs/features/account-deletion-dialog-focus/STATE.md` e `docs/features/ui-strings-and-password-focus/STATE.md` | `review: in-progress`; `branch:` "proposta, a criar"; notas citam `specs/BACKLOG.md:183-213`, `:793`, `:695` e `:942` | PR #43 mergeada com CI verde, da branch `fix/ui-labels-and-account-dialog-focus`; as linhas são da versão pós-PR #42 deste arquivo | ⚠️ **defasados**, estacionados em E11 |
| `docs/features/antd-theme-seed-colors/STATE.md` | `review: in-progress`; notas citam `specs/BACKLOG.md:185-219` e `:737` | PR #42 mergeada com CI verde; as linhas eram da versão anterior à rodada pós-PR #42 | ⚠️ **defasado**, estacionado em E11 |
| `docs/features/accessibility-conformance/spec.md:53-54`, `:166` (arquivada) | o `danger` do antd recebe o `colorError` em `var(...)` (`antd-app.tsx:20`) e o `Dropdown` tem override de `colorError` por componente (`antd-app.tsx:75-78`); `--destructive` do escuro em `globals.css:63` | desde a PR #42, o `colorError` é o hex do `--destructive` por tema (hoje `antd-app.tsx:136`, depois dos imports da PR #43), o override saiu (o `Dropdown` em `:103-105` só guarda o `colorTextLightSolid`) e o token escuro está em `globals.css:64`. A cor do item `danger` não mudou (`actionMenu.test.tsx:80-105`, `antdTheme.test.tsx:251`) | ⚠️ **histórico**: a spec descreve o mecanismo da data da entrega. Não é regressão; a capacidade segue coberta por teste |
| `docs/features/server-locale-from-url/STATE.md` | `review: in-progress`; notas citam `specs/BACKLOG.md:177-210` e `:547` | PR #41 mergeada com CI verde; as linhas eram da versão anterior à rodada pós-PR #41 | ⚠️ **defasado**, estacionado em E11 |
| `docs/PRE-PRODUCTION.md:501` (era `:497` até a PR #47) | o expurgo cancela a assinatura em `account-erasure.ts:95` | a chamada de `cancelSubscriptionForErasure` está em `:97` (a PR #39 acrescentou o passo de sessões acima) | ⚠️ **deslocada em duas linhas**; a PR #47 mexeu no documento e não nesta âncora |
| `docs/SUBPROCESSORS.md:33` | a coleção `user` é declarada em `user.repository.ts:42` | `:42` é o fim de um bloco; o `super(db, "user")` está em `:46`, empurrado pela PR #38. A mesma linha cita `session.repository.ts:49`, que confere | ⚠️ **deslocada** pela PR vizinha |
| `docs/SUBPROCESSORS.md:35` | a Stripe é chamada no expurgo em `account-erasure.ts:85` | `:85` é `}`; o `getStripe()` está em `:87` | ⚠️ **deslocada** pela PR #39 |
| `docs/ROPA.md:69` e `:83` | `lastAccessAt` em `user.ts:54-59`; `stripeCustomerId` e assinatura em `user.ts:62-65` | o import de `EntitlementsState` (PR #38) empurrou o arquivo uma linha: hoje `:55-60` e `:63-66`. A PR #39 editou a linha `:69` sem ver o deslocamento, porque partiu de `e791d3a` | ⚠️ **deslocadas** pela PR vizinha |
| `docs/INCIDENT-RESPONSE.md:63` e `docs/BACKUP.md:88` | as ações auditadas em `audit.ts:2-11`; o alvo em `audit.ts:29-31` | a PR #39 acrescentou duas ações ao enum: hoje `:2-13` e `:31-33` | ⚠️ **deslocadas** pela própria PR #39 |
| `docs/ROPA.md` e `docs/SUBPROCESSORS.md` (inventário do perfil) | o perfil guarda telefone, avatar, preferências, onboarding, `lastAccessAt`, `stripeCustomerId` e assinatura | o perfil guarda também `entitlements`, a lista de recursos pagos gravada pelo webhook desde a PR #38 (`packages/sdk/src/types/user/user.ts:67-68`) | ❌ **omissão**. Ver o achado novo em [compliance-docs-kit](#-achados-da-entrega-compliance-docs-kit-2026-09-30) |
| `docs/PRE-PRODUCTION.md` §9 (gate) | 29/29 tasks, 806 arquivos, 2485 testes em 227, 170 contra emulador, 13 configs, medidos em 2026-09-30 | em 2026-10-16, pós-PR #47: 30/30, 902, 3010 em 281, 186, 14 configs. A seção mudou de `:603` para `:610` | ✅ **honesto**, datado; o parágrafo manda remedir antes de citar |
| `docs/PRE-PRODUCTION.md:832-852` (era `:825-845` até a PR #47) e `docs/AUTH-SSO.md:74-76` (sessões) | o "Sair" encerra só o navegador atual; encerrar uma sessão corta a API e o cookie, não o refresh token no Firebase; Firestore e Storage negam todo cliente | `session-routes.ts:174-183`; `resolve-api-actor.ts:57-79`; `firestore.rules:32-34` e `storage.rules` negam tudo | ✅ **honesto**, por leitura |
| `docs/PAYMENTS.md:28`, `:44`, `:148`, `:229-242` (acesso por plano) | `requirePlanApi`, `PlanGate`, o sexto evento e a demo desligada | conferem com `plan.ts`, `plan-access.ts`, `PlanGate.tsx` e `webhooks/payments/route.ts:219` | ✅ **honesto**. As linhas eram `:27`, `:42`, `:114` e `:195-208` até a PR #47, que acrescentou ao documento a seção do catálogo público |
| `docs/features/plan-entitlements/analyze/plan.md:3` | link para `../../../../specs/plan-entitlements.md` | a spec foi movida em 2026-10-04 para `../spec.md` | ❌ **link morto, criado por aquele arquivamento**. A auditoria não edita o plano; ver o achado novo |
| `docs/features/plan-entitlements/STATE.md` e `docs/features/account-active-sessions/STATE.md` | `review: in-progress` | PRs #38 e #39 mergeadas com CI verde; reconferido em 2026-10-07, os dois seguem assim | ⚠️ **defasados**, estacionados em E11 |
| `docs/features/admin-self-lockout-guard/STATE.md` (notas) | cita `specs/BACKLOG.md:248-284`, `:860` e `:365` | as linhas eram da versão anterior à auditoria de 2026-10-04 | ⚠️ **defasado**, mesmo caso das tarefas anteriores |
| `docs/features/action-menu-keyboard-delete/STATE.md` (notas) | cita `specs/BACKLOG.md:185-195` (a recomendação) e `:625-626` (os achados) | as linhas eram da versão de 2026-10-04; nesta, a recomendação é outra e os dois achados saíram para a lista de fechados | ⚠️ **defasado**, mesmo caso. A nota do mesmo arquivo sobre o `git mv` de `specs/plan-entitlements.md` no índice perdeu o objeto: o rename foi no commit da PR #40 |
| `docs/FORKING.md:439` (link; era `:437` até a PR #47) | aponta para `../README.md#crud-de-referência` | o README renderizado pelo GitHub publica o id `user-content--crud-de-referência`, com `href="#-crud-de-referência"` (medido em 2026-09-30) | ❌ **link morto**; a PR #47 mexeu no documento e não no link |
| `docs/features/accessibility-conformance/STATE.md`, `account-security-mfa/STATE.md`, `brand-config/STATE.md`, `account-email-change/STATE.md`, `compliance-docs-kit/STATE.md`, `e2e-testing/STATE.md`, `disabled-account-revocation/STATE.md`, `arcjet-key-lazy-validation/STATE.md` | as defasagens de etapa, branch ou linha registradas nas rodadas anteriores | não mudaram | ⚠️ **defasados**, estacionados em E11 ou mantidos por decisão do usuário (`e2e-testing`) |
| `docs/AUTH-SSO.md:66-71` e a pendência do modo `simple` no `PRE-PRODUCTION.md` | redirecionamento do comum para a web no `simple` | não remedido; estacionado (E10) | ⚠️ nota de medição anterior segue no lugar |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

| id | especificado | implementado | leitura |
|----|--------------|--------------|---------|
| `account-security-mfa` (item 2) | sessões ativas "com dispositivo/origem e último uso" | navegador, sistema e tipo de aparelho tirados do user-agent, instante do login e do último uso; sem IP; app e web no mesmo navegador contam como uma sessão | **a spec estava imprecisa**. Gravar IP mudaria a natureza jurídica do dado, como a lacuna de `user-activity-tracking` já registrava. Nota escrita no item |
| `account-security-mfa` (item 3) | encerrar uma sessão específica | a API e os front-ends recusam a sessão encerrada; o refresh token do aparelho segue válido no Firebase | **a spec estava errada sobre o provedor**: o Firebase só revoga a conta inteira. A limitação está declarada em `docs/AUTH-SSO.md:74-76` e no `PRE-PRODUCTION.md`. Nota escrita no item |
| `plan-entitlements` | o corte inteiro | o corte inteiro; a pergunta "Entitlements ou mapa local" foi decidida pela recomendação da spec | **sem deriva**. A variável da demo usa o prefixo `NEXT_PUBLIC_` também na API, para ter um nome só nos dois apps; é escolha do plano, não desvio |
| `pricing-page-catalog` (item 2) | leitura pública pela API; a spec previa abrir `payments/plans/route.ts` e mexer em `billing.ts` | rota nova `GET /payments/catalog`, sem guard, com cache em memória; a rota da aba e o `billing.ts` ficaram intactos | **a spec estava imprecisa** sobre o lugar; o resultado pedido é o mesmo. Nota na spec arquivada |
| `pricing-page-catalog` (sinal de pronto 4) | "duas visitas seguidas não geram duas chamadas à Stripe" | vale por instância do servidor: em serverless, N instâncias quentes fazem até N chamadas por hora | **a spec não distinguia** cache global de cache por processo. O plano registrou o limite; a medição em produção ficou 🔒 |
| `pricing-page-catalog` (item 2) | entra no rate limit "se o `/analyze` achar necessário" | fica fora, de propósito: o servidor da landing pede em nome de todo visitante, de um endereço só (`apps/api/proxy.ts:43-45`) | **escolha que a spec delegou**, registrada no código e no `docs/SECURITY.md:155`. O inventário de guards do mesmo documento não acompanhou (achado novo) |
| `pricing-page-catalog` (item 3) | quem já está logado vai direto para a aba | o CTA é o mesmo para todos (`sign-up?redirect=`), e o proxy devolve quem tem sessão ao destino (`apps/app/proxy.ts:265`) | **sem efeito no resultado**: o destino final é a aba com o plano em destaque. O `/test` mediu os dois caminhos |

As três primeiras linhas seguem como em 2026-10-04. As quatro de `pricing-page-catalog` são desta rodada, e nenhuma
piora o que o corte pedia. A PR #47 não mexeu no corte das duas specs `in-progress`; deslocou âncoras de
`observability-logging` (`apps/api/proxy.ts`, quatro linhas de comentário acima da lista de rate limit) e de
`account-security-mfa` (`SignUpFormClient.tsx`), remedidas nas duas. Também deslocou âncoras de quatro specs vivas que
não estavam no lote (`contact-support-channel`, `magic-link-sign-in`, `social-sign-in-providers` e
`one-time-purchase`), todas remedidas com o número antigo entre parênteses.

**Registro da rodada anterior (pós-PR #46).** A PR #46 mexeu em `apps/api`, mas fora do corte das duas specs
`in-progress`: deslocou âncoras que elas citam (o webhook em `observability-logging`, o `auth.schema.ts` e a folha de
`apiErrors` em `account-security-mfa`), sem mudar o comportamento descrito. As âncoras foram remedidas nas duas specs.
As sete specs novas foram escritas sobre o `c8577b7`, depois do merge; das âncoras delas, esta auditoria corrigiu três
em `pricing-page-catalog` e duas em `one-time-purchase`.

**Deriva de texto em `pricing-page-catalog`, a spec estava errada:** o problema e os sinais de pronto falavam de
"R$ 40" nos três idiomas; o dicionário tem "R$ 40" em pt-br e "$40" em en e es
(`translations/apps/web/pages/pricing/index.ts:10`, `:55`, `:101`). Corrigido na spec, com uma linha de nota.

As duas tarefas diretas da PR #46 não tinham corte de spec. Contra as recomendações da auditoria pós-PR #45:

- `web-docs-link-and-mobile-menu` entregou os seis itens. Foi além em dois pontos: os links de documentação abrem em
  aba nova nas três superfícies, e a web ganhou `jsdom` e `@testing-library/*` como devDependencies, só para o teste
  do menu, com o ambiente global da suíte mantido em `node`. É dependência nova de teste; a `cycle-policy` §2 pede
  que dependência nova passe pelo relatório, e ela passou pelo `/review`, que conferiu o lockfile com rede. Ficaram
  fora, com motivo no plano, o Escape e o clique fora no menu (D6) e a variável sem consumidor nos `.env.example` da
  `app` e da `api` (D5).
- `api-auth-webhook-error-codes` entregou os seis itens, com a deriva de letra registrada na conferência (falha de
  infraestrutura no login segue 500 sem corpo, D5 do plano). Foi além em três pontos: o 500 do handler do webhook
  ganhou código próprio, o inventário de guards do `docs/SECURITY.md` foi recontado, e o `docs/PRE-PRODUCTION.md:568`
  deixou de prometer 500 para o webhook sem assinatura. O plano corrigiu a premissa desta auditoria sobre a Stripe.

Nenhum desvio piora o que as recomendações pediam.

As três tarefas diretas da PR #45 também não tinham corte de spec. Contra as recomendações das três passadas de
2026-10-14:

- `date-input-navigation` entregou os seis itens e trocou os três remendos previstos para a `/contact` pelo próprio
  `DateInput`, o que tirou a data de hoje pré-selecionada (o teste SSR da página foi reescrito por isso). Ficaram
  fora, com motivo no plano, o `data-day` e limitar o nascimento a datas passadas (regra de produto).
- `form-field-focus-and-names` entregou os seis itens e foi além em dois pontos: o mesmo `readOnly` no
  `HookFormInput` comum, que tinha o mesmo defeito, e os dois footers da `apps/app` sem o contorno do `disabled`,
  porque o `Button` passou a travar sozinho (correção na raiz, `cycle-policy` §3). O `useSubmitEnterGuard` corrigiu o
  Enter repetido que a própria troca para `readOnly` abriu, medido e corrigido antes do merge.
- `web-header-reflow-and-menu-name` entregou os seis itens com a troca de grade, sem mexer em breakpoint. O
  `lg:truncate` da marca entrou e saiu dentro da PR, porque o `/test` mediu que ele não agia; a marca longa a
  1024 px virou achado.

Nenhum desvio piora o que as recomendações pediam.

A tarefa direta da PR #44 também não tinha corte de spec. Contra a recomendação da auditoria pós-PR #43, entregou
os seis itens do critério de pronto e mais duas coisas: a data do formulário de contato da web no idioma da página
(pergunta P1 do plano, adotada, com um teste novo do `/test`) e o `calendarLocales` num módulo próprio, sem
`"use client"`, porque o `/review` viu que a web passaria a importar um mapa de dados de dentro de um módulo de
componente client. A recomendação previa `contends_on` de dois arquivos; a tarefa tocou os dois e mais o formulário
de contato e o módulo novo. Ficaram fora, com motivo registrado no plano (§1.3): tirar o `datePlaceholder` da trilha,
expor `locale` como prop do `DateInput` e capitalizar mês e dia da semana em pt-br e es. O `/review` registrou, sem
corrigir, que um `locale={undefined}` explícito do chamador faz o `Calendar` voltar ao `enUS`, porque o `{...props}`
vem depois (`calendar.tsx:200-202`); nenhum consumidor faz isso. Nenhum desvio piora o que a recomendação pedia.

As duas tarefas diretas da PR #43 também não tinham corte de spec. `account-deletion-dialog-focus`, contra a
recomendação da auditoria pós-PR #42, entregou os cinco itens do critério de pronto e mais uma coisa: o
`form.reset()` ao fechar o diálogo, porque o plano mediu a senha e o erro sobrevivendo ao "Cancelar" (pergunta 2
da §11 do plano, adotada). O `contends_on` proposto acertou os dois arquivos. `ui-strings-and-password-focus` não
teve recomendação: o plano montou o corte a partir de três achados deste arquivo e de um do `/test` da tarefa
anterior, e acrescentou por conta própria seis textos dos mesmos arquivos que o achado não listava (título e
descrição da barra lateral no celular, o "Close" do `DialogFooter`, o nome e os textos visíveis da `Pagination`, o
nome do `Breadcrumb`). Deixou de fora, com motivo registrado, o `DateInput` e o `CommandDialog`. A recomendação
anterior dizia que as strings soltas eram tarefa M com chance de colidir com outra do design system; saiu como uma
tarefa só, sem colisão, no mesmo PR da outra. Nenhum desvio piora o que os achados pediam.

A tarefa direta da PR #42 também não tinha corte de spec. Contra a recomendação da auditoria pós-PR #41, entregou
os cinco itens do critério de pronto e mais três coisas: o token `--warning` no `globals.css`, que a recomendação
previa só "se preciso"; o `forcedTheme` respeitado pelo provider, acrescentado pelo `/review`; e três casos Vitest
do `/test`. O plano reescreveu a letra do critério 1 ("cada semente igual ao hex do tema", em vez de "nenhum token
derivado `#000000`"), porque o `colorPrimaryActive` do claro sai `#000000` como derivação legítima de `#171717`.
Os tokens `Menu.dangerItem*` ficaram fora, como a recomendação previa. Nenhum desvio piora o que ela pedia.

A tarefa direta da PR #41 também não tinha corte de spec. Contra a recomendação da auditoria pós-PR #40, entregou
os cinco itens do critério de pronto e mais duas coisas: a `NotFoundPage` da app passou a usar o `getDictionary()`
em vez de uma cópia local da leitura do cookie, e o `/review` acrescentou o `DocumentLangSync` depois que o `/test`
mediu o `<html lang>` parado na troca suave de idioma (O2). A recomendação previa os dois layouts raiz no
`contends_on`; o da web ficou intacto, porque ele já fica abaixo de `[locale]`. A contagem de "27 chamadores" da
recomendação estava inflada: 27 arquivos importam o módulo do servidor, e 19 chamam `getDictionary()` hoje (16
na web, 3 na app, com a `NotFoundPage`); os outros usam `getTranslations` com o idioma dos `params`. Nenhum desvio
piora o que a recomendação pedia.

A tarefa direta da PR #40 também não tinha corte de spec. Contra a recomendação da auditoria de 2026-10-04,
entregou o Enter em "Excluir" e, no mesmo arquivo, o `aria-haspopup` e o `aria-expanded` do gatilho, que era outro
achado. O `/review` acrescentou o `return onDelete?.()`, para o `onDelete` assíncrono manter o "Sim" carregando, e
trocou o `placement` da confirmação para `bottom` depois que o `/test` a mediu saindo da tela a 390 px. O plano
previa e o `/test` mediu o gatilho com área de clique menor. Nenhum dos desvios piora o que a recomendação pedia.

A tarefa direta da PR #37 não tinha corte de spec. Contra a recomendação da auditoria de 2026-10-03, entregou as três
operações e a UI, e acrescentou duas coisas: o `DELETE` recusa também um segundo perfil que aponte para o mesmo
uid de quem chama (decisão D2 do plano da tarefa, fixada em teste), e o `HookFormSelect` ganhou a prop
`description`.

**Deriva de pipeline da PR #47:** 18 commits na branch, um por assunto, juntados num só pelo squash. A branch
`feat/pricing-page-catalog` foi criada a partir de `guilhermebittelbrunn/spec-discussion` e não segue
`<project>/<type>/<title>`, porque o diff cruza três apps e quatro pacotes (E11); ficou viva no remoto depois do merge
(pendência 16). O `STATE.md` registrou `review: done` e `test: done` antes do merge, com o nome certo da branch. Dois
desvios de processo registrados pela própria feature: o dicionário da landing e a página nova ficaram em commits
separados, aceitando um commit vermelho no meio (D3 do `review/review.md`), e o formatador de preço foi movido com
`mv`, então o histórico da branch registra adição e remoção em commits diferentes. O `/review` corrigiu uma regressão
de layout que o `/test` encontrou (cards da `/pricing` colados na borda) e um open redirect que já existia em `main`.

**Deriva de pipeline da PR #46:** 12 commits na branch, um por assunto, juntados num só pelo squash. Duas tarefas
diretas no mesmo PR, sem arquivo de código compartilhado entre elas. A branch
`guilhermebittelbrunn/cycle-2-features-implement` não segue `<project>/<type>/<title>`; o `/review` recomendou
renomear e a renomeação não aconteceu (E11). Ela ficou viva no remoto depois do merge (pendência 16). Os dois
`STATE.md` registram `review: in-progress`. Os dois `test/report.md` foram gravados pelo orquestrador do `/cycle` com o
texto do `analista-qa`, porque a harness bloqueou a escrita do subagent; o próprio relatório registra isso.

**Deriva de pipeline da PR #45:** 16 commits na branch, um por assunto, juntados num só pelo squash. Três tarefas
diretas no mesmo PR, sem arquivo de código compartilhado entre elas. A branch `fix/date-pickers-form-fields-and-header`
não segue `<project>/<type>/<title>`, porque o diff cruza quatro workspaces (E11), e ficou viva no remoto depois do
merge (pendência 16). Os três `STATE.md` registraram `review: done` antes do merge.

**Deriva de pipeline da PR #44:** seis commits na branch, um por assunto (a auditoria pós-PR #43, a âncora do
`PRE-PRODUCTION.md`, a i18n, o design system, a web e os artefatos), juntados num só pelo squash. A branch
`fix/date-input-locale` não segue `<project>/<type>/<title>`, porque o diff cruza três workspaces (E11), e ficou viva
no remoto depois do merge (pendência 16). O `STATE.md` registrou cinco commits propostos; o sexto, da âncora, entrou
como commit `docs` separado, como a `cycle-policy` §6 pede.

**Deriva de pipeline da PR #43:** onze commits na branch, um por assunto (i18n primeiro, para cada commit ficar
verde), juntados num só pelo squash. Duas tarefas diretas no mesmo PR, porque as duas mexiam no
`AccountPrivacyPanel.tsx` e no teste dele. A branch `fix/ui-labels-and-account-dialog-focus` não segue
`<project>/<type>/<title>`, porque o diff cruza quatro workspaces (E11), e ficou viva no remoto depois do merge
(pendência 16).

**Deriva de pipeline da PR #42:** três commits na branch, um por assunto, juntados num só pelo squash; a branch
`design-system/fix/antd-theme-seed-colors` segue o padrão e ficou viva no remoto depois do merge (pendência 16).

**Deriva de pipeline da PR #41:** nove commits na branch, um por assunto, juntados num só pelo squash; a branch
`fix/server-locale-from-url` ficou viva no remoto depois do merge (pendência 16) e não segue
`<project>/<type>/<title>` (E11).

**Deriva de pipeline da PR #40:** a PR saiu com três commits na branch (a correção, a auditoria do backlog e os
artefatos), como a regra de granularidade pede, e o squash do merge juntou os três num só em `main`. A separação
por assunto vale na branch e no PR, não no histórico da `main`. A branch `design-system/fix/action-menu-keyboard-delete`
segue o padrão e ficou viva no remoto depois do merge (pendência 16).

**Deriva de pipeline das PRs #37 a #39:** as duas features com spec rodaram em paralelo, embora a fatia 2 pertencesse a uma spec
`in-progress`, que o algoritmo de lotes exclui (ver [Lotes paralelos](#lotes-paralelos)). As três branches ficaram
vivas no remoto depois do merge (pendência 16) e nenhuma segue `<project>/<type>/<title>` (E11).

### Âncoras relidas

**Em 2026-10-16, pós-PR #47:** seis specs vivas citavam arquivo alterado pela PR #47, e as âncoras foram corrigidas
nelas, com o número antigo entre parênteses: `contact-support-channel` (`pricing/page.tsx:176` → `:73-76` e o card
novo; `apps/api/proxy.ts:45-58` → `:49-62`), `magic-link-sign-in` e `social-sign-in-providers` (a mesma lista de rate
limit; em `social-sign-in-providers`, o botão do Google em `SignInForm.tsx:181-191` → `:187-197`),
`observability-logging` (`apps/api/proxy.ts:70`, `:125`, `:164`, `:78-79` → `:74`, `:129`, `:168`, `:82-83`, e a
contagem de `logEvent(` de 37 para 39), `account-security-mfa` (`SignUpFormClient.tsx:114` → `:121`) e
`one-time-purchase` (`docs/PAYMENTS.md:165-166` → `:199-200`, `docs/PRE-PRODUCTION.md:513-516` → `:517-520`, e o
link para a spec arquivada). A nota [`saas-starter-feature-benchmark`](research/saas-starter-feature-benchmark.md)
ganhou uma linha datada: a linha do next-forge descreve a página herdada, que a PR #47 substituiu. Neste arquivo, as
âncoras de `apps/app/proxy.ts`, `apps/api/proxy.ts`, `SignUpFormClient.tsx`, `docs/PAYMENTS.md`,
`docs/PRE-PRODUCTION.md`, `docs/FORKING.md` e `apps/api/.env.example` foram remedidas linha a linha contra
`git show c8577b7:<arquivo>`.

**Em 2026-10-16, pós-PR #46:** duas specs vivas citavam arquivo alterado pela PR #46, e as âncoras foram corrigidas
nelas: `observability-logging` (as falhas do webhook, de `:272` e `:284` para `:279` e `:291`) e `account-security-mfa`
(`auth.schema.ts`, de `:23`, `:28` e `:82-83` para `:24`, `:29` e `:89-90`; a folha de `apiErrors`, de `:45`, `:85`,
`:217` e `:349` para `:46`, `:88`, `:223` e `:359`). As citações de `webhooks/payments/route.ts:194-232` em
`in-app-notifications` e `one-time-purchase` foram escritas depois do merge e conferem. Nenhuma nota de `research/`
cita arquivo da PR (`grep` pelos sete arquivos de código: 0). Neste arquivo, as âncoras dos achados abertos em arquivos
da PR foram remedidas: o header da web (a marca longa, `:236`, `:39`, `:231-233`), o `skipValidation`
(`apps/web/env.ts:36`) e a resposta de sucesso do webhook (`:298`). Uma âncora de spec ficou para trás sem relação
com a PR: `one-time-purchase` citava `docs/PRE-PRODUCTION.md:510-514` e `checkout/route.ts:38-46`, hoje `:513-516` e
`:39-46`.

**Em 2026-10-14, pós-PR #45:** nenhuma spec viva nem nota de `research/` cita arquivo alterado pela PR #45 (`grep`
por `header`, `button.tsx`, `date-input`, `radio-group`, `hookformInput`, `Footer.tsx` e `contact-form` nos três
arquivos de spec e nas quatro notas de `research/`: só menções a header HTTP, sem relação). Neste arquivo, as linhas
abertas que citavam arquivo da PR com a marca "no working tree" passaram a valer para `main` sem mudar de número
(`button.tsx:72`, `hookformInputPassword.tsx:66-72`, `useSubmitEnterGuard.ts`); as dos achados fechados saíram com
eles. O `aria-describedby` do `DateInput` de `accessibility-conformance` desceu de `date-input.tsx:72` para `:76`, com
as props novas do seletor de mês.

**Em 2026-10-14, pós-PR #44:** nenhuma spec viva nem nota de `research/` cita arquivo alterado pela PR #44 (`grep`
por `date-input`, `calendar.tsx`, `calendar-locales`, `contact-form-client` e `components/index.ts` nos três arquivos
de spec e nas quatro notas de `research/`: 0). Neste arquivo, a única linha aberta que citava arquivo deslocado pela
PR é a do `<Label htmlFor="date">` do formulário de contato: `contact-form-client.tsx:72` → `:73`, com o import novo
do `calendarLocales`. As duas linhas do `DateInput` e do `Calendar` em inglês saíram com os achados fechados, e as
âncoras da recomendação anterior (`date-input.tsx:51`, `:86`, `:93`, `calendar.tsx:188-189`, `:193`) saíram com ela.
`date-input.tsx:72` segue com o `aria-describedby` de `accessibility-conformance`.

**Em 2026-10-13, pós-PR #43:** nenhuma spec viva nem nota de `research/` cita arquivo alterado pela PR #43 (`grep`
pelos 14 componentes, pelos testes alterados e por `translations/components` nos três arquivos de spec e nas notas
de `research/`: 0; a única menção ao design system é `input-otp.tsx`, que a PR não tocou). Neste arquivo foram
relidas e corrigidas as âncoras de arquivos que a PR deslocou: `antd-app.tsx` (seis linhas de import no topo e mais
oito do `antdLocales` e do `useDictionary()`: tokens `Menu.dangerItem*` `:91-95` → `:97-101`, `colorError` `:130` →
`:136`, primário `:127` → `:133`, aliases `:51` → `:57`); `AccountEmailChangeDialog.tsx` (o `onOpenAutoFocus` citado
na recomendação anterior em `:115-117` está hoje em `:121`, e o campo de senha em `:147-152`);
`sharedFooterPendingState.test.tsx` (`:35-37` → `:38-40`). As linhas que citavam o `AccountPrivacyPanel.tsx:137` e os
arquivos das strings soltas saíram com os achados fechados. `AccountPrivacyPanel.tsx:29` e `:40-48`
(`requiresPrivacyChannel`) e `AccountEmailChangeDialog.tsx:29` e `:36-46` (`lacksPasswordProvider`) não mudaram.

**Em 2026-10-07, pós-PR #42:** nenhuma spec viva nem nota de `research/` cita `antd-app.tsx`, `globals.css` ou
`actionMenu.test.tsx` (`grep`: só `input-otp.tsx` em `account-security-mfa`, que a PR #42 não tocou). Neste
arquivo foram relidas e corrigidas as âncoras de arquivos que a PR deslocou: `antd-app.tsx` (tokens
`Menu.dangerItem*` `:66-70` → `:91-95`) e `actionMenu.test.tsx` (`:103` → `:107`, `:300` → `:304`, `:345` → `:349`,
`:380` → `:384`, `:400` → `:404`, `:415` → `:419`, com as três linhas do import novo). O `--destructive` do claro
segue em `globals.css:24`; o token novo entrou depois dele.

**Em 2026-10-07, pós-PR #41:** nenhuma spec viva cita arquivo alterado pela PR #41 (`grep` por `proxy.ts`,
`layout.tsx`, `internationalization/server`, `NotFoundPage`, `pricing/page` e pelos documentos alterados nos três
arquivos de spec e nas notas de `research/`: só `apps/api/proxy.ts`, que não mudou, e a menção a
`docs/ARCHITECTURE.md` de `teams-organizations`, que continua verdadeira, porque a linha alterada fala de
idioma). Neste arquivo, as âncoras dos achados abertos em arquivos que a PR #41 deslocou foram relidas e
corrigidas: `apps/app/proxy.ts` (deep link do onboarding `:244` → `:263`, redirecionamento ao sign-in `:211` →
`:230`, bounce `:214-232` → `:233-251`, `:229` → `:248` e `:216-217` → `:235-236`, cookie `:195,199` →
`:214,218`); `apps/web/proxy.ts` (matcher `:57` → `:61`, guarda do `ARCJET_KEY` `:63` → `:67`, `secure()` `:68` →
`:72`); `apps/app/app/layout.tsx` (`:48`, `:73` → `:49`, `:74`).

**Em 2026-10-07, pós-PR #40:** nenhuma das três specs vivas cita `action-menu.tsx` nem `actionMenu.test.tsx`
(`grep` nos quatro arquivos de spec e nas notas de `research/`: 0), então nenhuma âncora de spec mudou. Neste
arquivo, as âncoras dos dois achados fechados saíram com eles, e a da lacuna de teste da cor do item `danger`
foi corrigida de `actionMenu.test.tsx:95` para `:103`.

**Em 2026-10-04:** as PRs #37 a #39 alteraram arquivos citados pelas três specs vivas. Cada âncora em arquivo
alterado foi relida no `d92d21b` e corrigida na spec, com a data:

| spec | o que mudou |
|------|-------------|
| `account-security-mfa` | `server.ts` (revogação, checagem do bearer, cookie, `checkRevoked` agora em duas linhas de comentário), `session-routes.ts` (logout local, `sessionPOST`, renovação), `action.ts`, `AccountSecurityForm.tsx`, os códigos de senha no dicionário e `users/[id]/route.ts:151-153`; o primeiro bullet de "O que já existe" foi reescrito porque o logout deixou de ser global |
| `observability-logging` | contagem de `logEvent(` fora de testes de 33 para **37** (uma do webhook de recursos, três do rastreio de sessões); falhas do webhook em `:272` e `:284`; `account-export.ts:120`, `account-erasure.ts:165` e `:37-40`; as sete chamadas de `console` de `packages/auth/server.ts`. Nenhuma das PRs acrescentou `console` cru |
| `teams-organizations` | `user.ts:5`, `:64`, `:66`; `account/route.ts:49`, `:162`; `entities/route.ts:28`, `:73`, `:81`; nota sobre os três filtros por `uid` da coleção `session`, que não contam como posse por grupo |

### O que a auditoria **não** encontrou

Nenhuma spec `done` perdeu código. A PR #47 mexeu em peças de quatro specs arquivadas, e as quatro seguem inteiras:
`onboarding-flow` (o portão continua lendo o `x-app-path`, `apps/app/lib/server/onboarding.ts:39`, agora com a query,
e `onboardingRedirect.test.ts` e `onboardingState.test.ts` ganharam casos), `billing-subscription` (a aba lista o
catálogo e abre o checkout como antes; o selo é aditivo e `accountBillingPanel.test.tsx` passa), `admin-billing-insights`
(só o import do formatador mudou, em `BillingRevenueCard.tsx` e `billingInsights.ts`) e `auth-recovery-verification`
(os formulários de login e cadastro ganharam a prop opcional `redirect`; os testes que os renderizam sem ela
passam). A suíte inteira (3010 testes) e o job `e2e` da execução de merge passaram. `git grep` por `multiFactor`,
`TOTP`, `passkey`, `organizationId`, `membership` e pelos SDKs de coletor (`@sentry`, `@logtail`, `@axiomhq`,
`betterstack`) em `apps/` e `packages/`, em 2026-10-16 pós-PR #47: 0. `logEvent(` fora de testes: 39. O
`input-otp.tsx` segue sem uso fora do barril e do `playground`. Os 36 arquivos de `contends_on` das nove specs existem
no disco.

**Registro da rodada pós-PR #46.** A PR #46 mexeu no webhook de pagamentos, que `billing-subscription`,
`admin-billing-insights` e `plan-entitlements` usam, e as três seguem inteiras: o diff da rota só toca as respostas de
erro e o comentário (do `:236` em diante); o `dispatch`, a idempotência e a marcação do evento (`route.ts:194-233`,
`:283-289`) ficaram como estavam, e a suíte da `api` (1222 testes) e o job `e2e` da execução de merge passaram. Também
mexeu no header da web, que `brand-config` e `accessibility-conformance` usam: a marca segue vindo de `getBrand()`
(`header/index.tsx:56`, `:231-233`), e o `/test` passou o axe no header em 12 rodadas. As duas features novas gravam
`spec: none (tarefa direta)`, como deveriam. `git grep` por `multiFactor`, `TOTP`, `passkey`, `organizationId`,
`membership` e pelos SDKs de coletor (`@sentry`, `@logtail`, `@axiomhq`, `betterstack`) em `apps/` e `packages/`, em
2026-10-16 pós-PR #46: 0. `logEvent(` fora de testes segue em 37. O `input-otp.tsx` segue sem uso fora do barril e do
`playground`. Os 43 arquivos de `contends_on` das dez specs existem no disco.

**Registro das rodadas anteriores.** A PR #45 mexeu no `Button`, no `DateInput`, nos campos `HookForm*` de texto e
senha e no `RadioGroupInput`, que `accessibility-conformance`, `audit-log` e `data-rights-lgpd` usam, e as três seguem
inteiras: o botão do `DateInput` mantém `aria-invalid` e `aria-describedby` (`date-input.tsx:76-77`), os filtros da
trilha ganharam teste com o `DateInput` real (`auditFiltersDateInput.test.tsx`), os casos antigos de
`accountPrivacyPanel.test.tsx` seguem verdes nesta auditoria, e o job `e2e` da execução de merge, com o axe e a
allowlist vazia, passou. Nenhuma feature nova deveria ter `spec:` e não tem: as três gravam `spec: none`. A PR #44 mexeu no `DateInput`, que duas specs arquivadas usam, e as duas seguem
inteiras: `accessibility-conformance` (o botão do `DateInput` mantém `aria-invalid` e `aria-describedby`,
`date-input.tsx:72-73`, e o job `e2e` da execução de merge, com o axe, passou) e `audit-log` (os filtros de período
passam o `placeholder` do chamador e gravam `yyyy-MM-dd`; o `/test` disparou `GET /audit-events` com `from` e `to`
e recebeu 200). A PR #43 tinha mexido em peças de três specs arquivadas, e as três seguiam inteiras:
`data-rights-lgpd` (a exclusão de conta pede a senha, recusa campo vazio e bloqueia a personificação, com os dez
casos antigos de `accountPrivacyPanel.test.tsx` verdes), `account-email-change` (o diálogo segue com
`onOpenAutoFocus` e `onCloseAutoFocus`, `AccountEmailChangeDialog.tsx:91-101`, `:120-121`, e os casos de foco do
teste dele verdes) e `accessibility-conformance` (o job `e2e` da execução de merge, com o axe, passou; os nomes
acessíveis só trocaram de texto fixo para o dicionário). Nenhuma feature em `docs/features/*/STATE.md` deveria ter
`spec:` e não tem: `date-input-locale` é tarefa direta e grava `spec: none`. Nenhuma entrega parcial órfã além da
fatia 3 de `account-security-mfa`, que é a E12. `git grep` por `multiFactor`, `TOTP`, `passkey`, `organizationId`,
`membership` e pelos SDKs de coletor (`@sentry`, `@logtail`, `@axiomhq`, `betterstack`) em `apps/` e `packages/`, em
2026-10-14 pós-PR #45: 0 (as únicas ocorrências sem distinguir maiúsculas são `InputOTP*`, do `input-otp.tsx`).
`logEvent(` fora de testes segue em 37, como `observability-logging` registra. O `input-otp.tsx` segue sem uso fora
do barril e do `playground`. Os dez arquivos de `contends_on` das três specs existem no disco.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-10-16 (pós-PR #47).** A auditoria pós-PR #46 fechou com 115 linhas abertas. A PR #47 alterou
> 51 arquivos fora de `docs/features` e `specs` (`git diff --stat c8577b7 dd31a95`); toda linha que cita um deles foi
> relida em `main`, com a âncora comparada contra `git show c8577b7:<arquivo>`. As demais seguem iguais, porque o
> arquivo citado é o mesmo byte a byte (nenhum arquivo de `packages/design-system`, `packages/email`,
> `packages/security`, `turbo.json`, `firestore.rules` ou `.github/workflows` mudou). **Placar: 2 fechados (o deep
> link do onboarding sem a query e o bounce do proxy que escrevia a query dentro do caminho) · 6 novos (em
> [Achados da PR #47](#-achados-da-pr-47-2026-10-16)) · 4 ampliados (as rotas de `payments/` fora do rate limit, a
> superfície sem guard, que passou a 14 de 37, o `packages/shared` sem `typecheck` e o link morto do plano de
> `plan-entitlements`, que ganhou o de `pricing-page-catalog`) · 119 abertos, pela soma.** A PR também fechou um open
> redirect real em `main`, que não tinha linha aqui; ele entra na lista de fechados para ficar registrado. A tabela de
> fechados da PR #46 ficou na versão deste arquivo em `dd31a95`; a da PR #45, na versão em `c8577b7`; a da PR #44, na
> versão em `eb47e80`; a da PR #43, na versão em `fa7041b`; a da PR #42, na versão em `7fb2fe9`; a da PR #41, na
> versão em `dbcac2a`; a da PR #40, na versão em `0a49a3b`; a de 2026-10-04, na versão em `5f4a8e9`; as de
> 2026-09-26 a 2026-10-03, na versão em `02c31b5`.

### ✅ Fechado na auditoria de 2026-10-16 (PR #47)

Todas as linhas abaixo foram relidas em `main` (`dd31a95`).

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| 🟡 **O deep link do onboarding perdia a query string** | `apps/app/proxy.ts:263` (`x-app-path` só com o `pathname`) e `:230` (o `redirect` do login também), no `c8577b7` | o proxy grava `pathname` e query no header (`apps/app/proxy.ts:280`), que o portão lê (`apps/app/lib/server/onboarding.ts:39`), e no `redirect` do login (`:246-247`, que antes limpa a query da página). Casos novos em `proxy.test.ts`, `onboardingRedirect.test.ts` e `onboardingState.test.ts`. Fecha também a deriva do item 3 de `onboarding-flow` |
| 🟡 **O bounce do proxy escrevia o destino com query dentro do caminho** | `apps/app/proxy.ts:247-249` (`search = ""` e `pathname = target`), no `c8577b7` | `pointAt` (`apps/app/proxy.ts:161-165`) separa caminho e query do destino e mantém o host da requisição; chamado em `:265`. O `/test` mediu o destino `/pt-br/account?tab=billing&plan=…` chegando inteiro, em `next dev` e `next start` |
| 🟡 **Open redirect no guard de `redirect`** (sem linha prévia neste arquivo) | `packages/auth/redirect.ts`, no `c8577b7`: um destino com `..` e barra invertida passava pelas checagens e virava `//evil.example.com` depois de resolvido | o guard confere também o caminho resolvido pelo parser de URL (`packages/auth/redirect.ts:40-43`). Achado pelo `/review` da PR #47; o `/test` mediu `Location: //evil.example.com` no código anterior e `/pt-br` no novo, com mutação contra o guard antigo em `postAuthRedirectTarget.test.ts` e `proxy.test.ts` |

### ⚠️ Achados abertos, reconferidos ou herdados

Reconferidos em 2026-10-04, pós-PR #39, de novo em 2026-10-07, pós-PR #40, pós-PR #41 e pós-PR #42, em 2026-10-13, pós-PR #43, em 2026-10-14, pós-PR #44 e pós-PR #45, e em 2026-10-16, pós-PR #46 e pós-PR #47, nas linhas de maior severidade (ver o placar acima). A PR #47 fechou o deep link do onboarding, que estava nesta tabela, e mexeu em `apps/api/proxy.ts`, cuja âncora foi remedida na linha das rotas de `payments/`.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| 🟡 **As rotas de `payments/` que chamam a Stripe estão fora do rate limit** (ampliado em 2026-10-16, pós-PR #47) | `apps/api/proxy.ts:49-62` (era `:45-58` até a PR #47) | Cada chamada vai à Stripe: o catálogo da aba (`/payments/plans`) lista preços, o checkout cria cliente (com chave de idempotência) e sessão, o portal cria sessão. As três exigem sessão, então o abuso depende de conta válida, mas um cliente em loop consome a cota de API da Stripe do fork. **Ampliado:** a PR #47 acrescentou `GET /payments/catalog`, pública e também fora da lista, de propósito (`apps/api/proxy.ts:43-45`); ela responde do cache de uma hora e não alcança a Stripe a cada chamada, então não herda o problema, mas pode ser martelada ao custo de invocações de função. O `docs/SECURITY.md:155` passou a citar a rota nova e segue sem citar checkout, portal e `plans` |
| 🟡 **`findByStripeCustomerId` devolve o documento cru, sem mapper** (ampliado em 2026-10-04) | `apps/api/(shared)/repositories/user.repository.ts:71-82` | `{ ...(live.data() as UserDTO), id }` entrega `Timestamp` onde o tipo promete `Date`. Hoje o webhook só lê `id` e `stripeCustomerId`, então não quebra nada. A PR #38 deu ao método um segundo chamador, `reconcileEntitlements` (`webhooks/payments/route.ts:156`), que também só lê o `id`. Com o A2 fechado, o perfil arquivado já não tem assinatura viva quando o webhook deixa de achá-lo; quebra no primeiro chamador que ler uma data. Contraria a regra de ouro 5 (normalizar no mapper) |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:26-27` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **Lacunas de teste do arquivamento pelo admin** (nova, PR #28) | `apps/api/app/(routes)/users/[id]/route.ts:192-204` · `apps/api/__tests__/usersAdminDeleteBilling.test.ts` | Não há teste para o cancelamento que passa seguido do soft delete que falha (Firestore fora) nem para o duplo clique no "Sim" do diálogo. O `/review` da PR descreveu por leitura o primeiro caso como recuperável: a assinatura já cancelada conta como cancelada na tentativa seguinte (`(shared)/lib/billing.ts:164`, âncora remedida em 2026-10-04) |

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
| 🟡 **Reenviar o cadastro depois de conta criada e login falho responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`** | `apps/app/.../sign-up/components/SignUpFormClient.tsx:119-126` (era `:112-119` até a PR #47) · `apps/web/.../sign-up/components/sign-up-form-client.tsx:34-40` | A criação e o login são duas chamadas. Se a primeira passa e a segunda falha (rede, 429, cookie de sessão), a pessoa reenvia, recebe "e-mail já cadastrado" e precisa ir ao login por conta própria. O `/review` deixou como está porque a correção muda o fluxo; a alternativa registrada é tentar o `signIn` quando o reenvio receber esse código logo depois de um 201 na mesma tela |
| 🟡 **`create-dev-admin.mjs` não aplica a política de senha** | `apps/api/scripts/create-dev-admin.mjs:36-46` | O script cria administrador com qualquer senha que o Firebase aceite (6 ou mais). Fora da fatia por decisão do plano (P4): o script roda em Node puro e repetir a constante criaria a 12ª cópia. Afeta só quem opera o fork |
| 🟡 **Sem `ARCJET_KEY`, nada limita a criação de contas em massa** | `apps/api/proxy.ts:51` (`/auth/sign-up` na lista) · `docs/PRE-PRODUCTION.md:602-604` · `docs/SECURITY.md:166` (âncoras remedidas em 2026-10-04; a do `SECURITY.md`, de novo em 2026-10-16, depois da PR #46; a do proxy e a do `PRE-PRODUCTION.md`, depois da PR #47, que as deslocou de `:47` e `:595-597`) | A rota cria a conta pelo Admin SDK, que não passa pelo limite do Firebase de 100 contas por hora por IP. A rota está na lista de rate limit, mas o limite é no-op sem a chave. Está escrito nos dois documentos; o critério 19 do `/test` ficou 🔒 |

### Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** | `apps/api/instrumentation.ts:63-67` | Reconferido em 2026-10-03, em `main`: `throw` em `:63-67`, zero `process.exit`. `/health/ready` detecta parte das falhas, não esta. Nenhum 🔴 de código segue aberto nesta seção desde a PR #36 |
| ⚠️ **Sete das dez rotas de `/account` seguem fora do rate limit**, entre elas a troca de senha (ampliado em 2026-10-04) | `apps/api/proxy.ts:49-62` (era `:45-58` até a PR #47) | Recontado em 2026-10-04: a PR #39 criou três rotas de sessões (`/account/sessions`, `/account/sessions/[id]`, `/account/sessions/revoke-others`), todas fora; as três só leem e gravam no Firestore, sem provedor externo. Ficam fora também o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding`. O `docs/SECURITY.md:157` já traz a conta nova (âncora remedida em 2026-10-16; era `:154`). A PR #25 acrescentou `POST /payments/checkout` e `POST /payments/portal`, também fora; cada checkout pode criar uma sessão na Stripe |
| ⚠️ **Superfície não-guardada da API: 14 de 37** arquivos de rota exportam handler nu, 10 deles `/auth/*` (ampliado em 2026-10-16, pós-PR #47) | `apps/api/app/(routes)/auth/**` · `apps/api/app/(routes)/payments/catalog/route.ts` | Recontado em 2026-10-16, pós-PR #47: 37 arquivos, 23 com guard. A PR #47 acrescentou `payments/catalog`, nua de propósito: a landing a lê para quem ainda não tem conta, e ela só devolve o catálogo público. A PR #39 tinha acrescentado `auth/session` (nua: resolve a credencial por conta própria, para que o admin que personifica encerre a sessão dele, e responde `401` com `error.code`) e três rotas de sessões com guard; a PR #38, o guard composto `requirePlanApi`. Os 14 nus: 10 em `/auth/*`, os dois `health`, o webhook de pagamento e o catálogo. O `docs/SECURITY.md:16-33` ainda diz 36 e 13 (ver Contradições e o achado novo da PR #47) |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:123`, `:127` · `packages/auth/session.ts:78-81` | Reconferido em 2026-10-04. A parte documental está fechada (`docs/SECURITY.md:161`); o comportamento segue. Desde a PR #39 a rota também pergunta à API se a sessão foi encerrada noutro aparelho antes de renovar |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Dependência importada sem ser declarada**: `apps/app/env.ts:1` importa `@repo/email/keys` sem `@repo/email` no `package.json`; `apps/web` importa `@repo/auth` em **8 arquivos** sem declará-lo | `apps/app/package.json` · `apps/web/package.json` | Reconferido, os dois `grep` no `package.json` devolvem 0. Funciona por hoisting; o turbo não invalida `web#*` quando `@repo/auth` muda |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` não existe. **Vigésima segunda auditoria consecutiva** (2026-10-16) |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` do resto | `packages/auth/package.json:24` | Reconferido em 2026-09-27; a âncora subiu uma linha porque a PR #29 tirou o export `./components/sign-up` |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: 0 |
| 🟡 **`input-otp.tsx` é código morto** | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: só ele, o barril, o `package.json` do pacote e o `playground`. `account-security-mfa` (fatia 3, segundo fator) é quem o usaria |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: 0 importadores |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-12` | Reconferido em 2026-09-26, depois da PR #28 mexer no arquivo: falta `"./utils/*"`, e `"."` (`:6`) aponta para `index.ts`, que não existe |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:30` | Reconferido em `main` em 2026-10-03: a PR #36 passou a função a ler a chave por chamada (`readArcjetKey()`), e ela segue sem chamador fora dos testes. As 9 referências estão em `__tests__/rateLimit.test.ts` |
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts:113` (âncora remedida em 2026-09-30 e de novo em 2026-10-16, depois da PR #47) segue sem relação |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:214` | Reconferido em 2026-09-27 (a âncora subiu dez linhas com a saída do `signUp` na PR #29): só `useEmailVerification.test.tsx`, que a mocka |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`** | `packages/shared/package.json:11` (só `test`) | Metade fechada pela PR #32: o `@repo/design-system` ganhou a task de `test` (`packages/design-system/package.json:7`, 45 testes). Falta o `typecheck` do `packages/shared`, adiado desde a primeira auditoria. **Medido em 2026-10-14:** `tsc --noEmit` sobre os 21 arquivos do pacote, com um `tsconfig` temporário fora do repositório, dá 0 erros neles e 2 `TS2580` em `packages/internationalization/utils.ts:22-23` (`process` sem `@types/node`, que o pacote não declara). A correção é o script, um `tsconfig.json` e o `@types/node` que os outros workspaces já usam. P. **Ampliado em 2026-10-16, pós-PR #47:** o pacote passou a guardar o formatador de preço (`formatPlanPrice.ts`), que a landing e a aba de cobrança usam; ele continua checado só pelo `typecheck` da `app` e da `web`, que o importam |
| 🟡 **`welcomeEmail` sem chamador de produção**; o formulário de contato da landing segue maquete | `packages/email/templates/welcome.tsx:50` | Reconferido: 4 ocorrências, 3 em teste. O canal de privacidade da `apps/web` cai nesse formulário quando `NEXT_PUBLIC_PRIVACY_CONTACT` está vazia (`privacyContact.ts:17-18`), então o fallback do canal aponta para uma maquete |
| 🟡 **`useListAuditEvents.test.tsx` deixa trabalho do React pendente depois do teardown** (novo, 2026-09-28) | `apps/app/__tests__/useListAuditEvents.test.tsx:55-70` (um `QueryClient` por teste, sem `clear()` nem `unmount` ao fim) | A suíte da `apps/app` falhou em 2 de 6 execuções locais em 2026-09-28 com `ReferenceError: window is not defined`, que o Vitest atribui a este arquivo: os testes passam e o erro não tratado reprova a task. Na auditoria pós-PR #31 passou nas 6 execuções (688 testes cada) na pós-PR #32 também (6 de 6, 702 testes cada) e na pós-PR #33 também (6 de 6, 756 testes cada), então o acumulado era 2 falhas em 24; com as execuções das rodadas pós-PR #34, #35, #36, #39, #40, #41, #42, #43, #44 (três, 841 testes cada), #45 e #46 (uma cada, 846 testes) e #47 (uma, 861 testes), nenhuma com falha, é 2 em 47. O arquivo não muda desde a PR #18. O CI passou nas execuções de merge das PRs #29 a #47. Correção provável, não testada: limpar o `QueryClient` e desmontar o hook no `afterEach`. Tarefa direta P |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:171` | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:181`). N+1 do Admin SDK. Décima primeira rodada aberto; âncoras desceram com os métodos de recursos da PR #38 (remedidas em 2026-10-04) |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:155` · `:167` · `:171` · `:190` · `:208` | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`skipValidation` incondicional na `apps/web`, e por causa dele o bloqueio de bot da landing nunca roda** (ampliado em 2026-09-30) | `apps/web/env.ts:36` (âncora remedida em 2026-10-16; a PR #46 a deslocou de `:33`) · `apps/web/proxy.ts:67` (`if (!env.ARCJET_KEY) return;`) · `:72` (`secure()`), âncoras remedidas em 2026-10-07 pós-PR #41 | Com `skipValidation: true`, o `createEnv` do `@t3-oss/env-core@0.13.8` devolve só o `runtimeEnv` do próprio módulo e descarta o que veio de `extends` (`if (skip) return runtimeEnv;`, antes do merge). Como o `runtimeEnv` da web não declara `ARCJET_KEY`, `env.ARCJET_KEY` sai sempre `undefined`, mesmo com chave válida, e o `secure()` é pulado. Medido pelo `/test` de `arcjet-key-lazy-validation` com um probe de import: `ajkey_ok` dá `"ajkey_ok"` no `env.ts` da `apps/app` e `undefined` no da `apps/web`. A metade do `NEXT_PUBLIC_APP_URL` fechou com a PR #25, e a do `NEXT_PUBLIC_DOCS_URL`, com a PR #46, as duas declarando a variável no próprio `env.ts`. **§5.1:** o `skipValidation` já tinha voltado intacto em várias rodadas como "recomendação"; ele fica aqui como dívida técnica com `arquivo:linha`, e a parte que exige julgamento (ligar o bloqueio de bot) sai como a pergunta D8 e não é reapresentada depois. Tirar o `skipValidation` sem decidir a D8 liga o bloqueio por tabela, então as duas coisas andam juntas. P, depois da D8 |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:230,234` (era `:214,218` até a PR #47) · `apps/web/proxy.ts:111,115` | Reconferido em 2026-10-07, pós-PR #41: `cookieStore.set` sem `maxAge` nas duas apps. A PR #41 manteve a gravação do cookie, que agora só serve à rota sem idioma na URL |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Décima rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:51-53` (estado lido uma vez) · `:55-62` (`history.replaceState`) | Reconferido. A barra lateral muda a URL e a aba fica onde estava. Estacionado (E9) |
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
| 🟡 **O `/favicon.ico` da `apps/web` devolve o HTML da home** | `apps/web/app/` (sem ícone na raiz) · `apps/web/proxy.ts:61` (matcher, âncora remedida em 2026-10-07 pós-PR #41) | Resposta 200 com `text/html`; o `/icon.png` responde 307 para `/pt-br/icon.png`. Já existia antes da entrega. **Descrição corrigida em 2026-09-28:** o matcher do proxy já exclui `favicon.ico` (`:61`), então o pedido não passa pelo proxy e cai no segmento `[locale]` com `favicon.ico` no lugar do idioma. Correção provável, não testada: servir o arquivo na raiz de `apps/web/app/`, que hoje não tem root layout |
| 🟢 **Nome de marca com 30 caracteres quebra em duas linhas na barra lateral** | `apps/app/shared/components/ui/Sidebar.tsx` | O critério de 30 caracteres da spec só valia para o header da web. Decidir truncar ou aceitar a quebra |

O atraso de idioma numa navegação (cookie `x-locale` lido no servidor) era o mesmo achado do `getDictionary()` do servidor, fechado pela PR #41.

### 🆕 Achados da rodada de `storage-emulator-rules-tests` (2026-09-28)

Vindos do plano e do `/test` da spec, entregue pela PR #31. Eram dois; o `alt` do avatar do menu de perfil
fechou com a PR #32 e está na lista de fechados. O outro segue aberto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Nada impede um `*_EMULATOR_HOST` em produção** | `packages/auth/emulator.ts:27-32`, `:44` · `apps/app/env.ts:27` · `apps/app/shared/lib/storageEnabled.ts:6` | Nenhuma checagem de boot recusa um host de emulador configurado por engano, e isso vale também para o `FIREBASE_STORAGE_EMULATOR_HOST` e o `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` novos. Se só a variante `NEXT_PUBLIC_` for copiada para a Vercel, o app mostra o seletor de arquivo e põe `http://<host>` no `img-src` da CSP; o upload falha com `error.code` e nada vaza. É o risco R-5 do plano da spec, deixado fora do corte |

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

Vindos do §12.2 do plano, do handoff, do `/review` e do `/test` da spec, entregue pela PR #32 e arquivada em
2026-09-29. Todos são anteriores ao diff ou ficaram fora do corte por decisão registrada; nenhum bloqueou a entrega.
Reconferidos no código em 2026-09-29. Os dois do `ActionsMenu` (Enter em "Excluir" e o gatilho sem
`aria-haspopup`) fecharam com a PR #40; a lista de fechados daquela rodada está na versão deste arquivo em `0a49a3b`.
O dos seed tokens do antd fechou com a PR #42. O grupo de rádio sem nome, o menu mobile da web sem nome, o `Button` que
encolhia, o `disabled` antes do spread, o `placeholder` ignorado e o rótulo da data da `/contact` fecharam com a PR #45
e estão na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`--destructive` do claro abaixo de 4,5:1 sobre `--accent` e `--muted`** | `packages/design-system/styles/globals.css:24` | 4,38:1 no "Excluir" com foco de teclado (fundo `--accent`, medido pelo `/test`) e 4,37:1 como texto de erro dentro de card `muted` (calculado no plano). Não aparece nas rotas que a suíte cobre. **Remedido pelo `/test` da PR #42** (O1): no foco por seta, o item "Excluir" fica `#e7000b` sobre `#f5f5f5`, 4,38:1, igual no código anterior; a PR #42 não mudou o `--destructive` |
| 🟡 **Os tokens `Menu.dangerItem*` não alcançam o `Dropdown`** | `packages/design-system/providers/antd-app.tsx:97-101` (âncora remedida em 2026-10-13, pós-PR #43; era `:91-95` e, antes da PR #42, `:66-70`) | Configuração que não tem efeito onde o `danger` aparece no repo. Reconferido depois da PR #43: o item `danger` é pintado pelo `colorError` global, em hex (`:136`), e os testes esperam esse hex (`actionMenu.test.tsx:101-104`), não os tokens do `Menu`. A PR #42 não os resolveu, como a recomendação previa |
| 🟡 **`<title>` igual em todas as páginas de cada área do painel** | `(common)/layout.tsx:23-30` · `(admin)/admin/layout.tsx:22-29` | Satisfaz o axe, mas o WCAG 2.4.2 pede título que descreva a página. Os rótulos por rota já existem em `common/routes` e `admin/routes`. Quatro das onze páginas são `"use client"` e precisariam de `layout.tsx` de segmento |
| 🟡 **A página 404 da `apps/app` sai com `document.title` vazio** | `apps/app/app/not-found.tsx:3-5` | Fica fora dos layouts do painel, que são os que ganharam `generateMetadata` |
| 🟡 **A dica do `TextareaInput` não entra no `aria-describedby`** | `packages/design-system/components/ui/textarea-input.tsx:42-43` | O `<p>` do `hint` não tem id |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-29 | motivo |
|--------|---------------------|--------|
| `Select` mobile do navbar sem asserção de nome | **fechada** pelo `/test` | cenário novo em `panelNavbarControls.test.tsx` |
| `generateMetadata` dos layouts sem teste | **fechada** pelo `/test` | `panelLayoutTitle.test.ts`, 8 casos |
| `NotFoundPage` sem teste de componente | **fechada** pelo `/test` | `notFoundPageHomeLink.test.tsx` |
| Cor dos filhos do item `danger` sem teste | **fechada** pelo `/review` | caso novo em `actionMenu.test.tsx:107` (âncora remedida em 2026-10-07, pós-PR #42; era `:95` antes da PR #40 e `:103` antes da PR #42), que duas mutações derrubam |
| Links da web (hero, CTA, FAQ, preços) sem teste de componente | **continua aberta**, risco baixo | a regra `nested-interactive` do axe na suíte E2E barra a regressão nas rotas cobertas |
| Botão de checkout em carregamento | **fora de escopo** | exige chave de teste da Stripe (pendência 23) |
| Campo com erro lido por leitor de tela de verdade | **continua aberto** | o `/test` conferiu atributos na árvore de acessibilidade; nenhum NVDA ou VoiceOver rodou. Não cabe em rodada autônoma |
| Hidratação do contato em `next build && next start` | **fechada** pela PR #45 | o `/test` de `date-input-navigation` mediu zero erros em build, com fusos diferentes no servidor e no navegador |

### 🆕 Achados da entrega `account-email-change` (2026-09-30)

Vindos do `/review`, do handoff e do `/test` da spec, entregue pela PR #33 e arquivada em 2026-09-30. Nenhum
bloqueou a entrega. Reconferidos no código em 2026-09-30. O do foco do diálogo de exclusão de conta fechou com a PR
#43 e está na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`lacksPasswordProvider` duplica `requiresPrivacyChannel`** (ampliado em 2026-10-13) | `AccountEmailChangeDialog.tsx:29`, `:36-46` · `AccountPrivacyPanel.tsx:29`, `:40-48` | A mesma checagem de provedor `password` e a mesma constante `PASSWORD_PROVIDER_ID` em dois arquivos da aba de conta. O plano da feature já previa (§15). **Ampliado pela PR #43:** os dois diálogos agora repetem também o comentário do `onOpenAutoFocus` palavra por palavra (`AccountPrivacyPanel.tsx:78-79`, `AccountEmailChangeDialog.tsx:89-90`) e o `onError` que devolve o foco à senha, com nome num arquivo (`focusPasswordAfterRefusal`, `AccountPrivacyPanel.tsx:85-87`) e inline no outro (`AccountEmailChangeDialog.tsx:111-112`), segundo o `/review` das duas tarefas. Se um terceiro diálogo puser o `Footer` dentro de um `AlertDialogContent`, a `cycle-policy` §3 manda corrigir no componente compartilhado |
| 🟢 **A confirmação da troca mostra o mesmo cartão de erro para qualquer código** | `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx:53-62` | Um `429 AUTH_RATE_LIMITED` diz que o link pode ter expirado, embora o código não tenha sido gasto e recarregar resolva. Espelha o `VerifyEmailResult` por decisão do plano (§5.2) |
| 🟢 **O aviso ao endereço antigo sugere que trocar a senha resolve** | `packages/internationalization/translations/packages/email/index.ts:58`, `:126`, `:193` | "Troque sua senha agora e fale com o suporte": trocar a senha não invalida um link já emitido; quem reverte é o suporte. A frase não mente, mas a ordem engana. Decisão de copy |
| 🟢 **Endereço que o Zod aceita e o Admin SDK recusa vira 500** | `apps/api/(shared)/lib/auth-action-links.ts:122-129` · `account/email/route.ts:127-137` | Se `getUserByEmail` responder `auth/invalid-email`, o erro sobe e a rota devolve `500 ACCOUNT_UPDATE_FAILED`, com `error.code` e sem stack. Raro, não vaza nada |
| 🟢 **Código de troca aplicado direto no Identity Toolkit pula a revogação e a trilha** | `auth/email-change/confirm/route.ts:79`, `:91-101` · `docs/SECURITY.md:12` | Quem tem o link e a chave web pública aplica o código sem passar pela rota. O e-mail muda, as sessões antigas não caem pela revogação explícita e o evento não é gravado. Declarado no documento; fora do corte |

**Ampliado e depois fechado:** o achado do `getDictionary()` do servidor lendo o cookie ganhou a medição do
`/test` da PR #33 (na `apps/app`, o `<html lang>` ficava uma navegação atrasado ao trocar de idioma pela URL) e
fechou com a PR #41 (ver a lista de fechados).

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
| 🟡 **`ROPA.md` e `SUBPROCESSORS.md` não citam o campo `entitlements` do perfil** (novo, 2026-10-04) | `docs/ROPA.md:83` (operação de cobrança) · `docs/SUBPROCESSORS.md:33` (linha do Firestore) · `packages/sdk/src/types/user/user.ts:67-68` | A PR #38 passou a gravar no perfil a lista de recursos que a pessoa paga, vinda da Stripe pelo webhook. A exportação de dados já inclui o campo (`AccountDataExportDTO` herda o `AccountDTO`), mas os dois inventários listam o perfil sem ele. É o primeiro caso concreto do achado acima: dado novo entrou e os documentos não acompanharam. Correção de texto, P |

### 🆕 Lacunas da tarefa `disabled-account-revocation` (2026-09-30)

O achado desta tarefa (o admin que se desativava, ampliado para arquivar e rebaixar) fechou com a PR #37 e está
na lista de fechados.

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-30 | motivo |
|--------|---------------------|--------|
| `resolveApiActor` sem teste ponta a ponta com conta desativada | **fechada por medição**, sem teste persistente | o `/test` rodou a cadeia sem mock contra o projeto de desenvolvimento; `resolve-api-actor.ts` segue sem arquivo de teste próprio |
| `revokeUserSessions` lançando dentro do `PUT` | **fora de escopo** | a função engole a falha (`server.ts:326-328`) e a rota nunca vê o erro; o `catch` sem teste é anterior à tarefa |
| Pessoa desativada com o app aberto cai no sign-in com a mensagem certa, nos 3 idiomas | **continua aberta**, 🔒 | sem passada de navegador, por custo: o diff não toca UI e o 401 é o mesmo que a revogação de sessão já produzia |
| Admin desativado como alvo (critério 1 medido só com conta comum) | **continua aberta**, risco baixo | mesmo caminho de código; o `/test` não desativou a conta de QA de admin, que é compartilhada entre rodadas. Desde a PR #37 o admin não desativa a si mesmo, mas desativa outro admin |

### 🆕 Achados da tarefa `arcjet-key-lazy-validation` (2026-10-03)

Vindos do `/review` da tarefa, entregue pela PR #36, e reconferidos no `e791d3a`. Nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A regra "aparar e tratar vazio como ausente" existe em duas cópias** | `packages/security/keys.ts:35-41` (o `preprocess` do schema estrito) · `:8-17` (`trimmedString` e `arcjetKeyState`) | O schema do build e o leitor de runtime decidem cada um, por conta própria, o que é chave válida. Se uma cópia mudar, o build de `app`/`web` e a API passam a discordar. O `/review` não aplicou porque o schema estrito ficou fora do escopo por decisão do plano. P |
| 🟢 **Os `.env.example` de `app` e `web` não avisam que uma chave sem `ajkey_` derruba o build** | `apps/app/.env.example:29-30` · `apps/web/.env.example:8-9` | O comentário diz só que, sem a chave, o pacote vira no-op. O `.env.example` da `apps/api` foi atualizado pela PR #36; os outros dois ficaram fora do diff. Quem cola a chave errada descobre no deploy, que falha em "Collecting page data". Correção de texto, P |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-03 | motivo |
|--------|---------------------|--------|
| O proxy da API com o `@repo/security` real e a chave malformada | **fechada** pelo `/test` | `apps/api/__tests__/proxyArcjetKey.test.ts:70-82` (era `:60-72` até a PR #47); a mutação com o `index.ts` antigo derruba o caso |
| O build de `app`/`web` falhando com a chave errada, sem teste automatizado | **fora de escopo** | o build não roda no CI; `keys.test.ts` protege a causa (o schema estrito), e o `/test` mediu o build à mão |
| Chave válida contra a Arcjet real | **continua aberta**, 🔒 | exige credencial e IP de cliente; somada à pendência 24 |

### 🆕 Achados das PRs #37 a #39 (2026-10-04)

Vindos dos `/review` e `/test` das três entregas e da medição desta rodada, conferidos no código em `d92d21b`.
Nenhum bloqueou uma entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois admins que desativam um ao outro ao mesmo tempo ficam os dois desativados** | `apps/api/app/(routes)/users/[id]/route.ts:131-133` (a recusa só compara alvo e ator) | Os dois pedidos passam pelo `requireAdminApi` antes de qualquer gravação. Num fork com dois admins, o painel pode ficar sem admin ativo. Fechar exige transação ou contagem de admins ativos. Registrado pelo `/review` da PR #37, que reescreveu `docs/SECURITY.md:33` para não prometer o contrário |
| 🟢 **O `aria-describedby` dos `HookForm*` sem descrição aponta para um id que não existe** | `packages/design-system/components/ui/form.tsx:115-119` (o `FormControl` sempre põe o id da descrição) · `hookformSwitch.tsx` e `hookformSelect.tsx`, os dois únicos com prop `description` | Todo campo de formulário do repo sem `FormDescription` publica uma referência órfã, e quem acrescentar uma descrição precisa saber que ela só liga se renderizar o `FormDescription`. Medido pelo `/test` da PR #37 no select de tipo e corrigido só ali. Parente do achado da dica do `TextareaInput`, não o mesmo. P no design system |
| 🟢 **Aparelho encerrado com a tela aberta não sai sozinho** | o `401` da API vira só toast na `apps/app`; o aviso de sessão encerrada do `AuthProvider` (`packages/auth/provider.tsx`) só dispara na troca de token ou ao recarregar | As chamadas respondem `401 AUTH_INVALID_TOKEN` e a tela mostra "Sessão inválida ou expirada." com o id da requisição, mas a pessoa segue no painel até recarregar. Medido pelo `/test` da PR #39. Sugestão registrada lá: tratar o `401` da API como sinal para conferir a sessão |
| 🟢 **O expurgo apaga as sessões antes da conta no Firebase** | `apps/api/(shared)/lib/account-erasure.ts:123-129` | Uma requisição com credencial ainda válida que chegue entre os dois passos recria o documento da sessão pelo `trackSession`, e ele sobra depois da exclusão. O documento não tem nome nem e-mail, mas é dado pessoal residual. Inverter a ordem fecha a janela e muda o relatório de exclusão e o `accountErasure.test.ts`. Do `/review` da PR #39 |
| 🟢 **`listByUid` lê todos os documentos de sessão da conta, sem limite** | `apps/api/(shared)/repositories/session.repository.ts:66-79` · `session-tracker.ts:43-54` | A coleção guarda um documento por login e não apaga os encerrados, de propósito (o `PRE-PRODUCTION.md` proíbe TTL nela). A lista e a checagem de "encerrar as outras" leem tudo a cada sessão nova. Para conta com muitos logins, cresce sem teto; hoje não pesa. Do `/review` da PR #39 |
| 🟢 **O link do plano de `plan-entitlements` para a spec morreu com o arquivamento** (ampliado em 2026-10-16, pós-PR #47) | `docs/features/plan-entitlements/analyze/plan.md:3` · `docs/features/pricing-page-catalog/analyze/plan.md:3` | Os dois apontam para `../../../../specs/<id>.md`, e as duas specs foram movidas para `../spec.md` (a de `pricing-page-catalog`, nesta rodada). A auditoria só escreve em `docs/features/` para arquivar spec e não corrige o plano. Os planos de `account-active-sessions` e `account-security-mfa` têm o mesmo link e vão quebrar quando a spec deles for arquivada. Correção de uma linha por plano, ou um passo novo na `spec-audit` §4.1 |
| 🟢 **Âncoras de documento deslocadas pelas PRs #37 a #39** (reduzido em 2026-10-07: a PR #41 corrigiu a do `PRE-PRODUCTION.md:414`; ampliado em 2026-10-14 com a do `RESEARCH-tanstack-vs-next.md:40`; em 2026-10-16, a PR #46 corrigiu as contagens do `SECURITY.md` e deslocou as do `skipValidation`, e esta auditoria mediu mais duas antigas) | `docs/PRE-PRODUCTION.md:501` (era `:497`; a PR #47 deslocou a linha e manteve a âncora errada) · `docs/SUBPROCESSORS.md:33`, `:35` · `docs/ROPA.md:69`, `:83` · `docs/INCIDENT-RESPONSE.md:63` · `docs/BACKUP.md:88` · `docs/ROPA.md:108` e `docs/SUBPROCESSORS.md:40` (`apps/web/env.ts:33` e `apps/web/proxy.ts:63`, `:68`) · `docs/AUTH-SSO.md:105` · `docs/RESEARCH-tanstack-vs-next.md:85` · `docs/RESEARCH-tanstack-vs-next.md:40` (`LanguageSwitcher.tsx:3`, hoje `:1`) | Valores corretos em [Contradições](#contradições-doc--código-medidas-nesta-rodada). Metade veio do paralelo: as PRs #38 e #39 partiram do mesmo `e791d3a`, e cada uma editou documentos sem ver o deslocamento que a outra causava no código. Correção de texto, P |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-04 | motivo |
|--------|---------------------|--------|
| `PlanGate`: skeleton em light, dark e 375 px | **continua aberta** | não remedido na segunda rodada do `/test` de `plan-entitlements`; o componente é o `FormSkeleton` já usado em outras telas |
| Evento real de recursos da Stripe e paginação de `listActiveEntitlementKeys` | **fora de escopo**, 🔒 | exige conta Stripe (pendência 23) |
| `useAccountSessionMutations` com o axios real no caminho de erro (404 e 409 pela UI) | **continua aberta** | o sucesso passou pelo navegador; o erro só no teste com `apiClient` mockado |
| Repositório de sessões contra Firestore real | **fechada por medição**, sem teste permanente | o `/test` da PR #39 conferiu lista, leitura, revogação com `merge` e exportação contra o emulador |
| Latência da leitura de sessão em produção | **continua aberta**, 🔒 | medida só no emulador; somada à pendência 27 |
| Leitor de tela na recusa do próprio admin | **continua aberta**, 🔒 | o `/test` da PR #37 mediu atributos e Tab, sem leitor de tela |

### 🆕 Achados da PR #40 (2026-10-07)

Vindos do plano (§13.3) e do `/test` (§6, O1 a O4) da tarefa `action-menu-keyboard-delete`, conferidos no código e
nas bibliotecas instaladas em 2026-10-07. Todos são anteriores ao diff ou ficaram fora do corte por decisão do plano;
nenhum bloqueou a entrega. O O1 ampliou o achado dos seed tokens do antd e o O4, o do `getDictionary()` do
servidor, nas linhas deles.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Espaço não ativa item do menu de ações**, só Enter | `rc-menu` 9.16.1, `es/MenuItem.js:139` (só `KeyCode.ENTER`) · `packages/design-system/components/ui/action-menu.tsx:98-145` | Vale para "Editar", "Excluir" e os itens customizados. Quem usa Espaço para ativar o item fica sem resposta. É da biblioteca. O plano deixou como achado (§11, pergunta 4): corrigir só no "Excluir" deixaria o menu inconsistente, e corrigir em todos os itens é outra tarefa, P no design system |
| 🟢 **A confirmação de exclusão sai com `role="tooltip"` e não prende o foco** | `rc-tooltip` 6.4.0, `es/Popup.js:17` · `action-menu.tsx:71-96` | O leitor de tela anuncia uma dica, não um diálogo de confirmação destrutiva, e Tab sai do painel. O padrão para esse caso seria `alertdialog` com foco preso, o que exige trocar o `Popconfirm` por outro componente (decisão D3 do plano) |
| 🟢 **Depois de excluir, a linha some e o foco cai no `body`** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` (lista de entidades) · `Table` do `@repo/design-system` | O "Sim" devolve o foco ao gatilho, mas a mutação tira a linha da tabela, e o gatilho some com ela. Quem navega por teclado recomeça do topo da página. O plano atribuiu à `Table`, não ao menu |
| 🟢 **Ao reabrir o menu, o foco cai no último item ativo** | `rc-menu` (guarda o `activeKey`) · `action-menu.tsx:98-99` (`autoFocus`) | Medido pelo `/test` da PR #40 nos ciclos 2 e 3 de cada combinação (O2). Como "Excluir" agora responde ao teclado, ele vira o primeiro item focado na reabertura; a confirmação ainda protege |
| 🟢 **Item de menu que não navega deixa o foco no `body`** | `rc-dropdown`, no fechamento do menu · `action-menu.tsx:117-124` (itens customizados) | Medido pelo `/test` da PR #40 no "Approve" do `playground`, pelo teclado e pelo mouse (O3), num caminho que o diff não tocou. Não medido em `main` antes da PR. Afeta todo fork que acrescentar item que só dispara ação |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| Clique fora e clique no "⋮" com a confirmação aberta | **fechada** pelo `/test` | dois casos jsdom (`actionMenu.test.tsx:384`, `:404`; âncoras remedidas pós-PR #42) e medição no navegador |
| `aria-expanded` voltando a `false` pelo Esc | **fechada** pelo `/test` | `actionMenu.test.tsx:419` e medição no navegador |
| `aria-expanded` voltando a `false` por clique fora com o menu aberto | **continua aberta** | sem teste; o caminho é do `rc-dropdown` e não mudou |
| Itens customizados não abrem a confirmação | **fechada** pelo `/test` | `actionMenu.test.tsx:349` e o `playground` |
| `onDelete` com promise mantém o "Sim" carregando | **fechada** pelo `/test` | `actionMenu.test.tsx:304`; a mutação sem o `return` derruba o caso |
| Anúncio do menu e da confirmação por leitor de tela | **fora de escopo** | não há instrumento no repo; o `/test` leu os atributos |

### 🆕 Achados da PR #41 (2026-10-07)

Vindos do `/review` ("Achados para o backlog") e do `/test` (O1 e O3) da tarefa `server-locale-from-url`,
conferidos no código em `0a49a3b`. Todos existiam antes do diff; nenhum bloqueou a entrega. O O2 do `/test` (o
`<html lang>` parado na troca suave de idioma) foi corrigido dentro da própria PR e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Arquivo inexistente de um segmento na app manda o anônimo para o login em vez do 404** (O1) | `apps/app/proxy.ts:210-212` (o caminho com extensão passa pelo proxy sem checar o idioma; era `:197-199` até a PR #47) · `apps/app/lib/server/authSession.ts:37` (`requireSession` redireciona para `/<segmento>/sign-in` com o segmento que veio na URL) · `apps/app/app/[locale]/` (sem `layout.tsx` que valide o segmento) | `/favicon-novo.png` responde 307 para `/favicon-novo.png/sign-in` e, depois de três redirecionamentos, cai em `/pt-br/sign-in?redirect=...` (medido pelo `/test` da PR #41 em build). O comentário de `isStaticAssetPath` (`apps/app/proxy.ts:127-133`) diz que esse ramo existe para não mandar visitante ao login. Com dois segmentos (`/x/y/nao-existe.txt`) o 404 sai certo. Correção provável, não testada: `notFound()` quando o segmento `[locale]` não está em `locales`. P |
| 🟢 **Redirecionamento sem fim com `NEXT_PUBLIC_DEFAULT_LOCALE` fora da lista** | `apps/app/proxy.ts:216`, `:226-229` (eram `:203` e `:213` até a PR #47) · `apps/web/proxy.ts:99`, `:110` · `packages/internationalization/utils.ts:21-24` (`getDefaultLocale()` não valida) · `packages/next-config/keys.ts:27` (`z.string().optional()`) | Com `NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR`, `/` vai para `/pt-BR/`, que não é idioma válido, e o proxy redireciona de novo sem fim. Erro de configuração do fork, não de quem usa o produto. O `getDictionary()` já cai em `pt-br` nesse caso (`resolveLocale`, `utils.ts:27-38`), então só o proxy fica preso. Correção provável: os proxies usarem `resolveLocale(getDefaultLocale())`, ou o schema da env aceitar só os três valores. P |
| 🟢 **`getDictionary` e `getTranslations` ficam expostas como Server Actions** (O3) | `packages/internationalization/server.ts:1` (`"use server"`) | O build registra as duas no manifesto de Server Actions, e qualquer `POST` com o id certo recebe o dicionário inteiro (o `/test` usou isso para medir o critério 3). O conteúdo é o texto público da UI, então o risco é baixo. Trocar a diretiva por `import "server-only"` muda o contrato do módulo e pede conferir os chamadores client. P |
| 🟢 **O `next start` da web registra `Cannot assign to read only property 'redirects'`** | `apps/web/next.config.ts:15` (provável: `nextConfig.redirects = redirects` grava no objeto `config` importado de `@repo/next-config`) | Visto pelo `/test` da PR #41 no log do build de produção, fora do diff. Causa e efeito **não investigados**: se a atribuição falha, o redirecionamento `/legal` → `/legal/privacy` de produção (`next.config.ts:7-13`) pode não existir. O primeiro passo é medir, em `next build && next start`, se `/legal` ainda redireciona para `/legal/privacy`. A auditoria não sobe app (`cycle-policy` §3.1). **Ampliado em 2026-10-14:** o `/test` da PR #45 viu a mesma mensagem ("Unexpected error occurred while checking config") ao subir a web em build, com a configuração padrão e com a extrema, e o servidor respondeu normalmente; o redirecionamento de `/legal` segue não medido. Nota de leitura: o `source` é `/legal` sem idioma, e `apps/web/app/[locale]/legal/` não tem `page.tsx` (só `privacy`, `terms` e `components`), então `/pt-br/legal` não é coberto por esse redirecionamento. **Visto de novo em 2026-10-15** pelo `/test` da PR #46, nos dois builds da web (com e sem `NEXT_PUBLIC_DOCS_URL`), com a página respondendo 200; o `/legal` segue não medido. Terceira aparição: pela §5.1 a próxima passa a ser medição, não registro |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| A ligação entre o header gravado pelo proxy e o `headers()` do Server Component, sem teste automatizado | **continua aberta**, comportamento medido | o `/test` mediu os itens 1 a 9 por `curl` e navegador em build de produção; um teste automatizado exigiria servidor de pé, que o plano recusou |
| Testes de proxy presos ao formato interno `x-middleware-request-*` do Next 16.0.0 | **continua aberta**, aceita | mesmo padrão dos testes de `x-app-path` que já estavam em `main`; um upgrade do Next quebra os dois juntos |
| Caso de `lang` no Playwright | **fora de escopo** | decisão do plano (pergunta 6) |
| Montagem do `DocumentLangSync` no root layout sem teste unitário | **fechada por medição**, sem teste permanente | o componente tem 3 casos em `documentLangSync.test.tsx`; a montagem foi medida pelo `/test` na rodada 2 (`en` → `es` → `pt-br`, e o 404 raiz mantendo o `lang` do servidor) |

### 🆕 Achados da PR #42 (2026-10-07)

Vindos do plano (§13.4), do `/review` e do `/test` (O1 a O5) da tarefa `antd-theme-seed-colors`, conferidos no
código em `dbcac2a`. Todos existiam antes do diff ou ficaram fora dele por decisão do plano; nenhum bloqueou a
entrega. O O1 (`--destructive` a 4,38:1 no foco do "Excluir") e o O4 (seletor de tema em inglês) ampliaram achados
que já estavam abertos, nas linhas deles; o O4 fechou com eles na PR #43. O O3 (paginação do antd em inglês) também
fechou com a PR #43 e saiu desta tabela. O O5 não é defeito: o spinner que o plano queria medir é do `Button` do
design system, não do antd.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O hash do `typecheck` no turbo ignora os pacotes internos** | `turbo.json:11-14` (`"dependsOn": []`) | O `/review` da PR #42 mediu com `pnpm turbo run typecheck --filter=app --dry=json`, com o diff do design-system no working tree: `dependencies: []`, 289 inputs, nenhum de `packages/design-system`, cache `HIT`. Uma mudança de tipo em `packages/*` pode sair verde em `pnpm turbo run lint typecheck test` no terminal e vermelha no CI, que não guarda cache do turbo. Quem roda `pnpm --filter <app> typecheck` não é afetado, e a auditoria roda com `--force`. Correção provável, não testada: `"dependsOn": ["^typecheck"]` ou o padrão de tarefa `transit` da documentação do turbo. P |
| 🟡 **O item selecionado do seletor de tamanho da paginação fica a 2,74:1 no claro** | `antd-app.tsx:133` (âncora remedida em 2026-10-13, pós-PR #43; era `:127`; o primário neutro deriva `colorPrimaryBg` e `controlItemBgActive` cinza médio) · `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx:195` (`showSizeChanger: true`, a única tabela do repo com ele) | Medido pelo `/test` da PR #42 em build: texto `#0a0a0a` sobre `#575757` no claro (2,74:1) e `#fafafa` sobre `#595959` no escuro (6,71:1). Antes da PR, com o primário em `#404040`, o claro media cerca de 1,9:1, então melhorou sem chegar a 4,5:1. Afeta só o admin, na `/admin/users`. P no design system |
| 🟢 **`useAlert` escolhe o tema do toast pelo `resolvedTheme` sem `forcedTheme`** | `packages/design-system/hooks/useAlert.ts:12`, `:22` | Mesmo padrão que o `/review` da PR #42 corrigiu no provider do antd: no `next-themes` 0.4.6, o `resolvedTheme` ignora o tema forçado. Uma página com `forcedTheme` mostraria o toast no tema salvo pelo usuário. Nenhum app passa `forcedTheme` hoje. P |
| 🟢 **Os aliases `controlOutline`, `colorErrorOutline` e `colorWarningOutline` do antd saem sem sentido** | `antd-app.tsx:57` (`colorBgContainer` em `var(...)`; âncora remedida em 2026-10-13, era `:51`) · `antd/theme/util/alias.js` (`getAlphaColor` sobre o fundo) | O antd calcula esses aliases misturando cor com o `colorBgContainer`, que é variável CSS. Pintam o foco de `Input` e `Select` do antd; no repo, só o seletor de tamanho da paginação os usa. Registrado pelo plano (§13.4), não medido no navegador |
| 🟢 **`--success` do escuro fica a 3,69:1 sobre o fundo** | `packages/design-system/styles/globals.css:66` | Calculado no plano da PR #42 (`colorSuccess` `#007a55`, 5,36:1 no claro). Abaixo de 4,5:1 para texto, acima de 3:1 para componente. Nenhum app usa o token como cor de texto hoje (`git grep` por `text-success`: 0), então o defeito é latente |
| 🟢 **O comentário das regras `.ant-table` no `globals.css` ficou impreciso** | `packages/design-system/styles/globals.css:291-294` | Diz que o hover da linha fica escuro "sem um ConfigProvider sincronizado com o next-themes". Desde a PR #42 o provider segue o tema; as regras continuam necessárias porque o fundo vem de `colorFillSecondary` em `var(...)`, mas o motivo escrito mudou. Correção de texto, P |
| 🟢 **A confirmação de exclusão do `ActionsMenu` começa em x = −15 a 390 px** (O2) | `packages/design-system/components/ui/action-menu.tsx:94` (`placement="bottom"`) | Medido pelo `/test` da PR #42: a margem interna esquerda do painel fica fora da tela; o texto começa em x = 18 e os botões cabem, então nada fica ilegível. O `HEAD` anterior não foi medido em mobile. A PR #40 trocou o `placement` para `bottom` justamente para o painel não sair da tela; resta o recuo |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| Contraste real no navegador (passos 1 a 4 da §9 do plano) | **fechada** pelo `/test` | medido em `next build && next start` contra o build do `HEAD` anterior, critérios 5 a 9 |
| Troca de tema em tempo de execução sem Vitest | **fechada** pelo `/test` | `antdTheme.test.tsx:223` e medição no navegador (um único `data-token-hash` de tema depois de cada troca) |
| Item `danger` no escuro no nível do CSS injetado | **fechada** pelo `/test` | `antdTheme.test.tsx:251` |
| `forcedTheme` sem teste (criada pela correção do `/review`) | **fechada** pelo `/test` | `antdTheme.test.tsx:208` |
| Indicador de carregamento da `Table` do antd | **fora de escopo** | nenhum fluxo passa `loading` à `Table`; o token `colorPrimary` cobre o caso se um fork passar |

### 🆕 Achados da PR #43 (2026-10-09)

Vindos dos planos, do handoff, dos `/review` e dos `/test` das tarefas `account-deletion-dialog-focus` e
`ui-strings-and-password-focus`, conferidos no código em `7fb2fe9`. Todos existiam antes do diff ou ficaram fora do
corte por decisão do plano; nenhum bloqueou a entrega. O menu mobile da web sem nome, que o plano da segunda listou
na §13.3, já tinha linha neste arquivo e não conta como novo. O `HookFormInputPassword` que perdia o foco no envio fechou
com a PR #45 e está na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **`CommandDialog` com título e descrição padrão em inglês** | `packages/design-system/components/ui/command.tsx:31-32` (`"Command Palette"`, `"Search for a command to run..."`) | Lidos pelo leitor de tela quando o diálogo abre. Sem consumidor no repo hoje; o fork que adotar o componente herda o inglês. Fora do corte da PR #43 por isso. P, no molde dos oito componentes da PR |
| 🟢 **`DialogFooter` com `showCloseButton` põe um `<button>` dentro de outro** | `packages/design-system/components/ui/dialog.tsx:117-121` (`DialogPrimitive.Close` sem `asChild` em volta do `Button`) | HTML inválido e erro de hidratação no primeiro consumidor. Sem consumidor hoje (`git grep showCloseButton -- apps`: 0). Medido nesta auditoria: o caso `componentCopy.test.tsx` "nomeia os dois botões de fechar do Dialog" imprime `In HTML, <button> cannot be a descendant of <button>` no stderr do `@repo/design-system`. Defeito do shadcn, anterior à PR #43. P |
| 🟢 **Clique no overlay de um `AlertDialog` manda o foco para o `body`** | `@radix-ui/react-focus-scope` 1.1.16, `dist/index.mjs:49-50` (ignora `focusout` com `relatedTarget` nulo) · todo `AlertDialog` do repo | O diálogo não fecha, mas o foco sai dele; o Tab seguinte volta. Medido pelo `/test` de `account-deletion-dialog-focus` e anterior à mudança. É da biblioteca; fica registrado para quem auditar acessibilidade |
| 🟢 **O diálogo de troca de e-mail devolve o foco à senha também quando o erro é do e-mail** | `<account>/AccountEmailChangeDialog.tsx:111-112` | Em `USERS_AUTH_EMAIL_ALREADY_IN_USE`, o campo errado é o novo e-mail, e o foco vai para a senha. O `onError` não lê o código porque o `FormattedError` não o expõe (pergunta P2 do plano, opção (a) adotada). Mudar exige expor `code` no `FormattedError` |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-13 | motivo |
|--------|---------------------|--------|
| Abertura do diálogo de exclusão por Enter e Espaço sem Vitest | **fechada no navegador**, sem teste | o gatilho é um `<button>`, e Enter e Espaço geram o mesmo `click`; o `/test` mediu os dois |
| Limpeza do diálogo de exclusão depois de uma exclusão bem-sucedida | **fora de escopo** | no sucesso a sessão termina e o app vai para o login; o diálogo não reabre |
| Conta só Google no navegador | **continua aberta**, 🔒 | o emulador não tinha conta assim; o Vitest cobre o bloco do canal de privacidade |
| Anúncio do diálogo por leitor de tela | **continua aberta**, 🔒 | não há instrumento no repo |
| Recusa que chega antes de o campo voltar a habilitado | **fechada** pela PR #45, por leitura | o campo de senha não fica mais desabilitado no envio (`readOnly`, `hookformInputPassword.tsx:83`), então o `focus()` do `onError` sempre alcança o campo |
| T1 sem o `SidebarRail` no celular | **continua aberta**, risco baixo | no celular a barra vira `Sheet`; o rótulo é o mesmo do caso de desktop |
| Troca de idioma sem recarregar nos componentes com `getDictionary()` sem Vitest | **fechada no navegador**, sem teste | o `/test` mediu pt-br → en → es → pt-br no painel comum, no admin e na landing; o jsdom não reproduz a troca de rota do App Router |
| T6 com um código de recusa só | **continua aberta**, aceitável | o `onError` não lê o código, então outro código percorre a mesma linha |
| Recusa `ACCOUNT_CURRENT_PASSWORD_INVALID` e sucesso no diálogo de e-mail | **continua aberta**, 🔒 | exige a Resend (pendência 13) |
| Diálogo de preferências de cookies | **continua aberta**, 🔒 | o consentimento só aparece com um ID do Google Analytics; o rótulo "Fechar" do `Dialog` está no Vitest |
| `Pagination` do design system no navegador | **fora de escopo** | o componente não tem consumidor; o texto está no `componentCopy.test.tsx` |
| Seletores de idioma e de tema da web a 390 px | **fora de escopo** | o cabeçalho esconde os dois nessa largura; o botão do menu mobile ganhou nome na PR #45 |

### 🆕 Achados da PR #44 (2026-10-14)

Vindos do plano (§13.3), do `/review` e do `/test` (§"Achados para o backlog") da tarefa `date-input-locale`,
conferidos no código em `fa7041b`. Todos existiam antes do diff; nenhum bloqueou a entrega. O estouro do header da
web em es a 1280 px ampliou o achado do header deslogado. Fecharam com a PR #45, e estão na lista de fechados desta
rodada: o calendário que abria no mês atual, a hidratação da `/contact`, o `initialFocus` e o caso preso a outubro.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O `Calendar` grava `data-day` com `toLocaleDateString()` do navegador** | `packages/design-system/components/ui/calendar.tsx:229` | O atributo segue o idioma e o formato do navegador, não o da página. Invisível hoje: nenhum teste nem CSS do repo o lê (`git grep data-day` fora do componente: 0). Vira defeito se alguém passar a depender dele. Do plano da PR #44 (§13.3). P |
| 🟢 **A 390 px, o campo de nascimento fica atrás do rodapé fixo de `/entities/edit`** (novo, 2026-10-14) | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` (formulário de edição) · `Footer` de `apps/app/shared/components/ui/` | Medido pelo `/test` de `date-input-navigation` em build: sem rolar, o clique no botão "Data de nascimento" cai no rodapé (Voltar/Salvar). Rolando, o campo aparece e funciona. O relatório trata como o layout de sempre da tela; não medido no `HEAD` nem em outros formulários com o mesmo rodapé. P, e pede medição antes de correção |
| 🟢 **Clicar no botão de enviar tira o foco do botão, e no login ele fica no `body` depois da recusa** (novo, 2026-10-14, 3ª passada, do plano de `form-field-focus-and-names`) | `packages/design-system/components/ui/button.tsx:72` (`loading` liga `disabled`) | O botão focado fica `disabled` durante o pedido, e o navegador tira o foco dele. Nos dois diálogos de conta, o `onError` devolve o foco à senha; no login, não. Lido no código; **não medido** no navegador para o clique (o `/test` mediu o Enter no campo, que passou a manter o foco). Resolver pede `aria-disabled` no lugar de `disabled` no `Button`, que muda a semântica de todo botão do repositório. Os outros seis `HookForm*` que ainda ligam `disabled` no envio (`hookformTextarea.tsx:58`, `hookformSelect.tsx:90`, `hookformSwitch.tsx:65`, `hookformDateInput.tsx:54`, `hookformImageUpload.tsx:57`, `hookformRadioGroup.tsx:57`) não enviam o formulário com Enter, então só perderiam o foco por este caminho |
| 🟢 **O asterisco de obrigatório do `Label` do design system entra no nome acessível, e a cor dele não existe** (novo, 2026-10-14, 3ª passada) | `packages/design-system/components/ui/label.tsx:27` (`<span className="text-error-500">*</span>`, sem `aria-hidden`) | Um campo `required` que usa este `Label` (`DateInput`, `TextareaInput`, `RadioGroupInput`, `ImageUploadInput`) teria o nome "Gênero *". O `FormLabel` dos `HookFormInput*` já esconde o asterisco com `aria-hidden` (`hookformInputPassword.tsx:66-72`). `git grep error-500` em `apps` e `packages`, fora do `label.tsx`: 0, então a classe não gera cor e o asterisco sai na cor do rótulo. Latente: nenhum consumidor passa `required` a esses quatro componentes hoje. Do plano de `form-field-focus-and-names` (§1.3). P |
| 🟢 **O `RadioGroupInput` recebe `required` e não repassa ao Radix** (novo, 2026-10-14, 3ª passada) | `packages/design-system/components/ui/radio-group-input.tsx` (`required` só vai ao `Label`) | O grupo não publica `aria-required`. Repassar ao Radix marca também os `input` ocultos com `required`, o que liga a validação nativa do navegador dentro do `<form>`, por isso o plano deixou de fora. Latente: nenhum grupo de rádio do repositório é obrigatório. P |
| 🟢 **O `useSubmitEnterGuard` depende de o React Query entregar o estado por `setTimeout(0)`** (novo, 2026-10-14, 3ª passada; risco, não defeito) | `packages/design-system/components/form/hookform/useSubmitEnterGuard.ts` | O hook barra o Enter enquanto o `isSubmitting` está ligado e por um `setTimeout(0)` depois, até o botão do formulário receber o `isPending` da mutação. A janela fecha porque o React Query notifica o estado nesse mesmo tempo. Um fork que troque o scheduler do React Query (`notifyManager.setScheduler`) ou dispare a mutação de outro jeito reabre a janela, e dois Enter a 2 a 5 ms voltam a mandar dois pedidos, como o `/test` mediu antes da correção. Os testes `hookformEnterResubmit.test.tsx` e `signInEnterResubmit.test.tsx` cobrem o comportamento atual. Registrado para quem mexer no React Query |
| 🟢 **Os alertas de erro mostram "(Código do erro: <uuid>)" também em recusa esperada** (novo, 2026-10-14, 3ª passada) | `packages/shared/utils/helpers/handleClientError.ts:4-11` (anexa o `requestId` a toda resposta da API) · `formattedError.ts:112-121` | Visto pelo `/test` de `form-field-focus-and-names` nos diálogos de conta: "A senha atual está incorreta. (Código do erro: …)". O código existe para a pessoa citá-lo ao suporte (PR #15, `observability-logging`), e o `panelErrorRequestId.test.tsx:115` o exige num 404. Escolher quais recusas escondem o código (só 4xx de validação? todo 4xx?) é decisão de copy e de suporte, não técnica. Fica como achado até essa decisão |
| 🟢 **Salvar as preferências em `/es` leva para `/pt-br`, porque o formulário começa com o idioma da conta** (novo, 2026-10-14, 3ª passada) | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx:65` (o campo começa com `account.preferences.locale`) · `:89-99` (grava o cookie e navega para o idioma salvo) | Medido pelo `/test` com a conta do seed, que guarda português: quem lê a tela em espanhol e salva o tema volta para o português. É o comportamento previsto da preferência de idioma, mas surpreende quem chegou pela URL. Se o campo deve começar com o idioma da URL é decisão de produto; fica como achado |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-14 | motivo |
|--------|---------------------|--------|
| Nenhum teste renderizava o `ContactFormClient` | **fechada** pelo `/test` | `apps/web/__tests__/contactFormDateLocale.test.tsx`, 3 casos com SSR em `node`; com o arquivo anterior, 2 de 3 reprovam |
| Troca de idioma pela navegação do App Router sem teste automatizado | **continua aberta**, comportamento medido | o jsdom não reproduz a troca de rota; o `/test` mediu pt-br → en → es → pt-br com um marcador em `window`. Mesma lacuna da PR #43 |
| `captionLayout="dropdown"` sem consumidor no produto | **fechada** pela PR #45 (2026-10-14) | o nascimento de `entity` é o primeiro consumidor (`EntityFormFields.tsx:155`), medido no navegador nos três idiomas |
| Precedência do `placeholder` do chamador no navegador | **continua aberta**, aceitável | os textos da trilha são iguais ao padrão, então a tela não distingue; o caso `:124` cobre |
| `DateInput` sob personificação | **fora de escopo** | o diff não mexeu no `disabled`; `entityFormsReadOnly.test.tsx` cobre |
| `locale={undefined}` explícito do chamador volta o `Calendar` ao `enUS` | **fora de escopo** | registrado pelo `/review` para quem ler a API (`calendar.tsx:200-202`); nenhum consumidor faz isso |

### 🆕 Achados da PR #45 (2026-10-14)

Vindos do `/test` ("Achados fora do diff" e "Menu ao navegar") e da rodada 2 do `/review` da tarefa
`web-header-reflow-and-menu-name`, conferidos no código em `eb47e80`. Eram três; o link de documentação que não
aparecia e o menu que ficava aberto fecharam com a PR #46 e estão na lista de fechados daquela rodada (versão em `dd31a95`). Sobra o que restou
do estouro do header depois da correção. O erro de `redirects` no `next start` da web, que o mesmo `/test` viu de
novo, ampliou a linha que já existia, em [Achados da PR #41](#-achados-da-pr-41-2026-10-07).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Com marca de 30 caracteres, o header da web ainda rola de lado a 1024 px** | `apps/web/app/[locale]/components/header/index.tsx:236` (grupo da direita com `w-full`) · `:39` (grade da barra a partir de `lg`; `:45`, a partir de `xl`) · `:231-233` (nome da marca), âncoras remedidas em 2026-10-16 depois da PR #46 | Medido pelo `/test` da PR #45 com `NEXT_PUBLIC_APP_NAME` de 30 caracteres: +34 px em es visitante, +26 em es logado, +11 em en logado e +4 em pt-br logado; a 1280 e 1440 px, sem rolagem. A grade antiga dava +49 e 1304 no mesmo caso, então a PR melhorou sem zerar. Causa provável, por leitura do `/review`: o `w-full` zera a contribuição mínima do grupo da direita na trilha `1fr`, e a coluna do meio nunca encolhe. Correção candidata, não medida: `lg:w-auto` ou `lg:min-w-max` no grupo e `lg:truncate` no nome, com a marca podendo sair do centro, que é decisão de produto. Desde a PR #46, com o link de documentação ligado a barra cheia só aparece a partir de 1280 px, então a 1024 px o caso só vale sem o link; a marca longa não foi medida de novo |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-14 | motivo |
|--------|---------------------|--------|
| Layout e rolagem do header sem teste automatizado | **continua aberta**, comportamento medido | o jsdom não calcula layout (decisão D6 do plano); o `/test` da PR #45 mediu 36 combinações em build, e o da PR #46, 48 com o link de documentação e as mesmas 36 sem ele |
| Evento de toque real no botão do menu | **continua aberta** | o `agent-browser` gera só mouse; o botão usa `onClick`, que o toque também dispara |
| Lista nativa do `<select>` do seletor de ano no tema escuro | **continua aberta**, 🔒 | o navegador headless não desenha a lista nativa (`/test` de `date-input-navigation`) |
| Sonda de novembro do `dateInputLocale.test.tsx` contra o código antigo | **fora de escopo** | o código antigo saiu de `main`; o caso passa hoje porque o calendário abre no mês do valor |

### 🆕 Achados da PR #46 (2026-10-16)

Vindos dos planos, dos `/review` e dos `/test` das tarefas `web-docs-link-and-mobile-menu` e
`api-auth-webhook-error-codes`, conferidos no código em `c8577b7`. Todos ficaram fora do corte por decisão
registrada ou existiam antes do diff; nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O design system declara `radix-ui: latest`** | `packages/design-system/package.json:25` | Medido pelo `/review` da tarefa da web: qualquer `pnpm install` que precise resolver de novo (bastou acrescentar três devDependencies na web) sobe o `radix-ui` de 1.6.7 para 1.8.1 no lockfile, com cerca de 1.380 linhas de diff sem relação com a tarefa. A PR #46 evitou isso editando o lockfile à mão, conferido com `--frozen-lockfile`. A próxima tarefa que instalar algo traz a atualização junto, sem ninguém ter pedido. P: fixar a versão que o lockfile tem hoje |
| 🟢 **Sem `FIREBASE_WEB_API_KEY` fora do emulador, as rotas que conferem senha respondem como se a senha estivesse errada** | `apps/api/(shared)/lib/firebase-identity-toolkit.ts:40-51` (lança `IdentityToolkitError` quando a chave falta) · `auth/sign-in/route.ts:31-43` · `account/password/route.ts:40` | O erro de configuração cai no mesmo mapeamento da credencial recusada e vira `400 AUTH_INVALID_CREDENTIALS` no login pela API (antes da PR #46 era 500), e o código equivalente nas rotas de conta. Quem configura o fork vê "senha incorreta" e não a chave faltando. Sem teste. Registrado pelo plano e pelo `/review` da tarefa da API |
| 🟢 **O menu mobile da web não fecha com Escape nem com clique fora, não tem `aria-controls`, e o foco cai no `body` ao seguir um link** | `apps/web/app/[locale]/components/header/index.tsx:305-372` (o menu) · `:332`, `:359` (os links do painel) | D6 do plano, fora do corte. O `/test` mediu o foco: seguir "Início" estando na home deixa quem usa teclado sem foco visível, porque o link sai do DOM com o painel e a rota não muda. Nas outras rotas, é o comportamento comum do App Router. P, no mesmo arquivo |
| 🟢 **A 390 px, o painel do menu mobile deixa duas faixas da página à mostra** | `header/index.tsx:324` (`container absolute top-20 right-0 w-full`) | Medido pelo `/test` da PR #46: o painel vai de x = 16 a x = 359 numa janela de 375 px úteis, e o texto da página aparece nas faixas laterais de 16 px com o menu aberto. A classe não mudou no diff. P |
| 🟢 **`NEXT_PUBLIC_DOCS_URL` preenchida em dois `.env.example` que não a leem** | `apps/app/.env.example:74` · `apps/api/.env.example:87` (era `:86` até a PR #47) | D5 do plano da tarefa da web. Só a web lê a variável (`apps/web/env.ts:24`), e o `docs/SETUP.md:72` já diz isso. Quem copia o exemplo da app ou da API acha que a variável faz algo ali. Correção de texto, P |
| 🟢 **Header e footer da web decidem "link externo" de jeitos diferentes** | `apps/web/app/[locale]/components/footer.tsx:84-92`, `:109-121` (`includes("http")`) · `header/index.tsx:52` (`startsWith("http")`) | Para os valores reais (`/<locale>/...` e a URL da documentação) o resultado é o mesmo. Um caminho interno com "http" no meio abriria em aba nova só no footer. Registrado pelo `/review`; o footer não estava no diff |

O `/test` da tarefa da web também mediu, com a barra de rolagem clássica, `scrollWidth` 376 contra `clientWidth` 375
em `/<locale>/pricing` a 390 px, sem elemento passando da borda por mais de 0,5 px: arredondamento de subpixel, sem
linha própria. O da API viu o `console.error` com stack ao verificar o token de uma conta apagada
(`packages/auth/server.ts:194`), já contado entre os `console` crus de `observability-logging`.

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-16 | motivo |
|--------|---------------------|--------|
| Largura e layout do header sem teste automatizado | **continua aberta**, por desenho | medido no navegador (48, 36 e 24 combinações); o `apps/web/CLAUDE.md` reserva layout ao `agent-browser` |
| `headerMobileMenu.test.tsx` só em pt-br | **fora de escopo** | no navegador, o fechamento foi medido nos três idiomas |
| `IdentityToolkitError` de chave ausente sem teste | **continua aberta** | virou o achado acima |
| `429` do Arcjet no `/auth/sign-in` | **continua aberta**, 🔒 | exige `ARCJET_KEY` válida; somado à pendência 24 |

### 🆕 Achados do inventário da descoberta (2026-10-16)

Vindos do inventário da descoberta de 2026-10-16, lidos no código de `c8577b7` (pós-PR #46) e **não medidos**: a
rodada não subiu app nem rodou teste. Três já têm spec que os resolve; os outros cinco são tarefa direta. Na
auditoria do mesmo dia, as âncoras dos oito foram conferidas (todas batem), o mecanismo do 500 do
`/auth/sign-in/google` foi medido, e o arquivamento pelo admin ganhou o fato da confirmação da tela. Os outros seis
seguem só lidos: medir exigiria subir app ou o emulador de Auth.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O usuário arquivado pelo admin consegue entrar de novo, com um perfil novo** | `apps/api/app/(routes)/users/[id]/route.ts:172-218` (o `DELETE` faz só o soft delete do perfil, em `:204`; não desativa a conta no Auth nem revoga sessões) · `apps/api/(shared)/lib/user-merge.ts:20-24` (`getMergedUserByUid` cria um perfil padrão quando não acha um ativo) · `apps/api/app/(routes)/auth/me/route.ts:19` | Pela leitura, quem foi arquivado entra com a mesma senha, o `/auth/me` do login cria um perfil `COMMON` vazio, e o guard (`common-panel.ts:45-54`) passa a aceitar. O arquivamento vira um "reiniciar conta". Desativar (`PUT` com `disabled`, `:144-152`) bloqueia de verdade. **Fato novo em 2026-10-16:** a confirmação que o admin vê promete o contrário: "O usuário sai da listagem e perde o acesso" (`translations/apps/app/pages/admin/users.ts:35`). E a sessão aberta nem precisa de novo login, porque o `DELETE` não revoga sessões e o `resolveApiActor` não lê o perfil (`resolve-api-actor.ts`); o próximo `/auth/me` recria o perfil. Precisa de medição no emulador de Auth antes da correção. A direção da correção já está escrita na tela, então não há pergunta de produto; se a medição confirmar, a severidade sobe |
| 🟡 **`POST /auth/sign-in/google` devolve a mensagem crua do provedor e lê o corpo sem validação** | `apps/api/app/(routes)/auth/sign-in/google/route.ts:10` (`req.json()` sem Zod) · `:28` (`{ error: e.message }` em 401) | Mesma família do que a PR #46 corrigiu em `/auth/sign-in` e `/auth/me` (regra de ouro 3). Corpo vazio cai em 500: **mecanismo medido em 2026-10-16**, `Request.json()` com corpo vazio lança `SyntaxError` no Node 22, e a linha `:10` fica fora do `try` (`:14-31`). A rota tem consumidor (`apps/app/shared/lib/googleSignInApi.ts:36`). A spec [`social-sign-in-providers`](social-sign-in-providers.md) põe essa rota no mesmo contrato, mas a correção não precisa esperar por ela |
| 🟡 **O envio pronto do formulário de contato mandaria a mensagem ao remetente, e um comentário diz que o formulário já entrega** | `packages/email/index.ts:82` (`ownerInbox()` devolve `RESEND_FROM`) · `apps/web/app/[locale]/contact/actions/contact.tsx:7-25` (sem importador) · `apps/web/shared/lib/privacyContact.ts:5-8` | Amplia a linha do `welcomeEmail` e do formulário de fachada em [Dependências, exports e código morto](#-dependências-exports-e-código-morto). Resolvido pelo corte de [`contact-support-channel`](contact-support-channel.md) |
| 🟡 **O login da landing não leva a lugar nenhum depois de entrar, e o cadastro da landing não envia verificação** | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:44-46` (com usuário, o componente devolve `null`) · o mesmo arquivo não tem link de "esqueci a senha" · `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:34-40` (não chama `sendEmailVerification`; a app chama em `SignUpFormClient.tsx:113`, que era `:106` até a PR #47) | Quem entra pela landing vê a área do formulário sumir sem destino. A conta criada pela landing nasce sem o e-mail de verificação que a conta criada pela app recebe. Não bloqueou [`pricing-page-catalog`](../docs/features/pricing-page-catalog/spec.md), entregue pela PR #47: pela D4, o CTA de preços leva ao cadastro da app |
| 🟡 **A tela de erro global da app é fixa em inglês** | `apps/app/app/global-error.tsx:13-16` (`lang="en"`, "Oops, something went wrong", "Try again") | Regra de ouro 2. A web tem a linha equivalente em [Achados do inventário de 2026-09-26](#-achados-do-inventário-da-descoberta-2026-09-26) |
| 🟢 **O `playground` de componentes aparece no menu lateral do usuário final** | `apps/app/app/[locale]/(authenticated)/(common)/routes.tsx:21-27` | É vitrine de quem desenvolve; num fork em produção, o usuário vê uma página de componentes de exemplo. Esconder fora do desenvolvimento, ou tirar do menu, é decisão rápida |
| 🟢 **Os menus laterais não levam às homes** | `(common)/routes.tsx:20-65` (sem item "Início") · `admin/routes.tsx:18-33` (só usuários e auditoria, sem `/admin`) | A home do usuário e o painel do admin, entregues por `dashboard-home` e `admin-analytics-dashboard`, só se alcançam pelo breadcrumb ou pelo logo |
| 🟢 **A aba Segurança mostra "trocar senha" para a conta só Google** | `apps/app/.../account/(components)/AccountSecurityForm.tsx:56-103` · `apps/api/app/(routes)/account/password/route.ts:29-46` | O formulário aparece e falha ao conferir uma senha que não existe. Resolvido pelo corte de [`linked-sign-in-methods`](linked-sign-in-methods.md) |

### 🆕 Achados da PR #47 (2026-10-16)

Vindos do plano (Riscos e "Achados para o backlog"), do `/review` (rodada 1) e do `/test` da spec
`pricing-page-catalog`, conferidos no código em `dd31a95`. Todos existiam antes do diff ou ficaram fora do corte por
decisão registrada; nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O inventário de guards do `docs/SECURITY.md` não contou a rota nova** | `docs/SECURITY.md:16-33` (diz 36 rotas e 13 sem guard, "medido em 2026-10-14") · `apps/api/app/(routes)/payments/catalog/route.ts` | São 37 rotas e 14 sem guard desde a PR #47. A mesma PR editou a linha `:155` do documento, sobre o rate limit, e não o inventário. Quem audita a superfície pelo documento não vê a única rota pública que lê a Stripe. Medido nesta auditoria. Correção de texto, P |
| 🟢 **`postAuthRedirectTarget` decodifica o destino duas vezes** | `packages/auth/redirect.ts:27` (`decodeURIComponent` sobre um valor que o `searchParams.get` já decodificou) | Valores de query com `%26`, `%3D` ou `%25` perdem a codificação ao passar pelo guard, e um `%` malformado faz o destino cair no fallback. Os `priceId` da Stripe (`price_` e alfanuméricos) não são afetados. Do plano da PR #47; o `/test` o deixou fora de escopo. P |
| 🟢 **A sessão expirada leva ao login só com o caminho, sem a query** | `packages/auth/provider.tsx:80-90` (`expiredSessionOrigin` usa `window.location.pathname` quando não há `redirect`) | Quem estava numa listagem filtrada ou na aba de cobrança com `?plan=` volta para a página sem os filtros depois de entrar de novo. Fora do caminho do CTA de preços. Do plano da PR #47. P, mas encosta em `provider.tsx`, que `linked-sign-in-methods` declara no `contends_on` |
| 🟢 **O guard de redirect é testado fora do próprio pacote** | `apps/app/__tests__/postAuthRedirectTarget.test.ts` testa `packages/auth/redirect.ts` | `pnpm --filter @repo/auth test` não exercita o guard que acabou de ganhar a checagem contra open redirect; só a suíte da `apps/app` pega uma regressão nele. Mover o arquivo para `packages/auth/__tests__/` resolve. Do `/review` da PR #47 (D8). P |
| 🟢 **As abas da conta se sobrepõem em en a 1280 px, e a lista rola de lado a 375 px** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx:71-77` (`TabsList`) | Medido pelo `/test` da PR #47: "Security" e "Preferences" ficam colados e "Preferences" passa por baixo de "Billing". O arquivo não estava no diff. Não medido em pt-br e es nem em outras larguras. P, e pede medição antes de correção |
| 🟢 **As seções da home da web colam na borda lateral no celular** | `apps/web/app/[locale]/(home)/components/` (`hero.tsx`, `features.tsx`, `stats.tsx`, `cases-client.tsx`, `testimonials-client.tsx`, `faq.tsx` e `cta.tsx`, com `container mx-auto` sem padding) | Medido pelo `/test` da PR #47: sete containers começam em x = 0 a 375 px. A correção na raiz seria um padding no `container`, mas o header e o footer já compensam por fora e teriam de mudar junto; a `/pricing` resolveu com o recuo no wrapper (`px-4 md:px-2`). Do `/review` da PR #47. P a M |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-16 | motivo |
|--------|---------------------|--------|
| Proxy da app testado com `URL`, não com o `NextURL` do Next | **continua aberta** | a relativização do `Location` ganhou asserção (`proxy.test.ts`), e a resposta real foi medida em `next dev` e `next start`; o tipo `NextURL` segue fora do teste |
| Cache do catálogo por instância em serverless | **continua aberta**, 🔒 | critério 23 do `/test`; exige deploy com mais de uma instância |
| Catálogo, chamadas e checkout contra uma conta Stripe real | **fora de escopo**, 🔒 | pendência 23 |
| Layout da `/pricing` sem teste automatizado | **continua aberta**, por desenho | o `apps/web/CLAUDE.md` reserva layout ao `agent-browser`; o `/test` mediu o recuo em 375, 768 e 1280 px, claro e escuro |
| Páginas de login e cadastro repassando o `redirect` | **fechada** pelo `/test` | `apps/app/__tests__/authPagesRedirect.test.tsx`, 6 casos |
| Casos de `..` no guard de redirect | **fechada** pelo `/test` | +4 casos em `postAuthRedirectTarget.test.ts` e +1 em `proxy.test.ts`, os dois derrubados pelo guard antigo |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md).
> Na auditoria pós-PR #47 (2026-10-16) foram remedidas as linhas 6, 8, 15, 16, 23 e 24, e as âncoras do
> `PRE-PRODUCTION.md` que a PR deslocou. As outras mantêm o veredito de 2026-10-04 ou de 2026-10-16 pós-PR #46, com
> motivo: exigem console de provedor, ou dependem de arquivos que a PR #47 não tocou. A PR #47 não criou índice, rule,
> variável obrigatória nem passo manual: o `/test` registra "nada a acrescentar ao `docs/PRE-PRODUCTION.md`", e a PR
> só acrescentou ao §12 o parágrafo da página de preços (`:475-480`) e um `curl` de conferência do catálogo
> (`:571-572`).

| # | pendência | onde vive | veredito (2026-10-16, pós-PR #47, nas linhas remedidas; datas anteriores nas demais) |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto**; não remedido nesta rodada, nada no repositório mudou |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto, medido**: o `/test` da PR #35 recebeu `503 PAGINATION_INDEX_MISSING` em `GET /entities` contra o projeto de desenvolvimento (`test/report.md:85`), então o índice não está publicado nem lá. São **seis** índices sem publicação; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido em 2026-10-16 pós-PR #47 (404, `[]`, 47 PRs, nenhuma aberta); estacionado (E3). É o que falta para o item 2 de `e2e-testing`, arquivada com esse ⚠️ |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**, remedido em 2026-10-16 pós-PR #47: `git grep` por `@sentry`, `@logtail`, `@axiomhq` e `betterstack` em `apps/` e `packages/` devolve 0; estacionado (E1) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto** em produção. Desde a PR #31, upload, avatar e o passo `storage` do expurgo rodam e têm teste sob o emulador; contra bucket real seguem sem prova o objeto que não abre sem assinatura e a expiração da URL V4 |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **metade fechada**, reconhecido na auditoria pós-PR #34: o `/test` de `compliance-docs-kit` mediu em 2026-09-30, contra o projeto Firebase de desenvolvimento, que depois de `revokeRefreshTokens` o cookie emitido antes volta `null`, o bearer volta `null` em `resolveApiActor` e `createSessionCookie` com o token anterior lança `auth/id-token-expired` (`docs/features/compliance-docs-kit/test/report.md`, tabela "Resultado bruto"). É a prova que a ressalva de `session-refresh` pedia para a camada de verificação. **Continua aberto** só o percurso de navegador: sair numa app e ver a outra perder a sessão. O `/test` da PR #35 somou a medição da conta desativada (bearer recusado com e sem revogação, e depois da reativação) e também não subiu navegador |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado. O `/test` da PR #29 deixou 🔒 o e-mail de verificação depois do cadastro pela API (critério 20). O `/test` de `brand-config` deixou 🔒 o nome da marca com acento na caixa de entrada. O `/test` da PR #33 deixou 🔒 a entrega do aviso ao endereço antigo e do link ao novo; sem Resend o pedido responde `503 EMAIL_NOT_CONFIGURED`, medido nos 3 idiomas |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #35 criou e apagou a própria conta (`PRE-PRODUCTION.md:944`, era `:937` até a PR #47). Pelos relatórios, os `/test` das PRs #37 a #39 e #41 a #44 rodaram sob o emulador (os da #43 criaram contas `@example.com`, entre elas nove `qa-ui-strings-NN@example.com`, que existiram só no emulador; o da #44 não criou conta, usou as duas do seed e criou a entidade `qa-date-input-locale-01`, também só no emulador; os três da #45 rodaram sob o emulador, com as contas do seed e a conta que o `signUp.spec.ts` do `pnpm e2e` cria e descarta); o `/test` da PR #46 também rodou sob o emulador, com as contas do seed e uma conta `qa-api-error-codes@example.com` criada, desativada e apagada lá; o da PR #47 também, com as contas do seed e `qa-pricing-catalog@example.com`, que morreu com o processo do emulador); o console não foi aberto |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**, remedido em 2026-10-16 pós-PR #47: `git ls-remote --heads origin` devolve 46, ou seja, 45 além de `main` (eram 44; `feat/pricing-page-catalog` ficou viva depois do merge, como as das PRs #37 a #46) |
| 17 | Login com Google sem passe manual com conta real | *(só neste arquivo)* | **continua aberto**. O `/test` da PR #24 também não percorreu o Google no emulador; o nome do Google como valor inicial do passo 1 ficou fechado só por leitura |
| 18 | `storage.rules` nunca publicado (o teste veio com a PR #31) | `PRE-PRODUCTION.md` §6 e `:54-58` | **metade fechada** pela PR #31: `storage.rules` e `firestore.rules` têm teste contra emulador no `verify` (20 e 145 testes; entrega em [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md)). **Continua aberto** publicar no projeto real, que depende da 11 |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto**. Vazia, o canal cai no formulário de contato, que é maquete |
| 23 | Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com **seis** eventos (a PR #27 acrescentou `invoice.paid` e a PR #38, `entitlements.active_entitlement_summary.updated`, `PRE-PRODUCTION.md:455`), recursos cadastrados no Dashboard para o gate por recurso, conferir o custo do Entitlements, chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **continua aberto**. A PR #33 acrescentou ao §12 habilitar a edição do e-mail no Customer Portal, porque a troca de e-mail não atualiza o `customer`. Cinco critérios de `billing-subscription`, quatro de `admin-billing-insights` o cancelamento real no arquivamento pelo admin (PR #28) , o botão de checkout em carregamento (PR #32) a entrega real do evento de recursos (PR #38) e o catálogo, as chamadas e o checkout reais da `/pricing` (PR #47) seguem 🔒 até uma conta real existir. A PR #47 acrescentou ao §12 o parágrafo da página de preços (`PRE-PRODUCTION.md:475-480`), sem passo novo: o catálogo é o mesmo da aba de cobrança. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |
| 24 | 🆕 `ARCJET_KEY` por fork: sem ela o rate limit é no-op, e o cadastro pela API passa a depender dela (a rota usa o Admin SDK, fora do limite do Firebase por IP) | `PRE-PRODUCTION.md` §8 (`:594-609`, era `:587-602` até a PR #47) | **aberto**, entrou com a PR #29. Critério 19 do `/test` da fatia 1 🔒. Desde a PR #36, a chave precisa ter o prefixo `ajkey_`: sem ele, a API trata a chave como ausente e registra um erro no boot, e o build de `app` e `web` falha (`PRE-PRODUCTION.md:606-608`). A chave válida contra a Arcjet real segue 🔒 (`/test` da tarefa `arcjet-key-lazy-validation`). O `/test` da PR #46 deixou 🔒 o `429` do `/auth/sign-in`, pelo mesmo motivo (remedido em 2026-10-16) |
| 25 | 🆕 Fechar o cadastro pelo REST do Identity Toolkit com a chave pública, que ainda aceita senha de 6 ou 7 (Identity Platform: password policy em `ENFORCE` ou cadastro pelo cliente desligado) | `PRE-PRODUCTION.md`, "Declaração — o que a política de senha não alcança" | **opcional, declarado**: o upgrade tem custo ou teto (3.000 DAU no Spark). Critério 18 do `/test` da fatia 1 🔒 |
| 26 | 🆕 Marca por fork: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` nos projetos `app`, `web` e `api`, logo numa URL `https` pública, ícones do produto no lugar dos padrões | `PRE-PRODUCTION.md` §13 (`:723-734`, era `:716-727` até a PR #47) | **aberto**, entrou com a PR #30. Sem ela, o produto sobe com o nome `next-boilerplate`; não bloqueia nada. Desde a PR #33, sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL` o aviso de troca de e-mail sai sem a linha de suporte, que é o canal para contestar (`PRE-PRODUCTION.md` §3) |
| 27 | 🆕 Custo e latência da leitura de sessão em cada requisição autenticada | *(só neste arquivo)*; a declaração de sessões do `PRE-PRODUCTION.md` (`:831`, era `:824` até a PR #47) fala da recusa, não do custo | **aberto**, entrou com a PR #39. Toda requisição autenticada lê o documento da sessão antes do guard (`session-tracker.ts:106-134`), além da leitura do perfil. No emulador, `GET /auth/session` p50 9,3 ms; em produção, latência e consumo da cota de leituras do Firestore não foram medidos (🔒 no `/test`) |

A 21 foi fechada pelo usuário em 2026-09-25. A 18 fechou pela metade em 2026-09-29, e a 12 em 2026-09-30. A 4 foi medida no projeto de desenvolvimento em 2026-09-30. A 23 cresceu com as PRs #27, #28, #32, #33, #38 e #47; a 24 e a 25 vieram da PR #29; a 26, da PR #30, e ganhou peso com a #33. A 13 ganhou um 🔒 com a #33, e a 24, um com a #36. A 27 veio da PR #39.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

> **Em 2026-10-16, duas linhas saíram daqui** porque a descoberta as reabriu com argumento novo, escrito no topo de
> cada spec: "Notificações in-app + preferências" (3/10, "Esforço G à mão; a referência terceiriza num serviço
> pago") virou [`in-app-notifications`](in-app-notifications.md), com 4/10 remedido e corte sem preferências nem
> tempo real; "Consertar o formulário de contato da landing" ("Não é spec, é achado") virou
> [`contact-support-channel`](contact-support-channel.md), com 2 de 4 starters verificados e dois consumidores
> novos no core. Entraram nove linhas novas, marcadas com a data.
>
> **Em 2026-10-04, a linha "Tela de sessões e dispositivos ativos" saiu daqui**: virou a fatia 2 de
> [`account-security-mfa`](account-security-mfa.md), entregue pela PR #39.
>
> **Em 2026-09-26, cinco linhas saíram daqui** porque viraram spec ou foram absorvidas:
> gate por plano → [`plan-entitlements`](../docs/features/plan-entitlements/spec.md), entregue em 2026-10-04 (o bloqueio em `past_due`, trial, cupom,
> reembolso e faturas em UI própria voltaram como linha própria abaixo); RoPA, incidente, DPA e transferência
> internacional → [`compliance-docs-kit`](../docs/features/compliance-docs-kit/spec.md), entregue em 2026-09-30; troca de e-mail →
> [`account-email-change`](../docs/features/account-email-change/spec.md), entregue em 2026-09-29; emulador de Storage e testes de rules →
> [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md), entregue em 2026-09-28 ("promover admin pela UI" saiu porque já
> existe: campo de tipo no formulário de edição de usuário, `users/[id]/route.ts:135-136`, que desde a PR #37 trava o tipo do próprio perfil); task de teste do
> design system → [`accessibility-conformance`](../docs/features/accessibility-conformance/spec.md), entregue em 2026-09-29.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Bloqueio em `past_due` · trial, cupom, reembolso e faturas em UI própria · nome do plano traduzido** | — | Fora do corte de [`billing-subscription`](../docs/features/billing-subscription/spec.md) e de [`plan-entitlements`](../docs/features/plan-entitlements/spec.md). O Customer Portal cobre trial, cupom, reembolso e faturas; o bloqueio por situação é decisão de produto de cada fork. |
| 🆕 2026-10-16 **App instalável (manifest de PWA) · push no navegador** | 0 de 4 páginas de features lidas mencionam | O Next.js gera o manifest nativamente e HTTPS basta para instalar (doc do Next, atualizada em 2026-07-30); os ícones já vêm de `brand-config`. Sem sinal de mercado, é decisão de fork e cabe numa tarefa P quando alguém pedir. Push exige chaves VAPID e coleção de inscrições, custo que todo fork herdaria. |
| 🆕 2026-10-16 **Aviso global do admin para todos os usuários · modo manutenção** | 0 de 4 páginas lidas mencionam | Sem prevalência. Se `in-app-notifications` entrar, o aviso para todos vira extensão dela (está no "Fora do corte" de lá). |
| 🆕 2026-10-16 **Convite de usuário pelo admin, no lugar da senha definida pelo admin** | não medido nos starters | O plugin de admin do Better-Auth cria usuário com senha, como este repositório (`users/route.ts:63`); o Clerk tem convite de aplicação por e-mail. Convite com link e expiração é o mesmo mecanismo dos convites de [`teams-organizations`](teams-organizations.md), `deferred`; desenhar agora um convite sem organização arrisca dois modelos. |
| 🆕 2026-10-16 **Lixeira e restauração de registros** | não medido (starters não trazem CRUD de domínio) | O soft delete existe (`base.repository.ts:225-227`) e `findById` ignora registro apagado. Restaurar é decisão de produto de cada fork sobre o próprio recurso. |
| 🆕 2026-10-16 **Seleção múltipla e ações em massa nas listagens · exportar a listagem do usuário** | não medido | O `Table` repassa as props do Antd, então `rowSelection` já passa (`table.tsx:11-12`, `:157`), e o repositório base tem `deleteBulk` sem rota (`base.repository.ts:190`). Vira tarefa do fork quando a listagem dele pedir; a exportação do admin já está descartada acima. |
| 🆕 2026-10-16 **Aviso de pagamento pendente fora da aba de cobrança** | — | A aba já mostra o aviso (`AccountBillingPanel.tsx:146-150`). Levá-lo a qualquer tela é um dos dois produtores do corte de `in-app-notifications`; sozinho, seria um banner a mais sem lugar comum. |
| 🆕 2026-10-16 **Exemplo de IA (chat, integração com LLM)** | 2 de 4 páginas lidas (Supastarter, Open SaaS) | Arrasta chave e custo por uso de um provedor pago para todo fork, e o caso de uso é do produto. Moda com vida útil incerta; fica com o fork. |
| 🆕 2026-10-16 **Passkeys · código de acesso por e-mail (OTP)** | 2/10 (Makerkit com os dois desligados por padrão; Supastarter com passkeys) | Passkeys já estão fora do corte de [`account-security-mfa`](account-security-mfa.md). Suporte nativo no Firebase a nenhum dos dois foi confirmado nesta rodada; o login sem senha fica com [`magic-link-sign-in`](magic-link-sign-in.md). |
| 🆕 2026-10-16 **Preferências de fuso horário e de e-mail · descadastro (unsubscribe)** | não medido | O fuso já é detectado no navegador e vai em cookie (`DisplayTimeZoneProvider.tsx:37-51`). O core só manda e-mail transacional, que não pede descadastro; o fork que mandar e-mail de marketing traz o mecanismo junto. |
| 🆕 **Jobs agendados (Vercel Cron) para expurgo e retenção** | — | Avaliado em 2026-09-26. Não há job concreto que o core precise rodar: o expurgo da trilha depende do prazo de retenção (E5) e o TTL de `paymentEvent` já é nativo do Firestore. Infra sem consumidor vira código morto. Reabrir quando E5 for decidida. |
| 🆕 **Exportar tabelas do admin em CSV** | não medido | Avaliado em 2026-09-26. Nenhuma tabela exporta hoje e nenhuma referência do painel foi verificada. Sem prevalência, é decisão de fork. |
| 🆕 **Aceite de termos e privacidade registrado no cadastro** | não medido | Avaliado em 2026-09-26. O aviso de privacidade é dever de informação (LGPD art. 9º), não consentimento; aceite de termos é decisão contratual de cada fork. Um link para os dois documentos junto ao botão de cadastro é achado P, não spec. |
| 🆕 **Avisos de segurança por e-mail (senha trocada, sessões encerradas, login novo)** | — | Avaliado em 2026-09-26. É o requisito 6.3.7 da ASVS 5.0.0, **nível 3** (6.3.5, login suspeito, também é nível 3). O aviso ao endereço antigo entrou em [`account-email-change`](../docs/features/account-email-change/spec.md), entregue pela PR #33, por ser barato; o resto espera pedido. |
| 🆕 **OpenAPI / documentação da API gerada** | — | Avaliado em 2026-09-26. O SDK é o contrato e a única porta para a API (regra de ouro 1); um segundo contrato gerado envelhece junto. Vale só se o produto for uma API, como as API keys. |
| 🆕 **Banir usuário pelo admin** | 4/10 (admin) | Já existe como desativar: `disabled` no `PUT /users/[id]` (`user-admin.schema.ts:21`, `users/[id]/route.ts:144-153`) e o switch da listagem (`UsersListClient.tsx:111-139`). Desde a PR #35, desativar também corta o bearer e revoga as sessões na hora; desde a PR #37, o admin não desativa a si mesmo. |
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
| Command palette (⌘K) | 2/10 | Valor estético. |
| Metering / limites de uso / créditos | 2/10 | Fora do corte de `plan-entitlements`, entregue em 2026-10-04 com o gate por status e por recurso, sem contagem de uso. |
| Feature flags | 2/10 | Variável de ambiente basta num MVP; `ONBOARDING_ENABLED` é o exemplo mais recente. |
| Firebase App Check | — | Exige configuração de projeto por fork. |
| Waitlist / captura de lead | 2/10 | Decisão do fork. |
| **Migrar a listagem de usuários para o cursor** | — | O N+1 de `userRepository.list()` vem primeiro. |
| **Detector de teste instável no CI** | — | O primeiro caso foi consertado na PR #22. Em 2026-09-28 apareceu um segundo, de causa diferente, só local (`useListAuditEvents.test.tsx`, 2 falhas em 47 execuções locais até 2026-10-16, pós-PR #47; ver achados), e o CI passou. O critério de reabertura era um segundo *flake* **no CI**; este ainda não conta. Consertar o teste é tarefa direta P. |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale nas 30 últimas execuções do CI na `main`, até `dd31a95` (`gh run list --branch main --limit 30`, todas `success`, remedido em 2026-10-16 pós-PR #47). Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | A cobertura já é medida e consolidada (`pnpm coverage`, job `coverage` do CI), pela PR #26. O limiar ficou fora do corte de [`e2e-testing`](../docs/features/e2e-testing/spec.md); reavaliar depois de algumas medições. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
