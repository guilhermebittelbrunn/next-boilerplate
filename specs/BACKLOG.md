# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última rodada:** 2026-10-14 (`/spec --sync`, pós-merge da PR #44; medições de 2026-10-14, entre 11:26 e 11:40 BRT) · **anteriores:** 2026-10-13 (PR #43) · 2026-10-08 (PR #42) · 2026-10-07 (PR #41) · 2026-10-07 (PR #40) · 2026-10-04 (PRs #37, #38 e #39) · 2026-10-03 (PR #36) ·
> 2026-09-30 (PR #35) · 2026-09-30 (PR #34) · 2026-09-30 (PR #33) · 2026-09-29 (PR #32) · 2026-09-29 (PR #31) · 2026-09-28 (PR #30) · 2026-09-27 (PR #29) · 2026-09-26 (`/spec` de descoberta, pedida pelo usuário) · 2026-09-26
> (PR #28) · 2026-09-25 (PRs #26 e #27) · 2026-09-25 (PR #25) · 2026-09-24 (PR #24) · 2026-09-23 (PR #23) ·
> 2026-09-23 (PR #22) · 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) ·
> 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 ·
> 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) ·
> 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **A PR #44 (`fa7041b`) entregou a recomendação #1 da rodada anterior.** `date-input-locale` fechou os seis
>    itens do critério de pronto no código: o `DateInput` mostra o placeholder do dicionário e formata a data no
>    idioma da URL, e o `Calendar` mostra mês, dias da semana, navegação e seletor de mês no idioma ativo, sem mudar o
>    valor gravado. Levou junto a data do formulário de contato da web. Detalhe em
>    [Entregas desta rodada](#entregas-desta-rodada-pr-44).
> 2. **Nenhuma transição de status.** A PR #44 alterou código em `packages/design-system`,
>    `packages/internationalization` e `apps/web`, fora dos arquivos que as três specs vivas citam ou declaram em
>    `contends_on`. O status delas foi reconferido mesmo assim (ver [Deriva](#deriva)).
> 3. **A PR #44 levou junto a auditoria anterior (pós-PR #43)**, pela sexta vez, e saiu da branch
>    `fix/date-input-locale`, sem `<project>`. O `STATE.md` dela ficou com `review: in-progress` depois do merge.
>    **A contagem desse estado estava errada:** a rodada anterior dizia seis `STATE.md`; lendo os 41, são 15. Os dois
>    registros estão em E11, sem pergunta nova.
> 4. **Gates remedidos com `--force` e JDK 21:** 30/30 tasks em 1 min 13,7 s, 876 arquivos no `pnpm check`,
>    **2869** testes em 263 arquivos (+19, todos da PR #44) e 186 contra o emulador. CI verde nos quatro jobs da
>    execução de merge (`gh run 38571621840`).
> 5. **Achados: 2 fechados, 4 novos, 2 ampliados, 108 abertos** pela soma (106 − 2 + 4). Fecharam o "Pick a date" e
>    a data e o calendário em inglês. Os novos vêm do plano e do `/test` da PR #44: o calendário que abre no mês
>    atual, a hidratação da `/contact` com fuso diferente, o `initialFocus` obsoleto e o `data-day` no formato do
>    navegador. Detalhe em [Achados](#achados-correções-pontuais-não-specs).
> 6. **Âncoras.** Nenhuma spec viva nem nota de `research/` cita arquivo alterado pela PR #44. Neste arquivo, a âncora
>    do rótulo de data do formulário de contato desceu uma linha (`:72` → `:73`). A PR #44 corrigiu a âncora do
>    `docs/PRE-PRODUCTION.md:416` que a rodada anterior registrou, e esta rodada mediu uma que tinha ficado de fora,
>    `docs/RESEARCH-tanstack-vs-next.md:40` (ver [Contradições](#contradições-doc--código-medidas-nesta-rodada)).
> 7. **Nenhuma pergunta nova; uma estacionada (E14).** A sugestão de rodar o `/spec` de descoberta apareceu em cinco
>    auditorias seguidas e saiu do relatório. Pelo mesmo motivo (§5.1), os candidatos a #1 que repetiam o motivo de
>    não escolha desde 2026-10-07 deixaram de ser listados um a um.
> 8. **Nenhuma spec elegível**, pela sexta rodada seguida. A recomendação de #1 é outra tarefa direta, nos mesmos
>    componentes: o calendário abrir no mês da data, o campo de nascimento do CRUD de referência ganhar seletor de
>    mês e ano, e a `/contact` parar de quebrar a hidratação.
> 9. **Segunda passada do mesmo dia (2026-10-14, 12:40 BRT), sem merge novo.** O `HEAD` segue em `fa7041b`. O working
>    tree ganhou a tarefa direta `date-input-navigation`, que era a recomendação #1 acima, com `/analyze`,
>    `/develop`, `/review` e `/test` feitos (12 ✅, 0 ❌, 1 🔒). Ela **não está mergeada**, então nada fecha nesta
>    passada: três achados da PR #44 ficam marcados como "fechado no working tree, pendente de merge", e o
>    `data-day` segue aberto. Os gates não foram remedidos (`cycle-policy` §4); os números citados são os do `/test`
>    dela. Achados: 2 novos (um já fechado no mesmo working tree), 1 ampliado, **110 abertos** pela soma, dos quais 4
>    fechados no working tree. A recomendação de #1 passou a ser a próxima tarefa, nos primitivos de formulário do
>    design system. Detalhe em [Em andamento no working tree](#em-andamento-no-working-tree-não-mergeado).
>10. **Terceira passada do mesmo dia, também sem merge.** O working tree ganhou `form-field-focus-and-names`, a
>    recomendação da segunda passada, com 10 ✅, 0 ❌ e 0 🔒 no `/test`, depois de uma volta ao `/review` para corrigir
>    o Enter repetido que a própria tarefa abriu. Cinco achados ficam ◐ e seis entram novos (**116 abertos**, nove ◐).
>    Os gates seguem citados do `/test`: `pnpm test` da raiz 15/15 e `pnpm e2e` 22/22. A recomendação de #1 passou
>    para o header da landing: o botão do menu mobile sem nome e a rolagem horizontal em telas médias e grandes.

## Contadores

Sobre as **3 specs que seguem em `specs/`**. Recontados do disco em 2026-10-14, pós-PR #44, lendo o
frontmatter de cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 0 |
| `approved` | 0 |
| `in-progress` | 2 |
| `done` (arquivadas) | 26 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `confianca` 1 (`in-progress`) · `dx` 1 (`in-progress`) · `produto` 1 (`deferred`).
**Por esforço:** M 2 · G 1. **Por valor:** alto 2 · médio 1 · baixo 0.

**Transições aplicadas: 0.** A PR #44 não tocou nenhuma das três specs vivas (`git diff --name-only 7fb2fe9
fa7041b -- specs/` devolve só este arquivo) nem código da área delas, e a releitura do código não achou item do
corte entregue por tabela.
Nada foi movido nem preparado no índice do git; as edições desta rodada estão só no working tree, neste arquivo.
Nada foi commitado.

> **A fila elegível está vazia.** `account-security-mfa` e `observability-logging` estão `in-progress` sem feature
> em andamento, e `teams-organizations` está `deferred`. Nenhuma spec `proposed` ou `approved` sobrou.

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
| [`date-input-locale`](../docs/features/date-input-locale/STATE.md) | #44, `fa7041b`, 2026-10-14 | 🟡 "Pick a date" cravado no `DateInput`; 🟡 a data escolhida, o calendário e o seletor de mês em inglês em qualquer idioma; e, sem linha prévia neste arquivo, a data do formulário de contato da web também em inglês. Detalhe em [Entregas desta rodada](#entregas-desta-rodada-pr-44) |

As tabelas de conferência item a item das PRs #28, #35 e #36 ficaram na versão deste arquivo em `02c31b5` (a PR
#37 levou a auditoria pós-PR #36 junto); as das PRs #37, #38 e #39, na versão em `5f4a8e9` (a PR #40 levou a
auditoria pós-PR #39 junto); a da PR #40, na versão em `0a49a3b` (a PR #41 levou a auditoria pós-PR #40 junto); a
da PR #41, na versão em `dbcac2a` (a PR #42 levou a auditoria pós-PR #41 junto); a da PR #42, na versão em
`7fb2fe9` (a PR #43 levou a auditoria pós-PR #42 junto); as duas da PR #43, na versão em `fa7041b` (a PR #44 levou
a auditoria pós-PR #43 junto). As seis versões estão em `main`, e as pastas das features guardam o resto.

## Entregas desta rodada (PR #44)

A PR #44 entrou em `main` em 2026-10-14 às 13:25 UTC (10:25 no horário de Brasília), com os quatro checks verdes na
PR (`gh pr view 44`) e na execução de merge, `gh run 38571621840`, no SHA `fa7041b`: `success` em `changes`,
`verify`, `coverage` e `e2e`. A branch `fix/date-input-locale` tinha seis commits: a auditoria do backlog pós-PR
#43, a correção da âncora do `docs/PRE-PRODUCTION.md`, a folha de i18n, o design system, a web e os artefatos da
feature. O squash juntou os seis num só.

`git diff --stat 7fb2fe9 fa7041b`, fora de `docs/features` e `specs`: 10 arquivos. Código em
`packages/design-system` (`components/ui/date-input.tsx`, `components/ui/calendar.tsx` e o módulo novo
`lib/calendar-locales.ts`), em `packages/internationalization` (a folha nova `translations/components/ui/date-input.ts`
e o índice) e em `apps/web` (`contact/components/contact-form-client.tsx`). Testes: dois arquivos novos,
`dateInputLocale.test.tsx` no design system e `contactFormDateLocale.test.tsx` na web. Um documento fora das pastas
das features mudou: `docs/PRE-PRODUCTION.md:416`, que agora cita `sidebar.tsx:29` (a âncora que a auditoria
anterior tinha registrado como deslocada).

Para encurtar, `<ds>` é `packages/design-system/components/ui` e `<teste>` é
`packages/design-system/__tests__/dateInputLocale.test.tsx`.

### `date-input-locale` (PR #44, tarefa direta)

Era a recomendação #1 da auditoria pós-PR #43. Conferência contra o critério de pronto que ela escreveu:

| o que a recomendação pedia | o que o código mostra |
|----------------------------|-----------------------|
| (1) sem valor e sem `placeholder` do chamador, o placeholder do dicionário nos três idiomas; o `placeholder` do chamador continua vencendo | o default `"Pick a date"` saiu (`<ds>/date-input.tsx:53`), e o botão mostra `placeholder ?? dictionary.components.dateInput.placeholder` (`:91`), lido com `getDictionary()` (`:58`). A folha `translations/components/ui/date-input.ts:1-11` traz "Escolha uma data", "Pick a date" e "Elige una fecha", ligada em `translations/components/index.ts` nos três blocos. Casos `<teste>:108` (dicionário), `:124` (texto do chamador) e `:130` (placeholder vazio de propósito). O `/test` mediu os três textos em `/entities/create` e os dois filtros da `/admin/audit` com o `datePlaceholder` da tela |
| (2) com data, o botão formata no idioma da URL | `format(selected, "PPP", { locale: calendarLocales[locale] })` em `<ds>/date-input.tsx:90`. Caso `<teste>:116`. O `/test` mediu "17 de abril de 1990", "April 17th, 1990" e "17 de abril de 1990" no `/edit` de uma entidade do seed |
| (3) mês, dias da semana e rótulos de navegação no idioma ativo, acompanhando a troca sem recarregar; um `locale` do chamador continua vencendo | `calendarLocales` mapeia os três idiomas para `ptBR`, `enUS` e `es` de `react-day-picker/locale` (`packages/design-system/lib/calendar-locales.ts:5-9`, com `satisfies Record<Locale, DayPickerLocale>`). O `Calendar` lê o idioma com `getDictionary()` (`<ds>/calendar.tsx:39-40`), passa `locale={calendarLocale}` (`:200`) antes do `{...props}` (`:202`) e formata o seletor de mês pelo `dateLib` do DayPicker (`:192-197`), não mais pelo idioma do navegador. Casos `<teste>:138`, `:157` (troca sem remontar), `:175` (locale do chamador vence) e `:184` (seletor de mês). O `/test` mediu legenda, navegação e cabeçalho da semana nos três idiomas e a troca pt-br → en → es → pt-br com um marcador em `window` que sobreviveu, com o popover fechado e aberto |
| (4) o valor gravado continua `yyyy-MM-dd`, sem mudar schema nem API | o `onSelect` não mudou (`<ds>/date-input.tsx:97-99`). Caso `<teste>:205`. O `/test` gravou e releu `"birthdate":"2026-10-20"` pela API contra o emulador, em es |
| (5) teste que falha com o código atual | 16 casos (10 `it` com `each`). Mutação registrada no handoff: com `calendar.tsx` e `date-input.tsx` do `HEAD` anterior, 10 de 16 reprovam; com o `locale` depois do `{...props}`, 1; com o `formatMonthDropdown` antigo, 1. Na web, `contactFormDateLocale.test.tsx` (3 casos) reprova 2 de 3 com o arquivo anterior |
| (6) `pnpm check`, `typecheck` e a suíte verdes, e o `/test` nos três idiomas e nos dois temas em build | 8/8 critérios ✅ no `/test`, com `app` e `web` em `next build && next start`, a API em `next dev` (o build de produção dela exige credencial do Firebase Admin) e o emulador; claro, escuro e 390 px. Gates remedidos nesta auditoria (abaixo) |

**Veredito:** fechado. Além do pedido, o formulário de contato da web passou a formatar a data no idioma da página
(`apps/web/app/[locale]/contact/components/contact-form-client.tsx:90-94`, com `calendarLocales` e o `locale` de
`getDictionary()` em `:20`), decisão P1 do plano, e o `/review` tirou o `calendarLocales` de dentro do módulo
`"use client"` do `Calendar` para `lib/calendar-locales.ts`, porque a web o importa num componente próprio.
`git grep "Pick a date"` em `apps` e `packages`, fora de testes, nesta auditoria: só a folha `en` nova e o
`datePlaceholder` em inglês da trilha (`translations/apps/app/pages/admin/auditTrail.ts:72`), que é o caso que
prova a precedência do chamador e ficou de propósito (§1.3 do plano). Os achados que a tarefa mandou para o backlog
estão em [Achados da PR #44](#-achados-da-pr-44-2026-10-14).

O `STATE.md` não acompanhou o merge: `review` segue `in-progress`, e as notas citam `specs/BACKLOG.md:230-272`, da
versão anterior a esta rodada (E11).

## Em andamento no working tree (não mergeado)

Registrado na segunda e na terceira passada de 2026-10-14. **Entregue, para esta auditoria, exige PR mergeada em
`main` e CI verde no SHA de merge.** As duas tarefas abaixo existem só no working tree do workspace `stockholm` (`HEAD` em `fa7041b`, nada
commitado, índice vazio), então os achados que elas resolvem ficam abertos, marcados como fechados no working tree
e pendentes de merge. A próxima auditoria depois do merge confere de novo no código de `main` e só então os fecha.

### `date-input-navigation` (tarefa direta, no working tree)

Era a recomendação #1 da primeira passada desta rodada. `STATE.md`: `analyze`, `develop`, `review` e `test` em
`done`, `branch` "fix/date-pickers-and-form-fields (recomendada para a PR das duas tarefas, a renomear a partir de
guilhermebittelbrunn/cycle-command-v4)" (corrigido na terceira passada; a segunda citava `fix/date-input-navigation`,
que o `STATE.md` trocou quando a segunda tarefa entrou na mesma PR).
Arquivos no working tree: `packages/design-system/components/ui/date-input.tsx`, `EntityFormFields.tsx`,
`contact-form-client.tsx`, `AGENTS.md`, o teste reescrito `apps/web/__tests__/contactFormDateLocale.test.tsx` e três
testes novos (`dateInputNavigation.test.tsx` no design system, `auditFiltersDateInput.test.tsx` e
`entityBirthdateField.test.tsx` na app). Conferência contra o critério de pronto, lendo o working tree:

| o que a recomendação pedia | o que o working tree mostra |
|----------------------------|-----------------------------|
| (1) com valor, o calendário abre no mês da data; sem valor, no mês atual | `defaultMonth={selected}` em `date-input.tsx:101`, para todos os consumidores. O `/test` abriu o `/edit` da entidade do seed em `abr`/`1990` e, depois de escolher 11/09/2001, reabriu em `set`/`2001`, também depois de recarregar |
| (2) seletor de mês e ano no nascimento de `entity`, nos três idiomas, cobrindo cem anos; quem não pede o seletor fica como está, sem limite | o `DateInput` aceita `captionLayout`, `startMonth` e `endMonth` opcionais (`date-input.tsx:40`, `:55-57`, `:100-109`), e só o nascimento passa `captionLayout="dropdown"` (`EntityFormFields.tsx:155`). O `/test` contou 101 anos (1926 a 2026) nos três idiomas, com os rótulos do locale do react-day-picker. Nos filtros da trilha, o calendário abriu sem `<select>` e avançou seis meses além de outubro de 2026 sem `aria-disabled` (`auditFiltersDateInput.test.tsx`, novo) |
| (3) valor gravado continua `yyyy-MM-dd` | `date-input.tsx:105`, sem mudança. O `/test` gravou e releu `2001-09-11` e `1990-04-17` pela API contra o emulador |
| (4) `/contact` sem #418 com fusos diferentes, sem `initialFocus`, com o rótulo nomeando o botão | o bloco de data feito à mão deu lugar ao `DateInput` (`contact-form-client.tsx:71-72`), com o estado começando vazio (`:13`) e `id="date"` ligado ao `<Label htmlFor="date">` (`:65`). `git grep initialFocus` em `apps` e `packages` no working tree: 0. O `/test` subiu a web com `TZ=Pacific/Kiritimati` e o navegador em `America/Sao_Paulo`: zero erros em `/pt-br`, `/en` e `/es/contact` |
| (5) teste que falha com o código atual | o handoff registra 17 testes novos ou reescritos, 16 reprovando no código anterior. Os quatro casos que o `/test` acrescentou não rodaram contra o código antigo; o relatório diz isso |
| (6) gates verdes e `/test` em build | `/test`: `pnpm check` 879 arquivos sem erro; `pnpm test` da raiz 15/15 tasks com JDK 21, 13 do cache; design system 146 testes em 11 arquivos, app 845 em 105, web 95 em 16; `api:test:emulator` 186 em 4. App e web em `next build && next start`, claro, escuro, 390 px. 1 🔒: a lista nativa do `<select>` no escuro, que o navegador headless não desenha |

**Veredito: fechado no working tree, pendente de merge.** Os números acima vêm do `/test` da tarefa e não foram
remedidos nesta passada: o código mudou depois dos gates da primeira passada, mas o `/test` já rodou a suíte inteira
depois do diff, e a `cycle-policy` §4 manda citar em vez de remedir. Desvio registrado no `STATE.md`: a `/contact`
passou a usar o `DateInput` em vez de receber três remendos, e o teste SSR dela foi reescrito porque a data de hoje
pré-selecionada saiu de propósito. Ficaram fora do corte, com motivo no plano: o `data-day` e limitar o nascimento a
datas passadas, que é regra de produto (pergunta P2 do plano, adotada sem mudar o schema).

O `/test` também registrou que o texto do plano (§9 e §10) diz duas coisas que o código não faz: clicar no rótulo
"foca" o botão (na verdade abre o calendário) e o campo de nascimento "continua desabilitado" sob personificação
(`EntityFormFields.tsx` não passa `disabled`; o bloqueio fica no botão de salvar). O código está certo, e o `/test`
corrigiu os dois textos em `test/criterios-aceite.md`; o plano ficou como estava (ver Contradições).

### `form-field-focus-and-names` (tarefa direta, no working tree)

Era a recomendação #1 da segunda passada. `STATE.md`: `analyze`, `develop`, `review` (duas rodadas) e `test` em
`done`; mesma branch recomendada da tarefa acima, porque as duas vão na mesma PR. Arquivos no working tree:
`hookformInputPassword.tsx`, `hookformInput.tsx` (desvio do plano: o mesmo problema no campo de texto comum), o hook
novo `useSubmitEnterGuard.ts`, `radio-group-input.tsx` e `button.tsx` no design system; `Footer.tsx` e
`PageFormFooter.tsx` na app, que perderam o contorno do `disabled` (correção na raiz, `cycle-policy` §3); uma linha
no `AGENTS.md`; quatro testes novos (`hookformSubmitReadOnly`, `hookformEnterResubmit` e `radioGroupInput` no design
system, `signInEnterResubmit` na app) e três editados (`button.test.tsx`, `hookformInputPassword.test.tsx`,
`sharedFooterPendingState.test.tsx`). A recomendação previa só `packages/design-system`; a tarefa também tocou
`apps/app`, nos dois footers. Conferência contra o critério de pronto, lendo o working tree:

| o que a recomendação pedia | o que o working tree mostra |
|----------------------------|-----------------------------|
| (1) durante o envio, o campo de senha não recebe `disabled`, não aceita digitação e mantém o foco depois da recusa, no login das duas apps e nos dois diálogos | `readOnly={formState.isSubmitting}` no lugar de `disabled` (`hookformInputPassword.tsx:83`; e `hookformInput.tsx:77`). O `/test` mediu em build: Enter com senha errada no login da app e da web deixa `activeElement` no campo, sem `focusout`; nos diálogos de exclusão e de troca de e-mail, o foco volta à senha com o texto selecionado; `readonly` liga cerca de 2 ms depois do `submit`, e `disabled` nunca aparece |
| (2) o `placeholder` do chamador vence o padrão | o padrão vem antes do `{...rest}` (`hookformInputPassword.tsx:82`). Casos novos em `hookformInputPassword.test.tsx` |
| (3) o grupo de rádio tem nome igual ao rótulo, nos três idiomas | `Label` com `id` (`radio-group-input.tsx:39`, `:44`) e `aria-labelledby` no grupo (`:49`). O `/test` leu `radiogroup "Gênero"`/`"Gender"`/`"Género"` em `/entities/create` e `"Tema"`/`"Theme"`/`"Tema"` nas preferências da conta |
| (4) o `Button` em carregamento mantém a largura, e `loading` trava mesmo com `disabled={false}` | conteúdo em `opacity-0` sob o spinner (`button.tsx:74-82`) e `disabled={loading \|\| disabled}` depois do `{...props}` (`:58`, `:72`). O `/test` mediu diferença de 0,000 px em oito botões, claro, escuro e 390 px, e `disabled` com `aria-busy` em todas as medições. Os dois footers da app passam só o `disabled` do chamador (`Footer.tsx:58`, `:66`; `PageFormFooter.tsx:38`) |
| (5) teste jsdom que falha no código atual | segundo o handoff e o `/review`, os testes novos reprovam no código anterior; os dois do R1 reprovam antes da correção (2 de 4, e 3 chamadas em vez de 1) |
| (6) gates verdes e `/test` em build, com o axe sem regra nova | citados do `/test` e do `/review`, não remedidos: `pnpm check` 884 arquivos; `pnpm test` da raiz 15/15; design system 171, app 846, web 95, api 1205, `test:emulator` 186; `pnpm e2e` 22/22 com a allowlist do axe vazia |

**O defeito que a própria tarefa criou, e a correção.** A primeira medição do `/test` reprovou o critério de Enter
repetido: com o campo em `readOnly`, ele continua focado, e dois Enter a 2 a 5 ms mandavam dois logins (na web, 7 de 8
rodadas). Com `disabled`, o campo deixava de receber tecla. A segunda rodada do `/review` acrescentou o
`useSubmitEnterGuard` (`packages/design-system/components/form/hookform/useSubmitEnterGuard.ts`), que barra o Enter
enquanto o envio corre e até um `setTimeout(0)` depois de ele terminar. Na remedição, 30 rodadas de Enter repetido
deram um `signInWithPassword` cada. A janela que o hook fecha depende de o React Query entregar o novo estado da
mutação por `setTimeout(0)`; isso entrou como achado (ver [Achados da PR #44](#-achados-da-pr-44-2026-10-14)).

**Veredito: fechado no working tree, pendente de merge.** 10 ✅, 0 ❌, 0 🔒 no `/test`. Uma ressalva de método do
`/test`: o `press` do `agent-browser` solta a tecla no mesmo instante, e o Radix só marca a opção do grupo de rádio
enquanto a seta está pressionada; com `keydown`, 150 ms e `keyup`, marca. É limite da ferramenta, não defeito do
produto, e fica registrado aqui para quem medir grupos de rádio no navegador.

## Gates medidos nesta auditoria

Medidos na primeira passada, antes das duas tarefas existirem no working tree. A segunda e a terceira passada não
remediram; os números do working tree estão na [seção delas](#em-andamento-no-working-tree-não-mergeado).

Executados em 2026-10-14, às 11:32 BRT, com `--force`, neste workspace, com o `HEAD` em `fa7041b` (igual a
`origin/main`) e o working tree com só as edições desta auditoria em `specs/BACKLOG.md`. Não copiados do `/test` nem
da rodada anterior.

O workspace estava sem `node_modules`. A primeira tentativa de `pnpm install` usou o binário `~/.local/bin/pnpm`, que
é x86_64 e roda sob Rosetta: ele baixava os pacotes nativos `darwin-x64` (`@next/swc`, `@biomejs/cli`, `sharp`) a
7 KiB/s e foi interrompido. O `pnpm install --frozen-lockfile --prefer-offline` com o pnpm 10.19.0 do corepack, sob o
Node arm64, terminou em 36,5 s, e os gates abaixo rodaram com esse pnpm no `PATH`. Não é defeito do repositório, mas
explica por que uma rodada nova pode travar antes do primeiro gate.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **876 arquivos · 0 erros** (`No fixes applied`, 377 ms). Os três arquivos a mais são os dois testes novos e a folha de i18n da PR #44; o `lib/` do design system fica fora do Biome |
| `pnpm turbo run lint typecheck test test:emulator --force`, com o JDK 21 de `/opt/homebrew/opt/openjdk@21` no `PATH` | ✅ **30/30 tasks · 0 em cache · 1 min 13,7 s**, na primeira execução; `api#test:emulator` **186 testes em 4 arquivos**; nenhum erro não tratado no log. Ao fim, nenhuma das portas de emulador (8080, 9099, 9199, 4000, 4001, 4400, 4500, 9150, 8085) ficou ouvindo |

O `uptime` antes da execução marcava load average 4,1 no minuto; logo depois, 17,9 no minuto e 9,0 em cinco. A
duração ficou abaixo das rodadas anteriores (1 min 25,2 s, 1 min 25,8 s e 1 min 23 s), com a carga inicial menor. São
14 configs de workspace com `testTimeout`, todas; o `vitest.config.mts` da raiz, que só consolida a cobertura, não
tem.

O log do `@repo/design-system` segue trazendo, no stderr do caso `componentCopy.test.tsx` "nomeia os dois botões de
fechar do Dialog", o aviso do React `In HTML, <button> cannot be a descendant of <button>` (uma ocorrência). Não
reprova a task; é o `DialogFooter` com `showCloseButton`, achado aberto em
[Achados da PR #43](#-achados-da-pr-43-2026-10-09).

**O teste instável de `useListAuditEvents` não apareceu** (3 execuções da suíte da `apps/app` nesta rodada, a do
turbo e mais duas com `pnpm --filter app test`, 841 testes cada). O acumulado fica em 2 falhas em 44. O arquivo não
muda desde a PR #18; o achado continua aberto.

| workspace | arquivos | testes | Δ vs. 2026-10-13 pós-PR #43 |
|-----------|---------:|-------:|-----------------------------|
| `api` | 93 | 1205 | — |
| `app` | 103 | 841 | — |
| `@repo/email` | 7 | 202 | — |
| `@repo/design-system` | 10 | 132 | **+1** arquivo, **+16** testes, em `dateInputLocale.test.tsx` (novo) |
| `@repo/auth` | 10 | 127 | — |
| `web` | 16 | 93 | **+1** arquivo, **+3** testes, em `contactFormDateLocale.test.tsx` (novo) |
| `@repo/internationalization` | 7 | 67 | — (a paridade da folha nova passa pelos testes que já existiam) |
| `@repo/security` | 3 | 45 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/next-config` | 1 | 32 | — |
| `@repo/payments` | 4 | 22 | — |
| `e2e` | 2 | 16 | — (testes unitários da suíte; os de navegador rodam no `pnpm e2e`) |
| `@repo/sdk` | 1 | 9 | — |
| **total** | **263** | **2869** | **+19** testes, **+2** arquivos, todos da PR #44 |
| `api#test:emulator` (fora da linha acima) | 4 | 186 | — |

Duas medições pedidas pelos achados, cada uma abaixo de um minuto:

- `pnpm turbo run typecheck --filter=app --dry=json`: o `app#typecheck` segue com `dependencies: []` e 290 inputs,
  nenhum de `packages/design-system`. O achado do `turbo.json:11-14` continua aberto.
- `tsc --noEmit` sobre os 21 arquivos de `packages/shared`, com um `tsconfig` temporário em `/tmp` que estende o
  `nextjs.json` do repositório (removido depois; nada foi gravado no pacote): **0 erros** nos arquivos do pacote e
  **2** `TS2580` (`Cannot find name 'process'`) em `packages/internationalization/utils.ts:22-23`, que o pacote importa,
  porque `packages/shared` não declara `@types/node`. É o tamanho medido do achado do `typecheck` adiado desde a
  primeira auditoria.

O `docs/PRE-PRODUCTION.md` §9 segue com a medição de 2026-09-30 (29/29 tasks, 806 arquivos, 2485 testes em 227,
170 contra emulador, 13 configs). O parágrafo data os números e manda remedir antes de citar, então está honesto;
só ficou para trás (ver [Contradições](#contradições-doc--código-medidas-nesta-rodada)).

CI: a execução de merge da PR **#44** (`gh run 38571621840`, SHA `fa7041b`) terminou em **`success`** nos quatro
jobs (`verify` em 3 min 51 s, `e2e` em 4 min 11 s). As 30 últimas execuções do CI na `main` (`gh run list --branch
main --limit 30`) estão verdes.

Branch protection segue **não ligado**, remedido hoje depois do merge da PR #44:
`gh api repos/:owner/:repo/branches/main/protection` → **404** ("Branch not protected"), `rulesets` → **`[]`**. O
repositório tem **44** PRs, nenhuma aberta.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Nenhuma spec está bloqueada por dependência**; as três estão paradas por decisão sua.

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | situação |
|---|----|----------|
| 1 | [`account-security-mfa`](account-security-mfa.md), **fatia 3** (segundo fator) | `in-progress`, 4 de 6 itens entregues (fatias 1 e 2, PRs #29 e #39). Nenhuma feature ativa e **fora do conjunto elegível** enquanto o status não mudar (E12, antiga D10). O preço do MFA no Identity Platform segue não confirmado, e a fatia exige ativar o recurso no projeto Firebase, então metade dos critérios ficaria 🔒 numa rodada autônoma |
| 2 | [`observability-logging`](observability-logging.md) | `in-progress`, 5 dos 6 itens. Estacionada (E1) |
| 3 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22. Estacionada (E2) |

**As recomendações da primeira e da segunda passada (`date-input-navigation` e `form-field-focus-and-names`) estão no
working tree, pendentes de merge** (ver [Em andamento no working tree](#em-andamento-no-working-tree-não-mergeado)).

**Recomendação para a próxima tarefa, na mesma PR: tarefa direta, sem spec, no header da `apps/web`.** Slug
sugerido: `web-header-reflow-and-menu-name`. Junta quatro achados abertos num arquivo só,
`apps/web/app/[locale]/components/header/index.tsx`, que nenhuma das duas tarefas do working tree tocou. O header é
a primeira coisa que todo fork mostra na landing, nos três idiomas, e os quatro achados são de acessibilidade e de
layout responsivo, no tema da PR.

- **O quê:**
  (a) O botão que abre o menu no celular (`index.tsx:261`) é um `Button` só com ícone (`Menu` ou `X`, `:262-266`), sem
  `aria-label` e sem `aria-expanded`, embora o estado exista (`isOpen`, `:80`). O leitor de tela anuncia "botão", sem
  nome (WCAG 4.1.2). Medido pelo `/test` da PR #32 a 390 px.
  (b) O header deslogado passa da largura: 6 px em pt-br e 49 px em es a 1024 px (`/test` de `brand-config`), e em es
  também a 1280 px (`scrollWidth` 1304, só o link "Registrarse" além da borda; `/test` de `date-input-navigation`).
  (c) O header logado rola na horizontal: 5 px a 1280 px e 29 px a 1024 px (`/test` da PR #28).
  A barra cheia aparece a partir de `lg` (`:85`, `:260`), e os itens da direita a partir de `md` (`:192-242`), então
  entre 1024 px e a largura em que tudo cabe a página rola de lado.
- **Por que agora:** são quatro linhas abertas, três delas desde setembro, no mesmo arquivo; a do menu sem nome é
  um controle visível sem nome acessível na landing que todo fork herda. Nenhum arquivo do working tree
  é tocado, o dicionário do header já existe (`translations/components/header/index.ts`), e a correção não pede
  dependência nem infraestrutura.
- **O limite de decisão:** a correção da rolagem não remove nada do header; ela muda a largura a partir da qual a
  barra cheia aparece, ou deixa os itens da direita quebrarem ou encolherem, e o que sai da barra continua no menu.
  Isso é escolha técnica de breakpoint, dentro do mandato do ciclo. Se o plano concluir que algum item precisa sair
  do header para caber, isso vira pergunta de produto, e a tarefa entrega só (a) com a medição do resto.
- **Tamanho:** P a M. Um arquivo de código, duas ou três chaves no dicionário do header nos três idiomas, e um teste.
- **Workspaces:** `apps/web` e `packages/internationalization`.
- **`contends_on` proposto:** `apps/web/app/[locale]/components/header/index.tsx`. A folha
  `packages/internationalization/translations/components/header/index.ts` é aditiva e fica fora do campo pela regra
  das traduções. Nenhum dos dois está em `git status`, e nenhuma spec viva os declara.
- **Critério de pronto:** (1) o botão do menu móvel tem nome acessível do dicionário nos três idiomas ("abrir menu" e
  "fechar menu", ou um nome fixo com `aria-expanded`) e `aria-expanded` igual a `isOpen` (`index.tsx:80`, `:261`); (2)
  em 1024, 1280 e 1440 px, logado e deslogado, nos três idiomas, `document.documentElement.scrollWidth` igual à largura
  da janela (hoje: 1304 em es a 1280 deslogado, +5 px a 1280 logado, +6 e +49 px a 1024 deslogado, +29 px a 1024
  logado); (3) nenhum link do header deixa de ser alcançável: o que sai da barra está no menu (`:268-300`); (4) a 390 px
  o header segue como hoje, com o menu abrindo e fechando; (5) teste jsdom que falha no código atual para (1); a
  rolagem só se mede no navegador, porque o jsdom não calcula layout, e isso fica dito no plano; (6) `pnpm check`,
  `typecheck`, a suíte e o `pnpm e2e` verdes, e o `/test` em build medindo (1) a (4), claro e escuro.

E1 e E12 seguem sendo as decisões que mais destravam o backlog (ver [Decisões estacionadas](#decisões-estacionadas-51)).

### O que **não** foi escolhido para #1, e por quê

Com motivo novo ou revisto nesta rodada:

- **Mudança de leitura sobre o header:** na segunda passada, o estouro do header em es ficou de fora por "pedir
  escolher o que o header recolhe, que é decisão de design". Relido nesta passada, nenhum item precisa sair: a
  correção é de breakpoint, com o menu cobrindo o que não couber. Junto com o botão sem nome e as duas outras linhas
  de rolagem no mesmo arquivo, passou a valer como tarefa. Se o plano provar o contrário, ele entrega só o nome do
  botão.
- **"(Código do erro: <uuid>)" em recusa esperada** (`handleClientError.ts:4-11`): medido nesta passada. O sufixo é
  deliberado desde a PR #15 e coberto por teste (`panelErrorRequestId.test.tsx:115`); escolher quais recusas o
  escondem é decisão de copy e de suporte. Descartado como tarefa do ciclo; ficou como achado.
- **Salvar as preferências em `/es` leva para `/pt-br`** (`AccountPreferencesForm.tsx:65`, `:89-99`): medido nesta
  passada. O formulário segue a preferência de idioma da conta, como projetado; começar pelo idioma da URL é decisão
  de produto. Descartado; ficou como achado.
- **Campo de nascimento atrás do rodapé a 390 px** (`Footer.tsx:47`, `sticky bottom-0`): o rodapé é `sticky`, então
  cobrir o fim do conteúdo sem rolar é o comportamento do padrão. O caso que importa é o foco do teclado ficar
  escondido atrás dele (WCAG 2.4.11), que ninguém mediu. Além disso, a correção provável mexe no `Footer.tsx`, que
  `form-field-focus-and-names` já alterou no working tree. Fica para medição primeiro.
- **Asterisco do `Label` no nome acessível** (`label.tsx:27`): P, mas latente, porque nenhum consumidor passa
  `required` aos quatro componentes que usam esse `Label`. Cabe de carona numa tarefa que torne um desses campos
  obrigatório.
- **Os outros seis `HookForm*` com `disabled` no envio:** lidos nesta passada; nenhum envia o formulário com Enter,
  então não perdem o foco por esse caminho (ver o achado do botão de enviar).
- **Foco que sai do botão de enviar** (`button.tsx:72`): a correção (`aria-disabled` no lugar de `disabled`) muda a
  semântica de todo botão e mexe num arquivo já alterado no working tree. Pede medição no navegador e tarefa própria.
- **`data-day` gravado com `toLocaleDateString()` do navegador** (`calendar.tsx:229`): sem efeito observável; um
  teste para ele criaria um contrato que ninguém consome.
- **`aria-describedby` órfão dos `HookForm*`, dica do `TextareaInput`, `DialogFooter` e `CommandDialog`**
  (`form.tsx:115-119`, `textarea-input.tsx:42-43`, `dialog.tsx:117-121`, `command.tsx:31-32`): o axe não reclama, ou
  o componente não tem consumidor no repositório.

**Os demais candidatos não mudaram de motivo desde 2026-10-07 e não são mais reapresentados** (§5.1): o cache do
`typecheck` do turbo, o contraste do seletor de tamanho da paginação, o `CommandDialog` em inglês, o 404 de arquivo
inexistente (O1 da PR #41), a query string perdida no proxy, `/auth/me` e `/auth/sign-in` sem `error.code` com o
webhook que responde 500 (A4), as rotas fora do rate limit e as âncoras de documento deslocadas. O motivo de cada um
está na linha do achado, em [Achados](#achados-correções-pontuais-não-specs).

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-10-14**, depois
da reconciliação dos status, a partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 0 de 3.** Fora ficam `account-security-mfa` e `observability-logging` (`in-progress`) e
`teams-organizations` (`deferred`). **Não há lote.**

A tarefa direta recomendada não é spec e não entra no cálculo. O `contends_on` proposto para ela
(`apps/web/app/[locale]/components/header/index.tsx`) é disjunto dos arquivos que `date-input-navigation` e
`form-field-focus-and-names` alteraram no working tree e do de `account-security-mfa` (quatro arquivos em `packages/auth` e `resolve-api-actor.ts`), de `observability-logging`
(`requestErrorReporter.ts`) e de `teams-organizations` (rota e repositório de `entity` na API, cliente do SDK,
`packages/auth/types.ts` e `firestore.indexes.json`), conferido no frontmatter do disco em 2026-10-14, pós-PR #44.
Os dez arquivos desses `contends_on` existem no disco. Se você destravar uma delas (E1, E2 ou E12), ela pode rodar
ao lado da tarefa direta.

`form-field-focus-and-names`, no working tree, tinha `contends_on` proposto de três arquivos do design system e
tocou os três, mais `hookformInput.tsx`, o hook novo `useSubmitEnterGuard.ts` e os dois footers da `apps/app`.

`date-input-navigation`, no working tree, tinha `contends_on` proposto de três arquivos (`date-input.tsx`,
`EntityFormFields.tsx`, `contact-form-client.tsx`) e tocou os três, mais `AGENTS.md` e os testes.

A tarefa direta da PR #44 tinha `contends_on` proposto de dois arquivos, `date-input.tsx` e `calendar.tsx`, e tocou
os dois, mais o formulário de contato da web (decisão P1 do plano, que o `STATE.md` já registrava), o módulo novo
`lib/calendar-locales.ts` (do `/review`) e a folha de i18n, que a regra deixa fora do campo.

As duas tarefas diretas da PR #43 rodaram em sequência no mesmo workspace e saíram num PR só. A auditoria propôs
para a primeira `AccountPrivacyPanel.tsx` e o teste dele, e foi o que ela tocou. A segunda não teve previsão da
auditoria: tocou os 30 arquivos de código, teste e i18n do PR, em quatro workspaces, dois deles os mesmos da
primeira, por isso o commit da `apps/app` sobre o `AccountPrivacyPanel.tsx` saiu misto, como o plano dela previa
(§13.8). Antes, `antd-theme-seed-colors` acertou os dois arquivos de código previstos, e `server-locale-from-url`
tocou quatro dos cinco previstos e mais quatro fora da lista.

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
tocou o `BACKLOG.md`. As PRs #40 a #44 tocaram, mas só para levar a auditoria anterior, feita num workspace só.

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte de
MVP, e o histórico mostra que ela erra para menos: `admin-billing-insights` declarou 5 arquivos e tocou 4;
`brand-config`, `storage-emulator-rules-tests`, `accessibility-conformance` e `account-email-change` tocaram de
12 a 31 arquivos de código fora da lista; as PRs #38 e #39, acima, dividiram seis arquivos sem declarar nenhum;
a tarefa direta da PR #41 tocou quatro dos cinco previstos e mais quatro fora. A da PR #42 acertou os dois arquivos
de código, a primeira da PR #43 acertou os dois previstos, e a da PR #44 tocou os dois previstos e mais dois arquivos
de código fora da lista. Nenhuma rodada registrou conflito de merge causado por esses erros.

## Precisam de decisão

**Nenhuma pergunta aberta nesta rodada.** As decisões que se repetem seguem em
[Decisões estacionadas](#decisões-estacionadas-51), com a mesma recomendação, e nenhuma spec mudou de status.

Resolvidos sem pergunta nesta rodada:

- **O CI no SHA de merge da PR #44** foi medido: verde nos quatro jobs (`gh run 38571621840`), e as 30 últimas
  execuções na `main` também.
- **Se o `DateInput` e o `Calendar` falam o idioma ativo** foi medido no código, item a item do critério de pronto,
  e pela suíte do `@repo/design-system` nesta auditoria (`dateInputLocale.test.tsx`), não lido do `STATE.md`.
- **Se sobrou literal "Pick a date"** foi medido por `git grep` em `apps` e `packages`, fora de testes: só a folha
  `en` nova e o `datePlaceholder` em inglês da trilha, que é texto do dicionário.
- **Se o teste instável de `useListAuditEvents` reapareceu** foi medido com duas execuções a mais da suíte da
  `apps/app`, além da do turbo: 3 de 3 verdes, 841 testes cada.
- **Se o `typecheck` do `packages/shared` cabe numa tarefa pequena** foi medido com um `tsc` fora do pacote: 0 erros
  nos arquivos dele, 2 por falta de `@types/node`. O número entrou na linha do achado.
- **Os achados que a PR #44 mandou para o backlog** entraram como achados, sem virar pergunta. O estouro do header
  em es ampliou uma linha que já existia.
- **Quantos `STATE.md` seguem com `review: in-progress` depois do merge** foi medido lendo os 41: 15, não os seis que
  a rodada anterior contava. A correção entrou em E11, sem pergunta nova.
- **A PR #44 levar junto a auditoria anterior** é a sexta repetição do mesmo padrão. Pela §5.1, segue em E11.
- **A sugestão de rodar o `/spec` de descoberta**, repetida em cinco auditorias, saiu da recomendação e virou E14.
- **Os candidatos a #1 que repetiam o mesmo motivo de não escolha desde 2026-10-07** deixaram de ser listados um a
  um; o motivo fica na linha do achado (§5.1).
- **Segunda passada:** se `date-input-navigation` fecha achados foi lido no working tree, item a item, e a resposta é
  "no working tree, pendente de merge", sem fechar nada. Os gates não foram remedidos; valem os números do `/test`
  dela (`pnpm test` da raiz 15/15 depois do diff).
- **Se o `HookFormInputPassword` perde o foco no login** foi medido por leitura (`SignInForm.tsx:131-136` e o
  formulário da web chamam `mutate` sem aguardar, e o campo fica desabilitado durante a validação) e com um script de
  jsdom, que mostrou que o jsdom 27.0.1 não aplica o "focus fixup" do HTML. O efeito no navegador fica para o `/test`
  da próxima tarefa, que é a recomendação #1.
- **Terceira passada:** se `form-field-focus-and-names` fecha achados foi lido no working tree, item a item:
  cinco ficam ◐, pendentes de merge. Os gates foram citados do `/test` e do `/review`, sem `--force`. A âncora
  `specs/BACKLOG.md:162`, que citava a branch antiga `fix/date-input-navigation`, foi corrigida para
  `fix/date-pickers-and-form-fields`.
- **Os achados que o `/test` da terceira passada viu fora do diff** foram medidos no código antes de entrar: o código
  do erro em recusa esperada (`handleClientError.ts:4-11`) e o idioma das preferências (`AccountPreferencesForm.tsx:65`,
  `:89-99`) entraram como achados que pedem decisão de copy ou de produto, não como pergunta. O `press` do
  `agent-browser` no grupo de rádio é limite da ferramenta e ficou só como nota de método.

## Decisões estacionadas (§5.1)

Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (13 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor. A E12 pede a mesma coisa para `account-security-mfa` |
| E2 | `teams-organizations` continua `deferred`? (15 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar, exigindo `verify` e `e2e`; não há pré-requisito técnico. É o que falta para o item 2 de [`e2e-testing`](../docs/features/e2e-testing/spec.md), arquivada com esse ⚠️. Remedido em 2026-10-14, pós-PR #44: 404, `[]`, 44 PRs |
| E4 | O gate `approved` não é usado. Em 2026-09-26 você aprovou cinco specs de uma vez, e as cinco foram entregues depois de passar por ele (PRs #30 a #34). `plan-entitlements` foi a nona entregue sem passar por `approved`: você a manteve `proposed` em 2026-09-26, e o `/analyze` de uma rodada do `/cycle` a levou direto a `in-progress` | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | O deep link das abas da conta (`?tab=`) não acompanha a barra lateral (3 rodadas) | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:55-57`), por isso precisa da sua palavra. O `PlanGate` da PR #38 leva a `/account?tab=billing` e funciona porque a aba é lida ao montar |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | este arquivo, achado A1 em [Achados](#-achados-abertos-reconferidos-ou-herdados) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer; a nota de medição do `docs/AUTH-SSO.md` fica como está |
| E11 | O registro da feature não acompanha o merge, e a branch sai fora do padrão `<project>/<type>/<title>` | você | `.claude/rules/git-commits.md` e `.claude/skills/spec-audit/SKILL.md` §4.1 | **Atualizado em 2026-10-14, pós-PR #44:** a PR #44 saiu como `fix/date-input-locale`, sem `<project>`, porque o diff cruza `packages/internationalization`, `packages/design-system` e `apps/web` (o `/review` dela citou esta linha como precedente). É a sexta PR (#37, #40, #41, #42, #43 e #44) cujo squash leva a auditoria anterior junto; na branch, a auditoria tinha commit `docs(specs)` próprio, como a regra pede. Das PRs #29 a #44, só a #36, a #40 e a #42 seguiram o padrão de branch; as três tocam código de um pacote só. **Contagem corrigida nesta rodada:** a auditoria anterior dizia que seis `STATE.md` seguiam com `review: in-progress` depois do merge. Lendo a linha `review` de todos os 41 `STATE.md` em `fa7041b`, são **15**: `api-hardening`, `cursor-pagination`, `audit-log`, `user-activity-tracking`, `onboarding-flow`, `accessibility-conformance`, `account-security-mfa`, `observability-logging`, `plan-entitlements`, `account-active-sessions`, `server-locale-from-url`, `antd-theme-seed-colors`, `account-deletion-dialog-focus`, `ui-strings-and-password-focus` e `date-input-locale`, todas com PR mergeada e CI verde (`observability-logging` com a parte entregue). As outras rodadas contavam só as features recentes. Os 26 restantes têm `review: done`; `e2e-testing` tem `test: blocked`, por decisão sua. A auditoria não os edita, porque a `spec-audit` só a autoriza a acrescentar `spec:` ao arquivar. Recomendação: a regra aceitar `fix/<slug>` e `feat/<slug>` para tarefa que cruza vários apps (como já aceita para épico), e a auditoria, ao confirmar o merge, gravar no `STATE.md` a linha `review` como `done` com o SHA e a branch |
| E12 | O destino da fatia 3 de `account-security-mfa` (segundo fator com códigos de recuperação, itens 5 e 6). Era a D10, aberta em 2026-10-04; estacionada em 2026-10-07, na segunda aparição. Opções: **(a)** arquivar a spec como entregue em 4/6, em `docs/features/account-security-mfa/spec.md`, e abrir uma spec `proposed` só do segundo fator; **(b)** voltar a spec para `proposed`, com as fatias entregues registradas nela, para que entre nos lotes; **(c)** manter `in-progress`; **(d)** marcar a fatia 3 como `deferred` dentro da spec | você | a spec [`account-security-mfa`](account-security-mfa.md) | **(a)**. Com `in-progress` e nenhuma feature ativa, a spec fica fora dos lotes para sempre, e o status afirma um trabalho que ninguém está fazendo. (a) segue o padrão recomendado na E1, deixa a evidência das fatias 1 e 2 junto da feature e abre uma spec pequena sobre o que falta: prevalência de 3/10, preço no GCIP não confirmado, ativação do recurso no projeto Firebase. A pasta de destino tem o mesmo nome do `id` e ainda não tem `spec.md` (reconferido em 2026-10-14), então não há colisão. (b) é a saída de menor esforço se você quiser manter o histórico num arquivo só |
| E13 | Ligar o bloqueio de bot da landing? Hoje ele nunca roda, nem com chave válida (achado do `skipValidation` da `apps/web`). Era a D8, aberta em 2026-09-30; estacionada em 2026-10-07, na quarta aparição | você | este arquivo, [Achados](#-repositório-rotas-e-proxy), linha do `skipValidation` | não ligar agora e declarar a decisão. Ligar é pôr `detectBot` e `shield` em modo `LIVE` para visitante anônimo em todo fork que já tem a chave; pede teste próprio (falso positivo de crawler, preview de link) e não cabe numa correção de configuração. Os documentos em `main` já descrevem o comportamento atual (`docs/ROPA.md:108`, `docs/SUBPROCESSORS.md:40`, `docs/FORKING.md:317-318`, no §7.3). Tirar o `skipValidation` sem esta decisão liga o bloqueio por tabela |
| E14 | Rodar o `/spec` de descoberta? A última foi em 2026-09-26; desde então o backlog ativo encolheu para três specs, nenhuma elegível há seis rodadas, e as rodadas do `/cycle` vivem de tarefas diretas tiradas dos achados. A sugestão apareceu em cinco auditorias seguidas (pós-PRs #39 a #43) como "outra saída" e sai do relatório aqui | você | este arquivo; o `/spec` sem argumento | rodar quando você quiser specs novas no lugar das tarefas diretas. Enquanto isso, a auditoria segue recomendando tarefa direta. Estacionada em 2026-10-14, na sexta aparição |

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
  arquivo movido e confirme zero mortos."* Esta rodada fez isso à mão de novo, nos dois links de saída de
  `plan-entitlements`. O mesmo passo não cobre o link de entrada que o `analyze/plan.md` da feature tem para
  `specs/<id>.md` e que morre com o movimento (achado novo).

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-10-14, pós-PR #44 |
|------|--------------|------------------------|
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`). A spec está `in-progress`, com as fatias 1 e 2 em `main` |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
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
| `onboarding-flow` | 2026-09-24 | [`docs/features/onboarding-flow/spec.md`](../docs/features/onboarding-flow/spec.md) — **5/5 do corte** (PR #24, `d52c4f0`), 20/20 critérios sob o emulador. Deriva no item 3: o deep link volta sem a query string |
| `billing-subscription` | 2026-09-25 | [`docs/features/billing-subscription/spec.md`](../docs/features/billing-subscription/spec.md) — **6/6 do corte** (PR #25, `a1f87d0`), mais o passo `billing` do expurgo herdado de `data-rights-lgpd`. 19 ✅ e 5 🔒 no `/test` (só conta Stripe real prova). ⚠️ Catálogo, portal, endpoint de webhook e chaves são passo manual por fork (`PRE-PRODUCTION.md` §12) |
| `admin-billing-insights` | 2026-09-25 | [`docs/features/admin-billing-insights/spec.md`](../docs/features/admin-billing-insights/spec.md) — **5/5 do corte** (PR #27, `0659ede`). 18 ✅, 4 🔒 e 1 ❌ anterior à entrega (hidratação em `/en` e `/es`). ⚠️ **Duas derivas** contra o bloco de reescopo, sem efeito na tela, aceitas pelo usuário; o endpoint da Stripe de cada fork precisa ganhar `invoice.paid` (`PRE-PRODUCTION.md:455`, âncora remedida em 2026-10-04) |
| `e2e-testing` | 2026-09-25 | [`docs/features/e2e-testing/spec.md`](../docs/features/e2e-testing/spec.md) — **4/5 do corte e 1 parcial** (PR #26, `c71755e`). ⚠️ O item 2 roda em toda PR mas **não bloqueia o merge** até o branch protection ser ligado (E3). O `STATE.md` segue com `test: blocked` pelo D3, corrigido na própria PR; o job `e2e` passou nas quatro execuções seguintes |
| `brand-config` | 2026-09-28 | [`docs/features/brand-config/spec.md`](../docs/features/brand-config/spec.md) — **5/5 do corte** (PR #30, `e07252a`), 14 ✅, 0 ❌ e 1 🔒 no `/test` (nome não ASCII na Resend). Primeira spec entregue depois de passar por `approved`. ⚠️ Marca, logo e ícones por fork são passo manual (`PRE-PRODUCTION.md` §13) |
| `storage-emulator-rules-tests` | 2026-09-28 | [`docs/features/storage-emulator-rules-tests/spec.md`](../docs/features/storage-emulator-rules-tests/spec.md) — **5/5 do corte** (PR #31, `2c285de`), 18 ✅, 0 ❌ e 1 🔒 no `/test`; o 🔒 (`verify` no GitHub) passou no merge, com 170 testes contra emulador. Segunda spec entregue depois de passar por `approved`. ⚠️ Deriva no item 5: o `build` não roda os testes contra emulador. Publicar `storage.rules` e ativar o bucket seguem passo manual (`PRE-PRODUCTION.md` §6) |
| `accessibility-conformance` | 2026-09-29 | [`docs/features/accessibility-conformance/spec.md`](../docs/features/accessibility-conformance/spec.md) — **6/6 do corte** (PR #32, `3e5ec4c`), allowlist do axe vazia e `e2e` 22/22 no merge. Terceira spec entregue depois de passar por `approved`. ⚠️ Duas derivas de letra (título por área, `aria-invalid="false"` sem erro); checkout em carregamento e leitor de tela real seguem 🔒. O diff introduziu e corrigiu antes do merge o "Excluir" ilegível no hover |
| `account-email-change` | 2026-09-29 | [`docs/features/account-email-change/spec.md`](../docs/features/account-email-change/spec.md) — **5/5 do corte** (PR #33, `f377c84`), 16 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real do aviso pela Resend). Quarta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no comportamento; o diff introduziu e corrigiu antes do merge dois defeitos de foco no diálogo novo. Resend, `FIREBASE_WEB_API_KEY` e o e-mail de suporte são passo manual por fork (`PRE-PRODUCTION.md` §3, §4 e §13) |
| `compliance-docs-kit` | 2026-09-30 | [`docs/features/compliance-docs-kit/spec.md`](../docs/features/compliance-docs-kit/spec.md) — **6/6 do corte** (PR #34, `c7aa4d9`), 18 ✅, 0 ❌ e 2 🔒 no `/test` (backup no Blaze e conformidade jurídica). Quinta spec entregue depois de passar por `approved`. ⚠️ Cinco derivas sem efeito no conteúdo. Preencher os `[FORK]`, aceitar os DPAs e decidir o backup são passo manual por fork (`PRE-PRODUCTION.md` §14) |
| `plan-entitlements` | 2026-10-04 | [`docs/features/plan-entitlements/spec.md`](../docs/features/plan-entitlements/spec.md) — **5/5 do corte** (PR #38, `2ed0df2`), 15 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real da Stripe). Entregue sem passar por `approved` (E4). Sem deriva. ⚠️ Recursos cadastrados no Dashboard da Stripe, o sexto evento no endpoint e o custo do Entitlements são passo manual por fork (`PRE-PRODUCTION.md` §12, a partir da `:455`); a demo em `entity` fica desligada sem `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` |

**Verificado na auditoria de 2026-10-14 (pós-PR #44):** `docs/features/` tem **41** pastas e **26** `spec.md`
arquivados. As quinze pastas sem `spec.md` são `account-security-mfa` e `account-active-sessions` (fatias 1 e 2 da
spec `in-progress` em `specs/`), `observability-logging` (spec `in-progress`), `auth-panel-context` e
`impersonation-read-only` (as duas anteriores à semeadura), e `i18n-hydration-admin-delete-billing`,
`disabled-account-revocation`, `arcjet-key-lazy-validation`, `admin-self-lockout-guard`,
`action-menu-keyboard-delete`, `server-locale-from-url`, `antd-theme-seed-colors`, `account-deletion-dialog-focus`,
`ui-strings-and-password-focus` e `date-input-locale` (tarefas diretas, listadas em
[Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec)). Nenhuma spec foi arquivada nesta rodada; a
última foi `plan-entitlements`, em 2026-10-04.

### O que a PR #27 entregou **além** do corte (registrado em 2026-09-25)

1. **O webhook parou de ecoar o evento Stripe** na resposta de sucesso: `route.ts:242` devolve só
   `{ ok: true }`.
2. **A checagem de `ALREADY_EXISTS` do Firestore virou helper compartilhado** (`isAlreadyExistsError`,
   `apps/api/(shared)/infra/firestore-errors.ts:4`), usado pelos repositórios de fatura e de ativação.
3. **Aviso de endpoint incompleto.** Com assinatura vigente e nenhuma fatura paga registrada, a seção avisa
   que falta `invoice.paid` no endpoint (`BillingInsightsSection.tsx:76-83`), em vez de mostrar receita
   zero sem explicação.
4. **A declaração do expurgo ganhou as duas coleções novas** (`docs/PRE-PRODUCTION.md:759`, relida em `main` em
   2026-10-04, depois da PR #39): ficam depois da exclusão, porque guardam só ids da Stripe, valor, moeda e datas.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida ao passar por ela. A PR #44 alterou um documento fora de `docs/features/` e `specs/`: a linha do
`sidebar_state` do `docs/PRE-PRODUCTION.md:416`, que agora confere. Fora de `docs/features/`, nenhum documento cita
com linha `date-input.tsx`, `calendar.tsx`, `contact-form-client.tsx` ou o índice de traduções (`git grep` em `docs`,
`AGENTS.md`, nos `CLAUDE.md` e em `.claude`; `AGENTS.md:77` descreve o `DateInput` sem linha, e a descrição segue
certa). Nesta rodada também foi medida a âncora do `docs/RESEARCH-tanstack-vs-next.md:40`, que a rodada anterior
deixou de fora: ela cita `LanguageSwitcher.tsx:3` para o `"use client"`, que está na linha 1. As linhas das PRs #41 e
#42 foram lidas nas rodadas anteriores; o código que os outros documentos citam não mudou, então as linhas medidas em
2026-10-04 mantêm o veredito e a data de lá. A auditoria não edita `docs/`; o que está defasado fica registrado aqui.

| documento | afirma | realidade medida | veredito |
|-----------|--------|------------------|----------|
| os oito documentos (âncoras de código) | 127 `arquivo:linha` com caminho único no repositório | em 2026-10-04, todos existem e cabem no arquivo. As que apontam para código alterado pelas PRs foram lidas uma a uma; as deslocadas estão nas linhas seguintes | ✅ **honesto** na existência |
| `docs/SECURITY.md:15-34` (inventário de guards) | 32 arquivos de rota, 20 com guard, 12 nus, 9 em `/auth/*`; `account/*` ×7; dois guards | recontado em 2026-10-04: **36** arquivos, **23** com guard, **13** nus (10 em `/auth/*`, com o `auth/session` novo da PR #39, os dois `health` e o webhook); `account/*` ×10; e um terceiro guard, `requirePlanApi` (`apps/api/app/(guards)/plan.ts:21`), composto sobre o comum | ❌ **defasado**. A PR #39 atualizou a seção de rate limit do mesmo arquivo (`:154`, que confere) e não a contagem; a PR #37 acrescentou a linha da recusa do próprio admin (`:30`, que confere) |
| `docs/SECURITY.md:154` | sete das dez rotas de `/account` fora do rate limit, as quatro de sessões entre elas | `apps/api/proxy.ts:45-58`: a lista tem `/account/export`, `/account/deletion` e `/account/email`; dez arquivos de rota em `account/` | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md:414` | o cookie `x-locale` é lido em `server.ts:13` e gravado em `apps/app/proxy.ts:214,218` e `apps/web/proxy.ts:111,115` | conferem em `0a49a3b`: `LOCALE_COOKIE` em `server.ts:13`, os quatro `cookieStore.set("x-locale", …)` nas linhas citadas | ✅ **corrigido pela PR #41** (era ❌, âncora deslocada) |
| `docs/ARCHITECTURE.md:64`, `AGENTS.md:25`, `apps/app/CLAUDE.md:47`, `.claude/skills/i18n-sync/SKILL.md:14` | no servidor, o idioma vem do segmento da URL, repassado pelos proxies no header `x-request-locale`; sem header válido, cookie e depois padrão; fora do `matcher` o header chega como o navegador mandou | `server.ts:31-34`, `apps/web/proxy.ts:133`, `apps/app/proxy.ts:264`; o `matcher` da app exclui `api` e `_next/*` (`apps/app/proxy.ts:122`) | ✅ **honesto**, por leitura |
| `docs/features/i18n-hydration-admin-delete-billing/test/report.md:67` | na troca suave de `/en/entities` para `/es/entities`, `document.documentElement.lang` "passou a `es`" | o `/test` da PR #41 mediu o contrário no código anterior à correção (`5f4a8e9`), em build: `lang` ficou `"en"` até recarregar. O root layout da app fica acima de `[locale]` e não renderiza de novo; quem atualiza o atributo hoje é o `DocumentLangSync` | ❌ **afirmação não reproduzida**; o modo da medição antiga (dev ou build) não está registrado. Sem efeito hoje, porque o comportamento correto passou a existir |
| `docs/PRE-PRODUCTION.md:416` | o cookie `sidebar_state` é declarado em `sidebar.tsx:29` | o `SIDEBAR_COOKIE_NAME` está em `packages/design-system/components/ui/sidebar.tsx:29` | ✅ **corrigida pela PR #44** (era ⚠️, deslocada pela PR #43) |
| `docs/RESEARCH-tanstack-vs-next.md:40` | o `"use client"` do seletor de idioma da app está em `LanguageSwitcher.tsx:3` | está em `apps/app/shared/components/ui/LanguageSwitcher.tsx:1`; o documento não muda desde a PR #39 | ⚠️ **deslocada**, medida pela primeira vez nesta rodada |
| `docs/features/date-input-navigation/analyze/plan.md` §9 e §10 (no working tree) | clicar no rótulo "Data" foca o botão; sob personificação o campo de nascimento continua desabilitado | o clique no `<label for="date">` abre o calendário (medido pelo `/test`); `EntityFormFields.tsx` não passa `disabled` aos campos, e a personificação bloqueia só o envio | ⚠️ **texto do plano não descreve o código**; o código está certo e o `/test` corrigiu os dois textos em `test/criterios-aceite.md`. Medido na segunda passada |
| `docs/features/date-input-locale/STATE.md` | `review: in-progress`; notas citam `specs/BACKLOG.md:230-272` (a recomendação) | PR #44 mergeada com CI verde, da branch `fix/date-input-locale`, que o campo `branch` acerta; as linhas são da versão pós-PR #43 deste arquivo, que esta rodada reescreveu | ⚠️ **defasado**, estacionado em E11 |
| `docs/features/account-deletion-dialog-focus/STATE.md` e `docs/features/ui-strings-and-password-focus/STATE.md` | `review: in-progress`; `branch:` "proposta, a criar"; notas citam `specs/BACKLOG.md:183-213`, `:793`, `:695` e `:942` | PR #43 mergeada com CI verde, da branch `fix/ui-labels-and-account-dialog-focus`; as linhas são da versão pós-PR #42 deste arquivo | ⚠️ **defasados**, estacionados em E11 |
| `docs/features/antd-theme-seed-colors/STATE.md` | `review: in-progress`; notas citam `specs/BACKLOG.md:185-219` e `:737` | PR #42 mergeada com CI verde; as linhas eram da versão anterior à rodada pós-PR #42 | ⚠️ **defasado**, estacionado em E11 |
| `docs/features/accessibility-conformance/spec.md:53-54`, `:166` (arquivada) | o `danger` do antd recebe o `colorError` em `var(...)` (`antd-app.tsx:20`) e o `Dropdown` tem override de `colorError` por componente (`antd-app.tsx:75-78`); `--destructive` do escuro em `globals.css:63` | desde a PR #42, o `colorError` é o hex do `--destructive` por tema (hoje `antd-app.tsx:136`, depois dos imports da PR #43), o override saiu (o `Dropdown` em `:103-105` só guarda o `colorTextLightSolid`) e o token escuro está em `globals.css:64`. A cor do item `danger` não mudou (`actionMenu.test.tsx:80-105`, `antdTheme.test.tsx:251`) | ⚠️ **histórico**: a spec descreve o mecanismo da data da entrega. Não é regressão; a capacidade segue coberta por teste |
| `docs/features/server-locale-from-url/STATE.md` | `review: in-progress`; notas citam `specs/BACKLOG.md:177-210` e `:547` | PR #41 mergeada com CI verde; as linhas eram da versão anterior à rodada pós-PR #41 | ⚠️ **defasado**, estacionado em E11 |
| `docs/PRE-PRODUCTION.md:497` | o expurgo cancela a assinatura em `account-erasure.ts:95` | a chamada de `cancelSubscriptionForErasure` está em `:97` (a PR #39 acrescentou o passo de sessões acima) | ⚠️ **deslocada em duas linhas** |
| `docs/SUBPROCESSORS.md:33` | a coleção `user` é declarada em `user.repository.ts:42` | `:42` é o fim de um bloco; o `super(db, "user")` está em `:46`, empurrado pela PR #38. A mesma linha cita `session.repository.ts:49`, que confere | ⚠️ **deslocada** pela PR vizinha |
| `docs/SUBPROCESSORS.md:35` | a Stripe é chamada no expurgo em `account-erasure.ts:85` | `:85` é `}`; o `getStripe()` está em `:87` | ⚠️ **deslocada** pela PR #39 |
| `docs/ROPA.md:69` e `:83` | `lastAccessAt` em `user.ts:54-59`; `stripeCustomerId` e assinatura em `user.ts:62-65` | o import de `EntitlementsState` (PR #38) empurrou o arquivo uma linha: hoje `:55-60` e `:63-66`. A PR #39 editou a linha `:69` sem ver o deslocamento, porque partiu de `e791d3a` | ⚠️ **deslocadas** pela PR vizinha |
| `docs/INCIDENT-RESPONSE.md:63` e `docs/BACKUP.md:88` | as ações auditadas em `audit.ts:2-11`; o alvo em `audit.ts:29-31` | a PR #39 acrescentou duas ações ao enum: hoje `:2-13` e `:31-33` | ⚠️ **deslocadas** pela própria PR #39 |
| `docs/ROPA.md` e `docs/SUBPROCESSORS.md` (inventário do perfil) | o perfil guarda telefone, avatar, preferências, onboarding, `lastAccessAt`, `stripeCustomerId` e assinatura | o perfil guarda também `entitlements`, a lista de recursos pagos gravada pelo webhook desde a PR #38 (`packages/sdk/src/types/user/user.ts:67-68`) | ❌ **omissão**. Ver o achado novo em [compliance-docs-kit](#-achados-da-entrega-compliance-docs-kit-2026-09-30) |
| `docs/PRE-PRODUCTION.md` §9 (gate) | 29/29 tasks, 806 arquivos, 2485 testes em 227, 170 contra emulador, 13 configs, medidos em 2026-09-30 | em 2026-10-14, pós-PR #44: 30/30, 876, 2869 em 263, 186, 14 configs | ✅ **honesto**, datado; o parágrafo manda remedir antes de citar |
| `docs/PRE-PRODUCTION.md:825-845` e `docs/AUTH-SSO.md:74-76` (sessões) | o "Sair" encerra só o navegador atual; encerrar uma sessão corta a API e o cookie, não o refresh token no Firebase; Firestore e Storage negam todo cliente | `session-routes.ts:174-183`; `resolve-api-actor.ts:57-79`; `firestore.rules:32-34` e `storage.rules` negam tudo | ✅ **honesto**, por leitura |
| `docs/PAYMENTS.md:27`, `:42`, `:104`, `:184-197` (acesso por plano) | `requirePlanApi`, `PlanGate`, o sexto evento e a demo desligada | conferem com `plan.ts`, `plan-access.ts`, `PlanGate.tsx` e `webhooks/payments/route.ts:219` | ✅ **honesto** |
| `docs/features/plan-entitlements/analyze/plan.md:3` | link para `../../../../specs/plan-entitlements.md` | a spec foi movida nesta rodada para `../spec.md` | ❌ **link morto, criado por este arquivamento**. A auditoria não edita o plano; ver o achado novo |
| `docs/features/plan-entitlements/STATE.md` e `docs/features/account-active-sessions/STATE.md` | `review: in-progress` | PRs #38 e #39 mergeadas com CI verde; reconferido em 2026-10-07, os dois seguem assim | ⚠️ **defasados**, estacionados em E11 |
| `docs/features/admin-self-lockout-guard/STATE.md` (notas) | cita `specs/BACKLOG.md:248-284`, `:860` e `:365` | as linhas eram da versão anterior à auditoria de 2026-10-04 | ⚠️ **defasado**, mesmo caso das tarefas anteriores |
| `docs/features/action-menu-keyboard-delete/STATE.md` (notas) | cita `specs/BACKLOG.md:185-195` (a recomendação) e `:625-626` (os achados) | as linhas eram da versão de 2026-10-04; nesta, a recomendação é outra e os dois achados saíram para a lista de fechados | ⚠️ **defasado**, mesmo caso. A nota do mesmo arquivo sobre o `git mv` de `specs/plan-entitlements.md` no índice perdeu o objeto: o rename foi no commit da PR #40 |
| `docs/FORKING.md:437` (link) | aponta para `../README.md#crud-de-referência` | o README renderizado pelo GitHub publica o id `user-content--crud-de-referência`, com `href="#-crud-de-referência"` (medido em 2026-09-30) | ❌ **link morto**; nenhuma das PRs #37 a #41 tocou o arquivo |
| `docs/features/accessibility-conformance/STATE.md`, `account-security-mfa/STATE.md`, `brand-config/STATE.md`, `account-email-change/STATE.md`, `compliance-docs-kit/STATE.md`, `e2e-testing/STATE.md`, `disabled-account-revocation/STATE.md`, `arcjet-key-lazy-validation/STATE.md` | as defasagens de etapa, branch ou linha registradas nas rodadas anteriores | não mudaram | ⚠️ **defasados**, estacionados em E11 ou mantidos por decisão do usuário (`e2e-testing`) |
| `docs/AUTH-SSO.md:66-71` e a pendência do modo `simple` no `PRE-PRODUCTION.md` | redirecionamento do comum para a web no `simple` | não remedido; estacionado (E10) | ⚠️ nota de medição anterior segue no lugar |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

| id | especificado | implementado | leitura |
|----|--------------|--------------|---------|
| `account-security-mfa` (item 2) | sessões ativas "com dispositivo/origem e último uso" | navegador, sistema e tipo de aparelho tirados do user-agent, instante do login e do último uso; sem IP; app e web no mesmo navegador contam como uma sessão | **a spec estava imprecisa**. Gravar IP mudaria a natureza jurídica do dado, como a lacuna de `user-activity-tracking` já registrava. Nota escrita no item |
| `account-security-mfa` (item 3) | encerrar uma sessão específica | a API e os front-ends recusam a sessão encerrada; o refresh token do aparelho segue válido no Firebase | **a spec estava errada sobre o provedor**: o Firebase só revoga a conta inteira. A limitação está declarada em `docs/AUTH-SSO.md:74-76` e no `PRE-PRODUCTION.md`. Nota escrita no item |
| `plan-entitlements` | o corte inteiro | o corte inteiro; a pergunta "Entitlements ou mapa local" foi decidida pela recomendação da spec | **sem deriva**. A variável da demo usa o prefixo `NEXT_PUBLIC_` também na API, para ter um nome só nos dois apps; é escolha do plano, não desvio |

As PRs #40 a #44 não alteraram nenhuma spec viva nem código da área delas (`packages/auth`, `apps/api`,
`packages/shared`, `packages/sdk`, `firestore.indexes.json`), então as três linhas acima seguem como em
2026-10-04. A PR #41 tocou `specs/account-security-mfa.md`, mas só para levar a auditoria anterior (data e o
nome da decisão estacionada E12). As PRs #42 a #44 não tocaram nenhum arquivo de spec viva (`git diff --name-only
7fb2fe9 fa7041b -- specs/` devolve só este arquivo).

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

Nenhuma spec `done` perdeu código. A PR #44 mexeu no `DateInput`, que duas specs arquivadas usam, e as duas seguem
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
2026-10-14 pós-PR #44: 0 (as únicas ocorrências sem distinguir maiúsculas são `InputOTP*`, do `input-otp.tsx`).
`logEvent(` fora de testes segue em 37, como `observability-logging` registra. O `input-otp.tsx` segue sem uso fora
do barril e do `playground`. Os dez arquivos de `contends_on` das três specs existem no disco.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-10-14 (pós-PR #44).** A rodada anterior fechou com 106 linhas abertas. A PR #44 alterou 10
> arquivos fora de `docs/features` e `specs`, em `packages/design-system`, `packages/internationalization`, `apps/web`
> e `docs/PRE-PRODUCTION.md` (`git diff --stat 7fb2fe9 fa7041b`); as linhas que citam algum deles foram reabertas no
> disco, e a que segue aberta teve a âncora corrigida (ver [Âncoras relidas](#âncoras-relidas)). As demais seguem
> iguais, porque o arquivo citado é o mesmo byte a byte (nenhum arquivo de `apps/api`, `apps/app`, `packages/auth`,
> `packages/shared` ou `packages/sdk` mudou). Também foram reconferidas no código, por amostragem, as de maior
> severidade: o gate do `CORS_ORIGIN` (`instrumentation.ts:63-67`, `throw` e zero `process.exit`), o `/auth/sign-in`
> com string crua (`:12`), o export `./client-ui` sem arquivo, o `skipValidation` da web (`apps/web/env.ts:33`), o
> cookie `x-locale` sem `maxAge` (0 ocorrências nos dois `proxy.ts`), o `disabled={formState.isSubmitting}` do
> `HookFormInputPassword` (`:80`), o `typecheck` do turbo com `"dependsOn": []` (`turbo.json:12`), o `CommandDialog`
> em inglês (`command.tsx:31-32`) e o `DialogFooter` com `<button>` dentro de `<button>` (`dialog.tsx:117-121`). Todas
> seguem abertas. **Placar: 2 fechados (o "Pick a date" do `DateInput`, e a data, o calendário e o seletor de mês em
> inglês) · 4 novos · 2 ampliados (o header deslogado da web, agora também a 1280 px em es, e as âncoras de documento,
> com a do `docs/RESEARCH-tanstack-vs-next.md:40`) · 108 abertos, pela soma.** A data do formulário de contato em
> inglês, que nunca teve linha aqui, apareceu e fechou dentro da própria PR #44 e fica fora do placar. A tabela de
> fechados da PR #43 ficou na versão deste arquivo em `fa7041b`; a da PR #42, na versão em `7fb2fe9`; a da PR #41, na
> versão em `dbcac2a`; a da PR #40, na versão em `0a49a3b`; a de 2026-10-04, na versão em `5f4a8e9`; as de
> 2026-09-26 a 2026-10-03, na versão em `02c31b5`.
>
> **Segunda passada de 2026-10-14 (working tree, sem merge novo).** Nada fecha, porque fechar exige merge. Placar
> desta passada: **0 fechados · 2 novos (o caso de `dateInputLocale.test.tsx` preso a outubro de 2026, já resolvido
> no mesmo working tree, e o campo de nascimento atrás do rodapé fixo a 390 px) · 1 ampliado (o header da web em es,
> remedido em 1304 px) · 110 abertos, pela soma.** Quatro desses 110 estão marcados como **◐ fechado no working tree,
> pendente de merge**: o calendário que abre no mês atual, a hidratação da `/contact`, o `initialFocus` e o caso preso
> ao relógio. O `data-day` segue aberto, fora do corte da tarefa.
>
> **Terceira passada de 2026-10-14 (working tree, sem merge novo).** Nada fecha. Placar desta passada: **0 fechados ·
> 6 novos (o foco que sai do botão de enviar, o asterisco do `Label`, o `required` que o grupo de rádio não repassa, o
> risco do `useSubmitEnterGuard`, o código do erro em recusa esperada e o idioma das preferências) · 0 ampliados · 116
> abertos, pela soma.** Nove deles estão **◐ fechados no working tree, pendentes de merge**: os quatro da segunda
> passada e mais cinco de `form-field-focus-and-names` (o `disabled` do campo de senha, o placeholder ignorado, o
> grupo de rádio sem nome, o botão que encolhe e o `disabled` antes do spread). O estouro do header em es, que o
> `/test` mediu de novo em 1304 px, já tinha linha e não muda.

### ✅ Fechado na auditoria de 2026-10-14 (PR #44)

`<ds>` é `packages/design-system/components/ui`.

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** (aberto desde antes da PR #11; o CRUD de referência o mostrava em pt-br e es) | `<ds>/date-input.tsx:51`, no `7fb2fe9` (`placeholder = "Pick a date"`) | o default saiu (`<ds>/date-input.tsx:53`) e o botão mostra `placeholder ?? dictionary.components.dateInput.placeholder` (`:91`), com a folha `translations/components/ui/date-input.ts` nos três idiomas. Casos `dateInputLocale.test.tsx:108`, `:124`, `:130`. O `/test` mediu "Escolha uma data", "Pick a date" e "Elige una fecha" em `/entities/create`, em build. `git grep "Pick a date"` fora de testes: só a folha `en` e o `datePlaceholder` em inglês da trilha |
| 🟡 **O `DateInput` formatava sempre em inglês, e o `Calendar` também** (ampliado em 2026-10-13) | `<ds>/date-input.tsx:86` · `<ds>/calendar.tsx:38-194` (`DayPicker` sem `locale`) · `:188-189` (`toLocaleString("default")`), no `7fb2fe9` | `format(selected, "PPP", { locale: calendarLocales[locale] })` (`<ds>/date-input.tsx:90`); o `Calendar` passa `locale={calendarLocale}` (`<ds>/calendar.tsx:200`) antes do `{...props}` e formata o seletor de mês pelo `dateLib` (`:192-197`); o mapa por idioma está em `packages/design-system/lib/calendar-locales.ts:5-9`. Casos `dateInputLocale.test.tsx:116`, `:138`, `:157`, `:175`, `:184`. O `/test` mediu data, legenda, navegação e dias da semana nos três idiomas, e a troca sem recarregar, em build, claro, escuro e 390 px |

### ⚠️ Achados abertos, reconferidos ou herdados

Reconferidos em 2026-10-04, pós-PR #39, de novo em 2026-10-07, pós-PR #40, pós-PR #41 e pós-PR #42, em 2026-10-13, pós-PR #43, e em 2026-10-14, pós-PR #44, nas linhas de maior severidade (ver o placar acima). Nenhum arquivo citado nesta tabela mudou com as PRs #43 e #44.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| 🟡 **As rotas de `payments/` que chamam a Stripe estão fora do rate limit** | `apps/api/proxy.ts:45-58` | Cada chamada vai à Stripe: o catálogo lista preços, o checkout cria cliente (com chave de idempotência) e sessão, o portal cria sessão. As três exigem sessão, então o abuso depende de conta válida, mas um cliente em loop consome a cota de API da Stripe do fork. `docs/SECURITY.md:152` não as lista entre as que ficam de fora (remedido em 2026-10-04) |
| 🟡 **`findByStripeCustomerId` devolve o documento cru, sem mapper** (ampliado em 2026-10-04) | `apps/api/(shared)/repositories/user.repository.ts:71-82` | `{ ...(live.data() as UserDTO), id }` entrega `Timestamp` onde o tipo promete `Date`. Hoje o webhook só lê `id` e `stripeCustomerId`, então não quebra nada. A PR #38 deu ao método um segundo chamador, `reconcileEntitlements` (`webhooks/payments/route.ts:156`), que também só lê o `id`. Com o A2 fechado, o perfil arquivado já não tem assinatura viva quando o webhook deixa de achá-lo; quebra no primeiro chamador que ler uma data. Contraria a regra de ouro 5 (normalizar no mapper) |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:26-27` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **O webhook responde 500 para assinatura inválida** (A4) | `webhooks/payments/route.ts:270-274` → `failure()` em `:236-240` (remedidas em 2026-10-04) | A Stripe reentrega por até três dias um evento que nunca vai validar. Um 400 encerra as tentativas. `api-hardening` está arquivada, então é tarefa direta |
| 🟡 **O deep link do onboarding perde a query string** | `apps/app/proxy.ts:263` (remedida em 2026-10-07, pós-PR #41; era `:244`; o redirecionamento ao sign-in, em `:230`, também grava só o `pathname`) | O proxy grava só o `pathname`. Afeta link de listagem filtrada ou paginada aberto antes do onboarding. Saiu de "Precisam de decisão" pela §5.1: tarefa direta P, gravar `pathname + search` e um caso a mais em `proxy.test.ts` |
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
| 🟡 **Reenviar o cadastro depois de conta criada e login falho responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`** | `apps/app/.../sign-up/components/SignUpFormClient.tsx:112-119` · `apps/web/.../sign-up/components/sign-up-form-client.tsx:34-40` | A criação e o login são duas chamadas. Se a primeira passa e a segunda falha (rede, 429, cookie de sessão), a pessoa reenvia, recebe "e-mail já cadastrado" e precisa ir ao login por conta própria. O `/review` deixou como está porque a correção muda o fluxo; a alternativa registrada é tentar o `signIn` quando o reenvio receber esse código logo depois de um 201 na mesma tela |
| 🟡 **`create-dev-admin.mjs` não aplica a política de senha** | `apps/api/scripts/create-dev-admin.mjs:36-46` | O script cria administrador com qualquer senha que o Firebase aceite (6 ou mais). Fora da fatia por decisão do plano (P4): o script roda em Node puro e repetir a constante criaria a 12ª cópia. Afeta só quem opera o fork |
| 🟡 **Sem `ARCJET_KEY`, nada limita a criação de contas em massa** | `apps/api/proxy.ts:47` (`/auth/sign-up` na lista) · `docs/PRE-PRODUCTION.md:595-597` · `docs/SECURITY.md:163` (âncoras remedidas em 2026-10-04) | A rota cria a conta pelo Admin SDK, que não passa pelo limite do Firebase de 100 contas por hora por IP. A rota está na lista de rate limit, mas o limite é no-op sem a chave. Está escrito nos dois documentos; o critério 19 do `/test` ficou 🔒 |

### Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** | `apps/api/instrumentation.ts:63-67` | Reconferido em 2026-10-03, em `main`: `throw` em `:63-67`, zero `process.exit`. `/health/ready` detecta parte das falhas, não esta. Nenhum 🔴 de código segue aberto nesta seção desde a PR #36 |
| ⚠️ **Sete das dez rotas de `/account` seguem fora do rate limit**, entre elas a troca de senha (ampliado em 2026-10-04) | `apps/api/proxy.ts:45-58` | Recontado em 2026-10-04: a PR #39 criou três rotas de sessões (`/account/sessions`, `/account/sessions/[id]`, `/account/sessions/revoke-others`), todas fora; as três só leem e gravam no Firestore, sem provedor externo. Ficam fora também o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding`. O `docs/SECURITY.md:154` já traz a conta nova. A PR #25 acrescentou `POST /payments/checkout` e `POST /payments/portal`, também fora; cada checkout pode criar uma sessão na Stripe |
| ⚠️ **Superfície não-guardada da API: 13 de 36** arquivos de rota exportam handler nu, 10 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado em 2026-10-04: 36 arquivos, 23 com guard. A PR #39 acrescentou `auth/session` (nua: resolve a credencial por conta própria, para que o admin que personifica encerre a sessão dele, e responde `401` com `error.code`) e três rotas de sessões com guard; a PR #38 acrescentou o guard composto `requirePlanApi`. Os 13 nus: 10 em `/auth/*`, os dois `health` e o webhook de pagamento. `docs/SECURITY.md:15-34` ficou com os números antigos (ver Contradições) |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:123`, `:127` · `packages/auth/session.ts:78-81` | Reconferido em 2026-10-04. A parte documental está fechada (`docs/SECURITY.md:158`); o comportamento segue. Desde a PR #39 a rota também pergunta à API se a sessão foi encerrada noutro aparelho antes de renovar |

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
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:30` | Reconferido em `main` em 2026-10-03: a PR #36 passou a função a ler a chave por chamada (`readArcjetKey()`), e ela segue sem chamador fora dos testes. As 9 referências estão em `__tests__/rateLimit.test.ts` |
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts:109` (âncora remedida em 2026-09-30) segue sem relação |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:214` | Reconferido em 2026-09-27 (a âncora subiu dez linhas com a saída do `signUp` na PR #29): só `useEmailVerification.test.tsx`, que a mocka |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`** | `packages/shared/package.json:11` (só `test`) | Metade fechada pela PR #32: o `@repo/design-system` ganhou a task de `test` (`packages/design-system/package.json:7`, 45 testes). Falta o `typecheck` do `packages/shared`, adiado desde a primeira auditoria. **Medido em 2026-10-14:** `tsc --noEmit` sobre os 21 arquivos do pacote, com um `tsconfig` temporário fora do repositório, dá 0 erros neles e 2 `TS2580` em `packages/internationalization/utils.ts:22-23` (`process` sem `@types/node`, que o pacote não declara). A correção é o script, um `tsconfig.json` e o `@types/node` que os outros workspaces já usam. P |
| 🟡 **`welcomeEmail` sem chamador de produção**; o formulário de contato da landing segue maquete | `packages/email/templates/welcome.tsx:50` | Reconferido: 4 ocorrências, 3 em teste. O canal de privacidade da `apps/web` cai nesse formulário quando `NEXT_PUBLIC_PRIVACY_CONTACT` está vazia (`privacyContact.ts:17-18`), então o fallback do canal aponta para uma maquete |
| 🟡 **`useListAuditEvents.test.tsx` deixa trabalho do React pendente depois do teardown** (novo, 2026-09-28) | `apps/app/__tests__/useListAuditEvents.test.tsx:55-70` (um `QueryClient` por teste, sem `clear()` nem `unmount` ao fim) | A suíte da `apps/app` falhou em 2 de 6 execuções locais em 2026-09-28 com `ReferenceError: window is not defined`, que o Vitest atribui a este arquivo: os testes passam e o erro não tratado reprova a task. Na auditoria pós-PR #31 passou nas 6 execuções (688 testes cada) na pós-PR #32 também (6 de 6, 702 testes cada) e na pós-PR #33 também (6 de 6, 756 testes cada), então o acumulado era 2 falhas em 24; com as execuções das rodadas pós-PR #34, #35, #36, #39, #40, #41, #42, #43 e #44 (três nesta, 841 testes cada), nenhuma com falha, é 2 em 44. O arquivo não muda desde a PR #18. O CI passou nas execuções de merge das PRs #29 a #44. Correção provável, não testada: limpar o `QueryClient` e desmontar o hook no `afterEach`. Tarefa direta P |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:171` | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:181`). N+1 do Admin SDK. Décima primeira rodada aberto; âncoras desceram com os métodos de recursos da PR #38 (remedidas em 2026-10-04) |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:155` · `:167` · `:171` · `:190` · `:208` | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` da api não tem consumidor e não segue o contrato de erro** | `apps/api/app/(routes)/auth/sign-in/route.ts:12` | Reconferido: zero `try`, `:12` devolve string crua (`"User not found"`). Viola a regra de ouro 3. O `sign-up` ganhou chamador indireto de `createDefaultUserProfile` na PR #24 e tem `try`. **Medido em 2026-09-30** pelo `/test` de `arcjet-key-lazy-validation`, contra o build de produção da API: sem corpo, `req.json()` (`:5`) lança `SyntaxError: Unexpected end of JSON input` e a rota responde `500`; com `{}`, o Identity Toolkit recusa a credencial, `identitySignInWithPassword` (`:7`) lança `IdentityToolkitError` e a resposta é `500` de novo. Nos dois casos o proxy passou (a resposta traz `x-request-id`), então o erro é do handler |
| 🟡 **`GET /auth/me` responde 401 com `{ message }`, sem `error.code`** (novo, 2026-09-30) | `apps/api/app/(routes)/auth/me/route.ts:9-12`, `:18-21` | Visto no `/test` da PR #35 (`test/report.md:88`): o bearer da conta desativada recebe `401 {"message":"Invalid or expired token"}` aqui e `401 AUTH_INVALID_TOKEN` nas rotas com guard. Viola a regra de ouro 3; o front não consegue traduzir. O consumidor é o `apps/app/lib/server/authSession.ts`. Mesma família do `/auth/sign-in`; P, junto com ele |
| 🟡 **`skipValidation` incondicional na `apps/web`, e por causa dele o bloqueio de bot da landing nunca roda** (ampliado em 2026-09-30) | `apps/web/env.ts:33` · `apps/web/proxy.ts:67` (`if (!env.ARCJET_KEY) return;`) · `:72` (`secure()`), âncoras remedidas em 2026-10-07 pós-PR #41 | Com `skipValidation: true`, o `createEnv` do `@t3-oss/env-core@0.13.8` devolve só o `runtimeEnv` do próprio módulo e descarta o que veio de `extends` (`if (skip) return runtimeEnv;`, antes do merge). Como o `runtimeEnv` da web não declara `ARCJET_KEY`, `env.ARCJET_KEY` sai sempre `undefined`, mesmo com chave válida, e o `secure()` é pulado. Medido pelo `/test` de `arcjet-key-lazy-validation` com um probe de import: `ajkey_ok` dá `"ajkey_ok"` no `env.ts` da `apps/app` e `undefined` no da `apps/web`. A metade do `NEXT_PUBLIC_APP_URL` fechou com a PR #25. **§5.1:** o `skipValidation` já tinha voltado intacto em várias rodadas como "recomendação"; ele fica aqui como dívida técnica com `arquivo:linha`, e a parte que exige julgamento (ligar o bloqueio de bot) sai como a pergunta D8 e não é reapresentada depois. Tirar o `skipValidation` sem decidir a D8 liga o bloqueio por tabela, então as duas coisas andam juntas. P, depois da D8 |
| ◐ **O bounce do proxy apaga a query string**, corrigido só para as rotas de `oobCode` | `apps/app/proxy.ts:233-251` | Reconferido em 2026-10-07, pós-PR #41 (que deslocou o arquivo em 19 linhas): `redirectUrl.search = ""` em `:248`. A PR #39 pôs o bounce atrás da checagem de sessão encerrada noutro aparelho (`:235-236`), que limpa o cookie e serve a página. Mesma família do achado do deep link do onboarding |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:214,218` · `apps/web/proxy.ts:111,115` | Reconferido em 2026-10-07, pós-PR #41: `cookieStore.set` sem `maxAge` nas duas apps. A PR #41 manteve a gravação do cookie, que agora só serve à rota sem idioma na URL |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Décima rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O header logado da `apps/web` rola na horizontal no desktop** | `apps/web/app/[locale]/components/header/index.tsx` (grupo de ações à direita) | A 1280 px o "Sign Out" termina em x=1270 e a página rola 5 px; a 1024 px rola 29 px. Os números são os mesmos no `HEAD` anterior à correção do header, então o defeito é antigo. Medido em 2026-09-25 pelo `/test` da PR #28, já com o header corrigido. Não remedido nesta auditoria, que não sobe browser |
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
| 🟡 **O header deslogado da `apps/web` passa da largura a 1024 px e, em es, também a 1280 px** (ampliado em 2026-10-14) | `apps/web/app/[locale]/components/header/index.tsx` | 6 px em pt-br e 49 px em es, com o nome padrão. Complementa o achado do header logado acima, que media 29 px a 1024 px. **Ampliado:** o `/test` da PR #44 mediu em build, em `/es/contact`, `scrollWidth` 1293 para viewport de 1280, com o botão "Registrarse" cortado na borda direita; os outros idiomas não foram medidos a 1280 px deslogado. Remedido em 2026-10-14 pelo `/test` de `date-input-navigation`, também em `/es/contact` a 1280 px: `scrollWidth` 1304, com só o link "Registrarse" além da borda (borda direita em x=1304); pt-br e en ficam em 1280 |
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
O dos seed tokens do antd fechou com a PR #42 e está na lista de fechados desta rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`--destructive` do claro abaixo de 4,5:1 sobre `--accent` e `--muted`** | `packages/design-system/styles/globals.css:24` | 4,38:1 no "Excluir" com foco de teclado (fundo `--accent`, medido pelo `/test`) e 4,37:1 como texto de erro dentro de card `muted` (calculado no plano). Não aparece nas rotas que a suíte cobre. **Remedido pelo `/test` da PR #42** (O1): no foco por seta, o item "Excluir" fica `#e7000b` sobre `#f5f5f5`, 4,38:1, igual no código anterior; a PR #42 não mudou o `--destructive` |
| 🟡 **Os tokens `Menu.dangerItem*` não alcançam o `Dropdown`** | `packages/design-system/providers/antd-app.tsx:97-101` (âncora remedida em 2026-10-13, pós-PR #43; era `:91-95` e, antes da PR #42, `:66-70`) | Configuração que não tem efeito onde o `danger` aparece no repo. Reconferido depois da PR #43: o item `danger` é pintado pelo `colorError` global, em hex (`:136`), e os testes esperam esse hex (`actionMenu.test.tsx:101-104`), não os tokens do `Menu`. A PR #42 não os resolveu, como a recomendação previa |
| 🟡 **`<title>` igual em todas as páginas de cada área do painel** | `(common)/layout.tsx:23-30` · `(admin)/admin/layout.tsx:22-29` | Satisfaz o axe, mas o WCAG 2.4.2 pede título que descreva a página. Os rótulos por rota já existem em `common/routes` e `admin/routes`. Quatro das onze páginas são `"use client"` e precisariam de `layout.tsx` de segmento |
| 🟡 **A página 404 da `apps/app` sai com `document.title` vazio** | `apps/app/app/not-found.tsx:3-5` | Fica fora dos layouts do painel, que são os que ganharam `generateMetadata` |
| 🟡 **O `RadioGroup` não tem nome de grupo** | `packages/design-system/components/ui/radio-group-input.tsx:43` (`Label` sem `htmlFor`) · `form/hookform/hookformRadioGroup.tsx` | O grupo de gênero recebe como nome o texto das opções juntas ("Não informarMasculinoFemininoOutro"). Falta `aria-labelledby`. **◐ Fechado no working tree, pendente de merge** (3ª passada de 2026-10-14): `aria-labelledby` no grupo (`radio-group-input.tsx:49` no working tree), medido nos três idiomas |
| 🟡 **O botão do menu mobile da web não tem nome** | `apps/web/app/[locale]/components/header/index.tsx:261` | `Button` só com ícone (`Menu`/`X`), sem `aria-label`, a 390 px |
| 🟡 **`Button` em carregamento encolhe para a largura do spinner** | `packages/design-system/components/ui/button.tsx:73-77` | 74 → 48 px no "Salvar", medido pelo `/test`. Já acontecia antes da PR #32. **◐ Fechado no working tree, pendente de merge**: conteúdo em `opacity-0` sob o spinner (`button.tsx:74-82` no working tree), 0,000 px de diferença em oito botões |
| 🟡 **`disabled={loading}` vem antes do spread das props** | `button.tsx:69-71` | Um `disabled={false}` explícito do chamador desfaz a trava de carregamento. Já documentado em `sharedFooterPendingState.test.tsx:38-40` (âncora remedida em 2026-10-13; o mock da PR #43 empurrou o comentário três linhas). **◐ Fechado no working tree, pendente de merge**: `disabled={loading || disabled}` depois do spread (`button.tsx:72` no working tree); os footers perderam o contorno |
| 🟡 **`HookFormInputPassword` ignora o `placeholder` do chamador** | `form/hookform/hookformInputPassword.tsx:83` | O valor `"••••••••"` é fixo. **◐ Fechado no working tree, pendente de merge**: o padrão vem antes do `{...rest}` (`hookformInputPassword.tsx:82` no working tree) |
| 🟡 **A dica do `TextareaInput` não entra no `aria-describedby`** | `packages/design-system/components/ui/textarea-input.tsx:42-43` | O `<p>` do `hint` não tem id |
| 🟢 **No formulário de contato, `<Label htmlFor="date">` aponta para um id que não existe** | `apps/web/app/[locale]/contact/components/contact-form-client.tsx:73` (âncora remedida em 2026-10-14, pós-PR #44; era `:72`) | O rótulo não se liga ao botão de data. O formulário é maquete (ver `welcomeEmail`) |

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
| Hidratação do contato em `next build && next start` | **continua aberta** | ver o achado fechado por leitura acima |

### 🆕 Achados da entrega `account-email-change` (2026-09-30)

Vindos do `/review`, do handoff e do `/test` da spec, entregue pela PR #33 e arquivada em 2026-09-30. Nenhum
bloqueou a entrega. Reconferidos no código em 2026-09-30. O do foco do diálogo de exclusão de conta fechou com a PR
#43 e está na lista de fechados desta rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`lacksPasswordProvider` duplica `requiresPrivacyChannel`** (ampliado em 2026-10-13) | `AccountEmailChangeDialog.tsx:29`, `:36-46` · `AccountPrivacyPanel.tsx:29`, `:40-48` | A mesma checagem de provedor `password` e a mesma constante `PASSWORD_PROVIDER_ID` em dois arquivos da aba de conta. O plano da feature já previa (§15). **Ampliado pela PR #43:** os dois diálogos agora repetem também o comentário do `onOpenAutoFocus` palavra por palavra (`AccountPrivacyPanel.tsx:78-79`, `AccountEmailChangeDialog.tsx:89-90`) e o `onError` que devolve o foco à senha, com nome num arquivo (`focusPasswordAfterRefusal`, `AccountPrivacyPanel.tsx:85-87`) e inline no outro (`AccountEmailChangeDialog.tsx:111-112`), segundo o `/review` das duas tarefas. Se um terceiro diálogo puser o `Footer` dentro de um `AlertDialogContent`, a `cycle-policy` §3 manda corrigir no componente compartilhado |
| 🟢 **A confirmação da troca mostra o mesmo cartão de erro para qualquer código** | `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx:53-62` | Um `429 AUTH_RATE_LIMITED` diz que o link pode ter expirado, embora o código não tenha sido gasto e recarregar resolva. Espelha o `VerifyEmailResult` por decisão do plano (§5.2) |
| 🟢 **O aviso ao endereço antigo sugere que trocar a senha resolve** | `packages/internationalization/translations/packages/email/index.ts:58`, `:126`, `:193` | "Troque sua senha agora e fale com o suporte": trocar a senha não invalida um link já emitido; quem reverte é o suporte. A frase não mente, mas a ordem engana. Decisão de copy |
| 🟢 **Endereço que o Zod aceita e o Admin SDK recusa vira 500** | `apps/api/(shared)/lib/auth-action-links.ts:122-129` · `account/email/route.ts:127-137` | Se `getUserByEmail` responder `auth/invalid-email`, o erro sobe e a rota devolve `500 ACCOUNT_UPDATE_FAILED`, com `error.code` e sem stack. Raro, não vaza nada |
| 🟢 **Código de troca aplicado direto no Identity Toolkit pula a revogação e a trilha** | `auth/email-change/confirm/route.ts:79`, `:91-101` · `docs/SECURITY.md:11` | Quem tem o link e a chave web pública aplica o código sem passar pela rota. O e-mail muda, as sessões antigas não caem pela revogação explícita e o evento não é gravado. Declarado no documento; fora do corte |

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
| O proxy da API com o `@repo/security` real e a chave malformada | **fechada** pelo `/test` | `apps/api/__tests__/proxyArcjetKey.test.ts:60-72`; a mutação com o `index.ts` antigo derruba o caso |
| O build de `app`/`web` falhando com a chave errada, sem teste automatizado | **fora de escopo** | o build não roda no CI; `keys.test.ts` protege a causa (o schema estrito), e o `/test` mediu o build à mão |
| Chave válida contra a Arcjet real | **continua aberta**, 🔒 | exige credencial e IP de cliente; somada à pendência 24 |

### 🆕 Achados das PRs #37 a #39 (2026-10-04)

Vindos dos `/review` e `/test` das três entregas e da medição desta rodada, conferidos no código em `d92d21b`.
Nenhum bloqueou uma entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois admins que desativam um ao outro ao mesmo tempo ficam os dois desativados** | `apps/api/app/(routes)/users/[id]/route.ts:131-133` (a recusa só compara alvo e ator) | Os dois pedidos passam pelo `requireAdminApi` antes de qualquer gravação. Num fork com dois admins, o painel pode ficar sem admin ativo. Fechar exige transação ou contagem de admins ativos. Registrado pelo `/review` da PR #37, que reescreveu `docs/SECURITY.md:30` para não prometer o contrário |
| 🟢 **O `aria-describedby` dos `HookForm*` sem descrição aponta para um id que não existe** | `packages/design-system/components/ui/form.tsx:115-119` (o `FormControl` sempre põe o id da descrição) · `hookformSwitch.tsx` e `hookformSelect.tsx`, os dois únicos com prop `description` | Todo campo de formulário do repo sem `FormDescription` publica uma referência órfã, e quem acrescentar uma descrição precisa saber que ela só liga se renderizar o `FormDescription`. Medido pelo `/test` da PR #37 no select de tipo e corrigido só ali. Parente do achado da dica do `TextareaInput`, não o mesmo. P no design system |
| 🟢 **Aparelho encerrado com a tela aberta não sai sozinho** | o `401` da API vira só toast na `apps/app`; o aviso de sessão encerrada do `AuthProvider` (`packages/auth/provider.tsx`) só dispara na troca de token ou ao recarregar | As chamadas respondem `401 AUTH_INVALID_TOKEN` e a tela mostra "Sessão inválida ou expirada." com o id da requisição, mas a pessoa segue no painel até recarregar. Medido pelo `/test` da PR #39. Sugestão registrada lá: tratar o `401` da API como sinal para conferir a sessão |
| 🟢 **O expurgo apaga as sessões antes da conta no Firebase** | `apps/api/(shared)/lib/account-erasure.ts:123-129` | Uma requisição com credencial ainda válida que chegue entre os dois passos recria o documento da sessão pelo `trackSession`, e ele sobra depois da exclusão. O documento não tem nome nem e-mail, mas é dado pessoal residual. Inverter a ordem fecha a janela e muda o relatório de exclusão e o `accountErasure.test.ts`. Do `/review` da PR #39 |
| 🟢 **`listByUid` lê todos os documentos de sessão da conta, sem limite** | `apps/api/(shared)/repositories/session.repository.ts:66-79` · `session-tracker.ts:43-54` | A coleção guarda um documento por login e não apaga os encerrados, de propósito (o `PRE-PRODUCTION.md` proíbe TTL nela). A lista e a checagem de "encerrar as outras" leem tudo a cada sessão nova. Para conta com muitos logins, cresce sem teto; hoje não pesa. Do `/review` da PR #39 |
| 🟢 **O link do plano de `plan-entitlements` para a spec morreu com o arquivamento** | `docs/features/plan-entitlements/analyze/plan.md:3` | Aponta para `../../../../specs/plan-entitlements.md`, que esta rodada moveu para `../spec.md`. A auditoria só escreve em `docs/features/` para arquivar spec e não corrige o plano. Os planos de `account-active-sessions` e `account-security-mfa` têm o mesmo link e vão quebrar quando a spec deles for arquivada. Correção de uma linha, ou um passo novo na `spec-audit` §4.1 |
| 🟢 **Âncoras de documento deslocadas pelas PRs #37 a #39** (reduzido em 2026-10-07: a PR #41 corrigiu a do `PRE-PRODUCTION.md:414`; ampliado em 2026-10-14 com a do `RESEARCH-tanstack-vs-next.md:40`) | `docs/PRE-PRODUCTION.md:497` · `docs/SUBPROCESSORS.md:33`, `:35` · `docs/ROPA.md:69`, `:83` · `docs/INCIDENT-RESPONSE.md:63` · `docs/BACKUP.md:88` · `docs/SECURITY.md:15-34` (contagens) · `docs/RESEARCH-tanstack-vs-next.md:40` (`LanguageSwitcher.tsx:3`, hoje `:1`) | Valores corretos em [Contradições](#contradições-doc--código-medidas-nesta-rodada). Metade veio do paralelo: as PRs #38 e #39 partiram do mesmo `e791d3a`, e cada uma editou documentos sem ver o deslocamento que a outra causava no código. Correção de texto, P |

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
| 🟡 **Arquivo inexistente de um segmento na app manda o anônimo para o login em vez do 404** (O1) | `apps/app/proxy.ts:197-199` (o caminho com extensão passa pelo proxy sem checar o idioma) · `apps/app/lib/server/authSession.ts:37` (`requireSession` redireciona para `/<segmento>/sign-in` com o segmento que veio na URL) · `apps/app/app/[locale]/` (sem `layout.tsx` que valide o segmento) | `/favicon-novo.png` responde 307 para `/favicon-novo.png/sign-in` e, depois de três redirecionamentos, cai em `/pt-br/sign-in?redirect=...` (medido pelo `/test` da PR #41 em build). O comentário de `isStaticAssetPath` (`apps/app/proxy.ts:127-133`) diz que esse ramo existe para não mandar visitante ao login. Com dois segmentos (`/x/y/nao-existe.txt`) o 404 sai certo. Correção provável, não testada: `notFound()` quando o segmento `[locale]` não está em `locales`. P |
| 🟢 **Redirecionamento sem fim com `NEXT_PUBLIC_DEFAULT_LOCALE` fora da lista** | `apps/app/proxy.ts:203`, `:213` · `apps/web/proxy.ts:99`, `:110` · `packages/internationalization/utils.ts:21-24` (`getDefaultLocale()` não valida) · `packages/next-config/keys.ts:27` (`z.string().optional()`) | Com `NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR`, `/` vai para `/pt-BR/`, que não é idioma válido, e o proxy redireciona de novo sem fim. Erro de configuração do fork, não de quem usa o produto. O `getDictionary()` já cai em `pt-br` nesse caso (`resolveLocale`, `utils.ts:27-38`), então só o proxy fica preso. Correção provável: os proxies usarem `resolveLocale(getDefaultLocale())`, ou o schema da env aceitar só os três valores. P |
| 🟢 **`getDictionary` e `getTranslations` ficam expostas como Server Actions** (O3) | `packages/internationalization/server.ts:1` (`"use server"`) | O build registra as duas no manifesto de Server Actions, e qualquer `POST` com o id certo recebe o dicionário inteiro (o `/test` usou isso para medir o critério 3). O conteúdo é o texto público da UI, então o risco é baixo. Trocar a diretiva por `import "server-only"` muda o contrato do módulo e pede conferir os chamadores client. P |
| 🟢 **O `next start` da web registra `Cannot assign to read only property 'redirects'`** | `apps/web/next.config.ts:15` (provável: `nextConfig.redirects = redirects` grava no objeto `config` importado de `@repo/next-config`) | Visto pelo `/test` da PR #41 no log do build de produção, fora do diff. Causa e efeito **não investigados**: se a atribuição falha, o redirecionamento `/legal` → `/legal/privacy` de produção (`next.config.ts:7-13`) pode não existir. O primeiro passo é medir, em `next build && next start`, se `/legal` ainda redireciona para `/legal/privacy`. A auditoria não sobe app (`cycle-policy` §3.1) |

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
na §13.3, já tinha linha neste arquivo e não conta como novo.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O `HookFormInputPassword` desabilita o campo durante o envio, e o foco sai do campo** | `packages/design-system/components/form/hookform/hookformInputPassword.tsx:80` (`disabled={formState.isSubmitting}`) · nove call sites, entre eles `apps/app/.../sign-in/components/SignInForm.tsx` e `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx` | O navegador tira o foco de um campo desabilitado. Dentro de um `AlertDialog`, o `FocusScope` do Radix o devolve ao contêiner; fora dele, não há quem o segure. A PR #43 corrigiu o efeito nos dois diálogos de conta com um `onError` no call site, e o `/review` mostrou o limite disso: uma recusa que chegue antes de o React reabilitar o campo (erro lançado no SDK antes do `axios`) perde o foco em silêncio, porque `focus()` em campo desabilitado não faz nada. A raiz, trocar `disabled` por `readOnly` durante o envio, ficou fora (D7 do plano). **Medido por leitura em 2026-10-14:** no login das duas apps, `form.handleSubmit` chama `signIn.mutate` sem aguardar (`SignInForm.tsx:131-136`), então o campo fica desabilitado só durante a validação, e quem envia com Enter perde o foco antes de a recusa chegar. O jsdom 27.0.1 do repo não aplica o "focus fixup" (um `input` focado que recebe `disabled` segue como `activeElement`), então só o navegador mede o efeito. P no design system, com nove call sites a percorrer. Recomendação #1 da segunda passada. **◐ Fechado no working tree, pendente de merge** (3ª passada): `readOnly` no lugar de `disabled` (`hookformInputPassword.tsx:83`, `hookformInput.tsx:77` no working tree) e o `useSubmitEnterGuard` contra o Enter repetido; o `/test` mediu o foco no campo depois da recusa no login das duas apps e nos dois diálogos |
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
| Recusa que chega antes de o campo voltar a habilitado | **continua aberta**, condicional | nenhuma das nove medições do `/test` caiu nesse caso; só vale cobrir junto com o achado do `HookFormInputPassword` |
| T1 sem o `SidebarRail` no celular | **continua aberta**, risco baixo | no celular a barra vira `Sheet`; o rótulo é o mesmo do caso de desktop |
| Troca de idioma sem recarregar nos componentes com `getDictionary()` sem Vitest | **fechada no navegador**, sem teste | o `/test` mediu pt-br → en → es → pt-br no painel comum, no admin e na landing; o jsdom não reproduz a troca de rota do App Router |
| T6 com um código de recusa só | **continua aberta**, aceitável | o `onError` não lê o código, então outro código percorre a mesma linha |
| Recusa `ACCOUNT_CURRENT_PASSWORD_INVALID` e sucesso no diálogo de e-mail | **continua aberta**, 🔒 | exige a Resend (pendência 13) |
| Diálogo de preferências de cookies | **continua aberta**, 🔒 | o consentimento só aparece com um ID do Google Analytics; o rótulo "Fechar" do `Dialog` está no Vitest |
| `Pagination` do design system no navegador | **fora de escopo** | o componente não tem consumidor; o texto está no `componentCopy.test.tsx` |
| Seletores de idioma e de tema da web a 390 px | **fora de escopo** | o cabeçalho esconde os dois nessa largura; o menu mobile sem nome já é achado |

### 🆕 Achados da PR #44 (2026-10-14)

Vindos do plano (§13.3), do `/review` e do `/test` (§"Achados para o backlog") da tarefa `date-input-locale`,
conferidos no código em `fa7041b`. Todos existiam antes do diff; nenhum bloqueou a entrega. O estouro do header da
web em es a 1280 px ampliou o achado do header deslogado, na linha dele.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O calendário do `DateInput` abre no mês atual, não no da data escolhida, e o campo de nascimento só navega mês a mês** | `packages/design-system/components/ui/date-input.tsx:95-102` (o `Calendar` recebe `selected`, sem `defaultMonth`) · `react-day-picker` 9.13.0, `helpers/getInitialMonth.js:13-14` (`month \|\| defaultMonth \|\| today`) · `EntityFormFields.tsx:154-157` (nascimento, sem seletor de mês e ano) | Medido pelo `/test` da PR #44: com `1990-04-17`, o popover abre em "outubro 2026". Chegar a abril de 1990 pela navegação são 438 cliques em "mês anterior". O seletor de mês e ano já existe no `Calendar` (`captionLayout="dropdown"`, traduzido pela PR #44), sem consumidor. Ligá-lo para todo `DateInput` limitaria a navegação a cem anos atrás até o fim do ano corrente (`helpers/getNavMonth.js:33-44`). **◐ Fechado no working tree, pendente de merge** (2026-10-14, segunda passada): `date-input-navigation` passa `defaultMonth={selected}` (`date-input.tsx:101` no working tree) e liga o seletor só no nascimento (`EntityFormFields.tsx:155`) |
| 🟡 **A data inicial do formulário de contato da web diverge na hidratação quando o dia do servidor difere do dia do navegador** | `apps/web/app/[locale]/contact/components/contact-form-client.tsx:21` (`useState(new Date())`) | Medido pelo `/test` da PR #44 em build: com a web em `TZ=Pacific/Kiritimati` e o navegador em `America/Sao_Paulo`, o HTML do servidor trouxe "14 de outubro de 2026", o DOM final "13 de outubro de 2026", e o React lançou o erro #418 (`text`). Na Vercel (UTC), acontece das 21h às 23h59 no horário de Brasília. A página é maquete, mas é o destino do CTA principal da home (`hero.tsx:36`). Existia antes da PR #44: o `format` já rodava com `new Date()` dos dois lados. Hipótese de correção, não testada: não pré-selecionar a data, ou preenchê-la num `useEffect`. **◐ Fechado no working tree, pendente de merge**: a `/contact` passou a usar o `DateInput`, começando vazia (`contact-form-client.tsx:13`, `:71-72` no working tree); zero erros no repro do fuso, em build |
| 🟢 **O formulário de contato usa `initialFocus`, `@deprecated` no react-day-picker 9** | `contact-form-client.tsx:108` · `react-day-picker` 9.13.0, `types/props.d.ts:316-318` ("Use autoFocus instead") | Funciona hoje; some numa versão maior da biblioteca. Do plano da PR #44 (§13.3). **◐ Fechado no working tree, pendente de merge**: `git grep initialFocus` em `apps` e `packages` no working tree dá 0 |
| 🟢 **O `Calendar` grava `data-day` com `toLocaleDateString()` do navegador** | `packages/design-system/components/ui/calendar.tsx:229` | O atributo segue o idioma e o formato do navegador, não o da página. Invisível hoje: nenhum teste nem CSS do repo o lê (`git grep data-day` fora do componente: 0). Vira defeito se alguém passar a depender dele. Do plano da PR #44 (§13.3). P |
| 🟢 **Um caso de `dateInputLocale.test.tsx` só passa enquanto o relógio está em outubro de 2026** (novo, 2026-10-14, do plano de `date-input-navigation` §1.3) | `packages/design-system/__tests__/dateInputLocale.test.tsx:204-218` | O caso abre o `DateInput` com `2026-10-13` e clica no dia 20 de outubro; sem `defaultMonth`, o calendário abre no mês corrente, e em novembro de 2026 a grade não tem dias de outubro. O teste não muda: o `defaultMonth` de `date-input-navigation` faz o calendário abrir no mês do valor. **◐ Fechado no working tree, pendente de merge.** A sonda de novembro nunca rodou contra o código antigo (lacuna do `/test`) |
| 🟢 **A 390 px, o campo de nascimento fica atrás do rodapé fixo de `/entities/edit`** (novo, 2026-10-14) | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` (formulário de edição) · `Footer` de `apps/app/shared/components/ui/` | Medido pelo `/test` de `date-input-navigation` em build: sem rolar, o clique no botão "Data de nascimento" cai no rodapé (Voltar/Salvar). Rolando, o campo aparece e funciona. O relatório trata como o layout de sempre da tela; não medido no `HEAD` nem em outros formulários com o mesmo rodapé. P, e pede medição antes de correção |
| 🟢 **Clicar no botão de enviar tira o foco do botão, e no login ele fica no `body` depois da recusa** (novo, 2026-10-14, 3ª passada, do plano de `form-field-focus-and-names`) | `packages/design-system/components/ui/button.tsx:72` (no working tree; `loading` liga `disabled`) | O botão focado fica `disabled` durante o pedido, e o navegador tira o foco dele. Nos dois diálogos de conta, o `onError` devolve o foco à senha; no login, não. Lido no código; **não medido** no navegador para o clique (o `/test` mediu o Enter no campo, que passou a manter o foco). Resolver pede `aria-disabled` no lugar de `disabled` no `Button`, que muda a semântica de todo botão do repositório. Os outros seis `HookForm*` que ainda ligam `disabled` no envio (`hookformTextarea.tsx:58`, `hookformSelect.tsx:90`, `hookformSwitch.tsx:65`, `hookformDateInput.tsx:54`, `hookformImageUpload.tsx:57`, `hookformRadioGroup.tsx:57`) não enviam o formulário com Enter, então só perderiam o foco por este caminho |
| 🟢 **O asterisco de obrigatório do `Label` do design system entra no nome acessível, e a cor dele não existe** (novo, 2026-10-14, 3ª passada) | `packages/design-system/components/ui/label.tsx:27` (`<span className="text-error-500">*</span>`, sem `aria-hidden`) | Um campo `required` que usa este `Label` (`DateInput`, `TextareaInput`, `RadioGroupInput`, `ImageUploadInput`) teria o nome "Gênero *". O `FormLabel` dos `HookFormInput*` já esconde o asterisco com `aria-hidden` (`hookformInputPassword.tsx:66-72` no working tree). `git grep error-500` em `apps` e `packages`, fora do `label.tsx`: 0, então a classe não gera cor e o asterisco sai na cor do rótulo. Latente: nenhum consumidor passa `required` a esses quatro componentes hoje. Do plano de `form-field-focus-and-names` (§1.3). P |
| 🟢 **O `RadioGroupInput` recebe `required` e não repassa ao Radix** (novo, 2026-10-14, 3ª passada) | `packages/design-system/components/ui/radio-group-input.tsx` (`required` só vai ao `Label`) | O grupo não publica `aria-required`. Repassar ao Radix marca também os `input` ocultos com `required`, o que liga a validação nativa do navegador dentro do `<form>`, por isso o plano deixou de fora. Latente: nenhum grupo de rádio do repositório é obrigatório. P |
| 🟢 **O `useSubmitEnterGuard` depende de o React Query entregar o estado por `setTimeout(0)`** (novo, 2026-10-14, 3ª passada; risco, não defeito) | `packages/design-system/components/form/hookform/useSubmitEnterGuard.ts` (no working tree) | O hook barra o Enter enquanto o `isSubmitting` está ligado e por um `setTimeout(0)` depois, até o botão do formulário receber o `isPending` da mutação. A janela fecha porque o React Query notifica o estado nesse mesmo tempo. Um fork que troque o scheduler do React Query (`notifyManager.setScheduler`) ou dispare a mutação de outro jeito reabre a janela, e dois Enter a 2 a 5 ms voltam a mandar dois pedidos, como o `/test` mediu antes da correção. Os testes `hookformEnterResubmit.test.tsx` e `signInEnterResubmit.test.tsx` cobrem o comportamento atual. Registrado para quem mexer no React Query |
| 🟢 **Os alertas de erro mostram "(Código do erro: <uuid>)" também em recusa esperada** (novo, 2026-10-14, 3ª passada) | `packages/shared/utils/helpers/handleClientError.ts:4-11` (anexa o `requestId` a toda resposta da API) · `formattedError.ts:112-121` | Visto pelo `/test` de `form-field-focus-and-names` nos diálogos de conta: "A senha atual está incorreta. (Código do erro: …)". O código existe para a pessoa citá-lo ao suporte (PR #15, `observability-logging`), e o `panelErrorRequestId.test.tsx:115` o exige num 404. Escolher quais recusas escondem o código (só 4xx de validação? todo 4xx?) é decisão de copy e de suporte, não técnica. Fica como achado até essa decisão |
| 🟢 **Salvar as preferências em `/es` leva para `/pt-br`, porque o formulário começa com o idioma da conta** (novo, 2026-10-14, 3ª passada) | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx:65` (o campo começa com `account.preferences.locale`) · `:89-99` (grava o cookie e navega para o idioma salvo) | Medido pelo `/test` com a conta do seed, que guarda português: quem lê a tela em espanhol e salva o tema volta para o português. É o comportamento previsto da preferência de idioma, mas surpreende quem chegou pela URL. Se o campo deve começar com o idioma da URL é decisão de produto; fica como achado |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-14 | motivo |
|--------|---------------------|--------|
| Nenhum teste renderizava o `ContactFormClient` | **fechada** pelo `/test` | `apps/web/__tests__/contactFormDateLocale.test.tsx`, 3 casos com SSR em `node`; com o arquivo anterior, 2 de 3 reprovam |
| Troca de idioma pela navegação do App Router sem teste automatizado | **continua aberta**, comportamento medido | o jsdom não reproduz a troca de rota; o `/test` mediu pt-br → en → es → pt-br com um marcador em `window`. Mesma lacuna da PR #43 |
| `captionLayout="dropdown"` sem consumidor no produto | **◐ fechada no working tree**, pendente de merge | o nascimento de `entity` é o primeiro consumidor (`EntityFormFields.tsx:155`), medido no navegador nos três idiomas |
| Precedência do `placeholder` do chamador no navegador | **continua aberta**, aceitável | os textos da trilha são iguais ao padrão, então a tela não distingue; o caso `:124` cobre |
| `DateInput` sob personificação | **fora de escopo** | o diff não mexeu no `disabled`; `entityFormsReadOnly.test.tsx` cobre |
| `locale={undefined}` explícito do chamador volta o `Calendar` ao `enUS` | **fora de escopo** | registrado pelo `/review` para quem ler a API (`calendar.tsx:200-202`); nenhum consumidor faz isso |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md).
> Na auditoria pós-PR #44 (2026-10-14) foram remedidas as linhas 6, 8, 15 e 16. As outras mantêm o veredito de
> 2026-10-04, com motivo: exigem console de provedor, ou dependem de arquivos que as PRs #40 a #44 não tocaram. A
> PR #44 não criou índice, rule, variável nem passo manual; no `docs/PRE-PRODUCTION.md`, só corrigiu a âncora do
> `sidebar_state` (o `STATE.md` registra "Pré-requisitos manuais de infra: nenhum"). Na auditoria pós-PR #39 a 23 e a 24 tiveram as âncoras corrigidas, e entrou a
> 27.

| # | pendência | onde vive | veredito (2026-10-14, pós-PR #44, nas linhas remedidas; 2026-10-04 nas demais) |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto**; não remedido nesta rodada, nada no repositório mudou |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto, medido**: o `/test` da PR #35 recebeu `503 PAGINATION_INDEX_MISSING` em `GET /entities` contra o projeto de desenvolvimento (`test/report.md:85`), então o índice não está publicado nem lá. São **seis** índices sem publicação; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido em 2026-10-14 pós-PR #44 (404, `[]`, 44 PRs, nenhuma aberta); estacionado (E3). É o que falta para o item 2 de `e2e-testing`, arquivada com esse ⚠️ |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**, remedido em 2026-10-14 pós-PR #44: `git grep` por `@sentry`, `@logtail`, `@axiomhq` e `betterstack` em `apps/` e `packages/` devolve 0; estacionado (E1) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto** em produção. Desde a PR #31, upload, avatar e o passo `storage` do expurgo rodam e têm teste sob o emulador; contra bucket real seguem sem prova o objeto que não abre sem assinatura e a expiração da URL V4 |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **metade fechada**, reconhecido na auditoria pós-PR #34: o `/test` de `compliance-docs-kit` mediu em 2026-09-30, contra o projeto Firebase de desenvolvimento, que depois de `revokeRefreshTokens` o cookie emitido antes volta `null`, o bearer volta `null` em `resolveApiActor` e `createSessionCookie` com o token anterior lança `auth/id-token-expired` (`docs/features/compliance-docs-kit/test/report.md`, tabela "Resultado bruto"). É a prova que a ressalva de `session-refresh` pedia para a camada de verificação. **Continua aberto** só o percurso de navegador: sair numa app e ver a outra perder a sessão. O `/test` da PR #35 somou a medição da conta desativada (bearer recusado com e sem revogação, e depois da reativação) e também não subiu navegador |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado. O `/test` da PR #29 deixou 🔒 o e-mail de verificação depois do cadastro pela API (critério 20). O `/test` de `brand-config` deixou 🔒 o nome da marca com acento na caixa de entrada. O `/test` da PR #33 deixou 🔒 a entrega do aviso ao endereço antigo e do link ao novo; sem Resend o pedido responde `503 EMAIL_NOT_CONFIGURED`, medido nos 3 idiomas |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #35 criou e apagou a própria conta (`PRE-PRODUCTION.md:937`). Pelos relatórios, os `/test` das PRs #37 a #39 e #41 a #44 rodaram sob o emulador (os da #43 criaram contas `@example.com`, entre elas nove `qa-ui-strings-NN@example.com`, que existiram só no emulador; o da #44 não criou conta, usou as duas do seed e criou a entidade `qa-date-input-locale-01`, também só no emulador); o console não foi aberto |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**, remedido em 2026-10-14 pós-PR #44: `git ls-remote --heads origin` devolve 43, ou seja, 42 além de `main` (eram 41; `fix/date-input-locale` ficou viva depois do merge, como as das PRs #37 a #43) |
| 17 | Login com Google sem passe manual com conta real | *(só neste arquivo)* | **continua aberto**. O `/test` da PR #24 também não percorreu o Google no emulador; o nome do Google como valor inicial do passo 1 ficou fechado só por leitura |
| 18 | `storage.rules` nunca publicado (o teste veio com a PR #31) | `PRE-PRODUCTION.md` §6 e `:54-58` | **metade fechada** pela PR #31: `storage.rules` e `firestore.rules` têm teste contra emulador no `verify` (20 e 145 testes; entrega em [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md)). **Continua aberto** publicar no projeto real, que depende da 11 |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto**. Vazia, o canal cai no formulário de contato, que é maquete |
| 23 | Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com **seis** eventos (a PR #27 acrescentou `invoice.paid` e a PR #38, `entitlements.active_entitlement_summary.updated`, `PRE-PRODUCTION.md:455`), recursos cadastrados no Dashboard para o gate por recurso, conferir o custo do Entitlements, chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **continua aberto**. A PR #33 acrescentou ao §12 habilitar a edição do e-mail no Customer Portal, porque a troca de e-mail não atualiza o `customer`. Cinco critérios de `billing-subscription`, quatro de `admin-billing-insights` o cancelamento real no arquivamento pelo admin (PR #28) , o botão de checkout em carregamento (PR #32) e a entrega real do evento de recursos (PR #38) seguem 🔒 até uma conta real existir. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |
| 24 | 🆕 `ARCJET_KEY` por fork: sem ela o rate limit é no-op, e o cadastro pela API passa a depender dela (a rota usa o Admin SDK, fora do limite do Firebase por IP) | `PRE-PRODUCTION.md` §8 (`:587-602`) | **aberto**, entrou com a PR #29. Critério 19 do `/test` da fatia 1 🔒. Desde a PR #36, a chave precisa ter o prefixo `ajkey_`: sem ele, a API trata a chave como ausente e registra um erro no boot, e o build de `app` e `web` falha (`PRE-PRODUCTION.md:599-601`). A chave válida contra a Arcjet real segue 🔒 (`/test` da tarefa `arcjet-key-lazy-validation`) |
| 25 | 🆕 Fechar o cadastro pelo REST do Identity Toolkit com a chave pública, que ainda aceita senha de 6 ou 7 (Identity Platform: password policy em `ENFORCE` ou cadastro pelo cliente desligado) | `PRE-PRODUCTION.md`, "Declaração — o que a política de senha não alcança" | **opcional, declarado**: o upgrade tem custo ou teto (3.000 DAU no Spark). Critério 18 do `/test` da fatia 1 🔒 |
| 26 | 🆕 Marca por fork: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` nos projetos `app`, `web` e `api`, logo numa URL `https` pública, ícones do produto no lugar dos padrões | `PRE-PRODUCTION.md` §13 (`:716-727`) | **aberto**, entrou com a PR #30. Sem ela, o produto sobe com o nome `next-boilerplate`; não bloqueia nada. Desde a PR #33, sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL` o aviso de troca de e-mail sai sem a linha de suporte, que é o canal para contestar (`PRE-PRODUCTION.md` §3) |
| 27 | 🆕 Custo e latência da leitura de sessão em cada requisição autenticada | *(só neste arquivo)*; a declaração de sessões do `PRE-PRODUCTION.md` (`:824`) fala da recusa, não do custo | **aberto**, entrou com a PR #39. Toda requisição autenticada lê o documento da sessão antes do guard (`session-tracker.ts:106-134`), além da leitura do perfil. No emulador, `GET /auth/session` p50 9,3 ms; em produção, latência e consumo da cota de leituras do Firestore não foram medidos (🔒 no `/test`) |

A 21 foi fechada pelo usuário em 2026-09-25. A 18 fechou pela metade em 2026-09-29, e a 12 em 2026-09-30. A 4 foi medida no projeto de desenvolvimento em 2026-09-30. A 23 cresceu com as PRs #27, #28, #32, #33 e #38; a 24 e a 25 vieram da PR #29; a 26, da PR #30, e ganhou peso com a #33. A 13 ganhou um 🔒 com a #33, e a 24, um com a #36. A 27 veio da PR #39.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

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
| Notificações in-app + preferências | 3/10 | Esforço G à mão; a referência terceiriza num serviço pago. |
| Command palette (⌘K) | 2/10 | Valor estético. |
| Metering / limites de uso / créditos | 2/10 | Fora do corte de `plan-entitlements`, entregue em 2026-10-04 com o gate por status e por recurso, sem contagem de uso. |
| Feature flags | 2/10 | Variável de ambiente basta num MVP; `ONBOARDING_ENABLED` é o exemplo mais recente. |
| Firebase App Check | — | Exige configuração de projeto por fork. |
| Waitlist / captura de lead | 2/10 | Decisão do fork. |
| **Consertar o formulário de contato da landing** | — | Não é spec, é achado. É o fallback do canal de privacidade. |
| **Migrar a listagem de usuários para o cursor** | — | O N+1 de `userRepository.list()` vem primeiro. |
| **Detector de teste instável no CI** | — | O primeiro caso foi consertado na PR #22. Em 2026-09-28 apareceu um segundo, de causa diferente, só local (`useListAuditEvents.test.tsx`, 2 falhas em 44 execuções locais até 2026-10-14, pós-PR #44; ver achados), e o CI passou. O critério de reabertura era um segundo *flake* **no CI**; este ainda não conta. Consertar o teste é tarefa direta P. |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale nas 30 últimas execuções do CI na `main`, até `fa7041b` (`gh run list --branch main --limit 30`, todas `success`, remedido em 2026-10-14 pós-PR #44). Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | A cobertura já é medida e consolidada (`pnpm coverage`, job `coverage` do CI), pela PR #26. O limiar ficou fora do corte de [`e2e-testing`](../docs/features/e2e-testing/spec.md); reavaliar depois de algumas medições. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
