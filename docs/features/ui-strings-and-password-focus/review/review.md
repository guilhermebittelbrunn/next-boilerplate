# Revisão: ui-strings-and-password-focus

Revisão feita em rodada autônoma do `/cycle`, sobre o working tree que junta duas tarefas sem commit:
`account-deletion-dialog-focus` (já revisada e testada) e esta. As duas mexem em `AccountPrivacyPanel.tsx` e
no teste dele. Li o diff inteiro destas quatro áreas: `packages/design-system`, `apps/app`, `apps/web` e
`packages/internationalization`. Rodei a skill `/code-review` (nível baixo) no mesmo escopo, e ela não
apontou defeito.

Abreviação: `<account>` = `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)`.

## Branch

| Item | Valor |
|------|-------|
| Atual | `guilhermebittelbrunn/cycle-command-v2` |
| Regex do `/review` sobre a atual | `BRANCH INVALIDA: guilhermebittelbrunn/cycle-command-v2` |
| Proposta | `fix/ui-labels-and-account-dialog-focus` |
| Regex sobre a proposta | `branch OK: fix/ui-labels-and-account-dialog-focus` |
| Base | `HEAD` = `origin/main` = `dbcac2a` (`git log origin/main..HEAD` vazio) |
| Remoto | nenhuma das duas existe em `origin` (`git ls-remote --heads` vazio); a atual não tem upstream |

O PR cruza `packages/design-system`, `apps/app`, `apps/web` e `packages/internationalization`. Com mais de um
app, o padrão manda omitir o `<project>`, e a regex aceita essa forma. O tipo é `fix`: os commits de código
corrigem copy em inglês e foco perdido.

Nesta rodada não criei nem troquei branch, porque o workspace do Conductor está amarrado à branch atual. A
proposta substitui a anterior, `app/fix/account-deletion-dialog-focus`, que não cobre mais o escopo. Comando
para quem for commitar, antes do primeiro `git add`:

```bash
git switch -c fix/ui-labels-and-account-dialog-focus
```

O `switch -c` leva o working tree junto e deixa a branch do Conductor intacta. Renomear com
`git branch -m` também funcionaria (sem remoto e sem commit), mas desamarraria o workspace.

## Achados

Nenhum achado bloqueante. Nenhuma correção de código aplicada.

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

| `arquivo:linha` | Achado | Ação |
|-----------------|--------|------|
| `<account>/AccountPrivacyPanel.tsx:85-93`, `<account>/AccountEmailChangeDialog.tsx:111-112` | O `onError` só devolve o foco se a recusa chegar depois de o React reabilitar o campo. O `HookFormInputPassword` usa `disabled={formState.isSubmitting}` (`hookformInputPassword.tsx:80`), e `focus()` em campo desabilitado não faz nada. Com resposta de rede isso não acontece: o `onSubmit` dos dois diálogos é síncrono e o `isSubmitting` volta a `false` antes de a requisição terminar. Uma rejeição sem rede (erro lançado no SDK antes do `axios`) perderia o foco em silêncio. | Nenhuma. A correção de raiz é a D7 do plano (`readOnly` no lugar de `disabled`), já registrada como achado de backlog. |
| `<account>/AccountEmailChangeDialog.tsx:111-112` | O foco vai para a senha também em `USERS_AUTH_EMAIL_ALREADY_IN_USE`, quando o campo errado é o e-mail (P2 do plano). | Nenhuma. A opção (a) já foi adotada no plano; mudar exige expor `code` no `FormattedError`. |
| `<account>/AccountPrivacyPanel.tsx:85` × `<account>/AccountEmailChangeDialog.tsx:111` | O mesmo `onError` tem nome (`focusPasswordAfterRefusal`) num diálogo e é uma arrow inline no outro. | Nenhuma. Diferença cosmética, fora do que vale um commit. |
| `packages/design-system/providers/antd-app.tsx:150-154` | Os três pacotes de idioma do antd entram sempre no bundle do cliente (cerca de 12 KB sem minificar, somando os três). O import `antd/locale/pt_BR` resolve para a versão CommonJS (`lib/`), não a `es/`. | Nenhuma. É o import que a documentação do antd usa, e o dicionário do produto já carrega os três idiomas no cliente. O build do Next fica no "Verificar no `/test`". |
| `packages/design-system/components/ui/dialog.tsx:118-120` | `DialogFooter` com `showCloseButton` põe um `<button>` dentro de outro (falta `asChild`). Defeito do shadcn, anterior a esta tarefa, sem consumidor. | Nenhuma. Já está nos achados de backlog do handoff. |

### ✅ OK

- `"use client"` em `spinner.tsx:1`, `breadcrumb.tsx:2`, `pagination.tsx:1` e `PageBreadcrumb.tsx:1`. É
  obrigatório: `getDictionary()` lê `use(LocaleContext)` no servidor, e o contexto mora num módulo client
  (`packages/internationalization/client.ts:1`). Conferi os consumidores. `Container.tsx`, o `/playground`,
  `cases-client.tsx` e `testimonials-client.tsx` já são client. `Header.tsx` e `FullScreenLoader.tsx` não
  têm a diretiva, mas só são importados por componentes client. O único caso em Server Component é o
  `Button` (`button.tsx`, sem diretiva) montando `<Spinner aria-hidden>` em `loading`; ali o `Spinner` vira
  fronteira client com props serializáveis, o que funciona. `pagination.tsx` não tem consumidor. O
  `@repo/internationalization/client` já estava no bundle das duas apps (o `header/index.tsx:36` da web já
  chama `getDictionary()`), então a diretiva não traz módulo novo ao cliente.
- O `breadcrumb.tsx` tem o `"use client"` logo depois de um comentário `biome-ignore-all`. Comentário antes
  da diretiva é aceito.
- `getDictionary()` dentro do design system segue o padrão de `action-menu.tsx`, `table.tsx`,
  `select/index.tsx` e `hookformInputPassword.tsx`. O `AntdAppProvider` usa `useDictionary()`, como manda o
  `apps/app/CLAUDE.md:47` para componente acima do segmento `[locale]`. Nas duas apps o `LocaleProvider`
  envolve o provider do antd (`apps/app/app/layout.tsx:79`, `apps/web/app/[locale]/layout.tsx:34`). Fora do
  provider (um `global-error`, por exemplo) o `getDictionary()` cai no idioma padrão e não quebra.
- `PageBreadcrumb.tsx`: das 105 linhas do diff, 12 inserções e 3 remoções são reais (`git diff -w`). O resto
  é a reindentação que o Biome fez quando o corpo virou bloco. `withLocalePath(locale, "/")` devolve
  `/<locale>` (`localePath.ts:15-17`).
- O `required` do `HookFormInputPassword` não chega ao `<input>`: a prop é desestruturada
  (`hookformInputPassword.tsx:33-41`) e vira só `aria-required` e o asterisco. A validação nativa do
  navegador não entra na frente da mensagem do Zod.
- O `errorAlert` é um toast do `react-toastify` (`useAlert.ts`), que não toma foco. Ele não disputa com o
  `setFocus` dentro do `AlertDialog`.
- Tarefa 1 sem regressão na leitura: `handleOpenChange` (`:71-76`), `handleOpenAutoFocus` (`:80-83`),
  `onOpenChange={handleOpenChange}` (`:143`), `onOpenAutoFocus` (`:157`) e o `onBack` (`:190`) estão como o
  `review.md` daquela tarefa aprovou. Os 6 casos dela continuam no arquivo (`accountPrivacyPanel.test.tsx:249`
  em diante), e os 2 novos ficam num `describe` separado (`:364`).
- O teste T6 (`accountEmailChangeDialog.test.tsx:203`) não foi ajustado para passar: ele reproduz a ordem
  de uma resposta de rede. Envia, espera o campo voltar a habilitado, confere que o foco **não** está na
  senha e só então rejeita. A mutação do handoff (sem o `onError`, T4 e T6 reprovam) mostra que o teste
  depende da correção. O que ele não cobre é a rejeição antes do re-render, tratada no nit acima.
- i18n: 8 folhas novas com a mesma estrutura nos 3 idiomas e valores iguais aos da §13.6 do plano; nenhum
  `apiErrors`. Variáveis com nome descritivo (`modeToggleCopy`, `sidebarCopy`, `paginationCopy`,
  `languageSwitcherCopy`).
- E2E: nenhum seletor de `apps/e2e` depende dos rótulos trocados. Nenhum dos nomes novos contém, como
  substring, um nome que o Playwright procura (`getByRole` sem `exact`).
- Comentários: nenhum comentário novo no código de produção. Os dois comentários dos testes explicam
  ausência de `matchMedia`/`ResizeObserver` no jsdom, sem citar o fluxo.
- Os componentes de `packages/design-system/components/ui` mantêm o estilo de cada arquivo (2 espaços; sem
  ponto e vírgula em `sheet.tsx`, `sidebar.tsx` e `spinner.tsx`). O Biome não roda nesses caminhos.

## Correções aplicadas

Nenhuma. O código ficou como o `/develop` entregou.

## Raio de impacto

Nenhum DTO, action do SDK, rota ou `error.code` mudou. A única API pública nova é `antdLocales`, exportada
de `providers/antd-app.tsx` e usada pelo próprio provider e pelo teste.

| Componente alterado | Consumidores |
|---------------------|--------------|
| `Spinner` | `Container.tsx:28`, `FullScreenLoader.tsx:17`, `button.tsx:75` (com `aria-hidden`), `/playground` |
| `Breadcrumb` | `Header.tsx` da `apps/app` (usado em 11 telas client) |
| `Dialog` | `cookie-consent.tsx`, `command.tsx` (sem consumidor) |
| `Sheet` | `sidebar.tsx` (barra lateral mobile das duas áreas da `apps/app`) |
| `Sidebar*` | `Sidebar.tsx` e `Navbar.tsx` da `apps/app`, layouts `(common)` e `admin` |
| `ModeToggle` | `Navbar.tsx`, `(unauthenticated)/layout.tsx` (Server Component, sem mudança de fronteira), header da `apps/web`, `/playground` |
| `Carousel*` | `cases-client.tsx` e `testimonials-client.tsx` da `apps/web` |
| `Pagination*` | nenhum |
| `AntdAppProvider` | `DesignSystemProvider` (`packages/design-system/index.tsx:43`), logo toda `Table`/`Popconfirm` do antd nas duas apps |
| `LanguageSwitcher` (app), `PageBreadcrumb` | `Navbar.tsx`, `/playground` |
| `LanguageSwitcher` (web) | `header/index.tsx` |

Um `pnpm bump-ui` sobrescreve os componentes shadcn editados aqui e devolve o inglês (R3 do plano). O
`componentCopy.test.tsx` reprova se isso acontecer.

## Verificar no `/test`

Nada disto dá para confirmar lendo o código. A ordem vai do maior risco para o menor.

1. **Foco e seleção depois da recusa, nos dois diálogos.** É o que sustenta metade do corte. O jsdom provou o
   caminho com a resposta chegando depois de o campo voltar a habilitado. Repro: diálogo de exclusão, senha
   errada e Enter (`400 ACCOUNT_CURRENT_PASSWORD_INVALID`); diálogo de e-mail, qualquer envio válido no
   ambiente local (`503 EMAIL_NOT_CONFIGURED`). Medir `document.activeElement.name`, `selectionStart` e
   `selectionEnd`, e que digitar substitui a senha. Repetir clicando em "Excluir para sempre" em vez de Enter.
2. **Troca de idioma sem recarregar (R1)** para os componentes que leem `getDictionary()`, que lê estado de
   módulo e não assina contexto. Repro: na `apps/app`, trocar pt-br → en → es pelo seletor e ler, depois de
   cada troca, o nome do gatilho de tema, os itens do menu de tema, o botão da barra lateral, o seletor de
   idioma e o `aria-label` do `nav` do breadcrumb. Se algum ficar no idioma anterior, o defeito é de
   re-render e o componente precisa de `useDictionary()`.
3. **antd no build do Next (R4).** O import CommonJS de `antd/locale/*` só foi medido no Vitest. Repro:
   `pnpm --filter app build && start`, `/admin/users` como admin: "10 / página" em pt-br e es, "10 / page" em
   en, `title` dos botões de página anterior e próxima, e a troca de idioma sem recarregar. Claro, escuro e
   390 px.
4. **Hidratação.** Quatro módulos passaram a ser client e todos leem o idioma no SSR. Repro: console do
   navegador sem aviso de hydration mismatch em `/pt-br/entities`, `/en/sign-in` e na landing em `/es`.
5. **`PageBreadcrumb` no `/playground`.** O link "Início"/"Home"/"Inicio" aponta para `/<locale>` e navega sem
   404, inclusive logado como admin (o proxy pode redirecionar para `/admin`).
6. **`Sheet` mobile a 390 px.** O diálogo da barra lateral tem nome "Barra lateral"/"Sidebar"/"Barra lateral"
   e a descrição traduzida. No jsdom só passou com `useIsMobile` mockado.
7. **Layout.** Só texto mudou, mas "Próxima"/"Siguiente" é mais longo que "Next" na `Pagination` do design
   system (único consumidor: `/playground`). Claro, escuro e 390 px.
8. **Regressão de `account-deletion-dialog-focus`.** Foco ao abrir, Tab preso, Esc e Cancelar devolvendo o
   foco, limpeza ao fechar. Passada curta.

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---------------------|----------|
| T1 não cobre o `SidebarRail` no celular | continua aberta. Baixo risco: é o mesmo `sidebarCopy.toggle` que o caso de desktop já cobre |
| `CommandDialog` e `DateInput` sem teste | fora de escopo (fora do corte, §1.2 do plano) |
| Nenhum teste prova a troca de idioma sem recarregar para componentes com `getDictionary()` | continua aberta. O jsdom não reproduz a troca de rota do App Router; vai para o item 2 acima |
| T6 cobre um código de recusa só | continua aberta e aceitável: o `onError` não lê o código, então outro código percorre a mesma linha |

Lacuna nova, apontada aqui: nenhum teste cobre a rejeição que chega antes de o campo voltar a habilitado
(nit 1). Só vale cobrir se a D7 for adotada.

## Decisões em aberto

Nenhuma decisão de código. Fica uma de processo:

- **Branch.** A atual é inválida, e a proposta é `fix/ui-labels-and-account-dialog-focus`, criada com
  `git switch -c` a partir da atual. Recomendação: criar antes do primeiro `git add`.

## Gates estáticos

Não editei código, então não remedi: os números são do `develop/handoff.md`, rodados sem `--force`.

| Gate | Resultado |
|------|-----------|
| `typecheck` (design-system, app, web, internationalization) | 4/4 ok |
| `pnpm check` | exit 0, 873 arquivos |
| Paridade de i18n (`parity.test.ts`) | 2/2 |

## Segredos nos artefatos

Varri `docs/features/account-deletion-dialog-focus/` e `docs/features/ui-strings-and-password-focus/`. Os
únicos e-mails são `@example.com` (contas do seed e a conta de QA já apagada). As senhas que aparecem são
valores de teste (`wrong-secret`, `typed-secret`), e o `test/report.md` diz expressamente que não repete a
senha do seed. Os prints de `test/e2e/` são ignorados pelo `.gitignore:300`. O diff do `specs/BACKLOG.md`
também não tem e-mail nem chave.

## Plano de commits

Vale para o PR inteiro (as duas tarefas). Antes do primeiro commit, `git diff --cached --stat` tem de sair
vazio. Depois de cada commit, conferir `git show --stat --oneline HEAD` contra a lista. Todas as mensagens
terminam com o trailer `Co-Authored-By` da sessão.

**Desvio da ordem padrão.** A ordem do repo põe a i18n por último, e com ela os commits 2 a 8 não passariam
no typecheck (R5 do plano), porque o código lê chaves que só existiriam no fim. Aqui a i18n vem primeiro: o
commit dela só acrescenta chaves e não tem consumidor, então fica verde sozinho, e cada commit seguinte
encontra as chaves no lugar. Pelo mesmo motivo, o mock do `sharedFooterPendingState.test.tsx` vem antes do
`Spinner`: sem a chave `components.spinner.loading`, aquele teste da `apps/app` quebra com `TypeError` assim
que o `Spinner` passa a ler o dicionário. Uma chave a mais no mock não afeta nada antes disso.

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `feat(internationalization): add copy for shared component labels` | `packages/internationalization/translations/components/index.ts` + as 8 folhas em `components/ui/` |
| 2 | `test(app): add the spinner label to the footer dictionary mock` | `apps/app/__tests__/sharedFooterPendingState.test.tsx` |
| 3 | `fix(design-system): translate the accessible labels of shared components` | 8 componentes de `components/ui/` + `__tests__/componentCopy.test.tsx` |
| 4 | `fix(design-system): render antd components in the active locale` | `providers/antd-app.tsx` + `__tests__/antdLocale.test.tsx` |
| 5 | `fix(app): translate the language switcher and page breadcrumb` | `LanguageSwitcher.tsx`, `PageBreadcrumb.tsx`, `__tests__/sharedComponentCopy.test.tsx` |
| 6 | `fix(app): keep focus on the password field of the account deletion dialog` | `AccountPrivacyPanel.tsx` + `__tests__/accountPrivacyPanel.test.tsx` (commit misto, ver abaixo) |
| 7 | `fix(app): return focus to the password after a refused email change` | `AccountEmailChangeDialog.tsx` + `__tests__/accountEmailChangeDialog.test.tsx` |
| 8 | `fix(web): translate the language switcher label` | `header/language-switcher.tsx` + `__tests__/languageSwitcher.test.tsx` |
| 9 | `docs(specs): audit the backlog after PR #42` | `specs/BACKLOG.md` |
| 10 | `docs(features): account-deletion-dialog-focus` | `docs/features/account-deletion-dialog-focus/` |
| 11 | `docs(features): ui-strings-and-password-focus` | `docs/features/ui-strings-and-password-focus/` |

O commit 6 sai misto porque separar as duas tarefas no mesmo arquivo exigiria `git add -p`, que é interativo
e não roda neste ambiente (a §6 da `cycle-policy` aceita, com o porquê na mensagem). Corpo sugerido:

```
fix(app): keep focus on the password field of the account deletion dialog

Opening the dialog now moves focus to the password field, and closing it
clears the typed password and validation errors. When the API refuses the
deletion, focus returns to the field with its text selected. The field
also gets autocomplete="current-password" and required.

These are two changes in one file; they ship together because splitting
them would need an interactive partial add.
```

Comandos, um bloco por commit:

```bash
git diff --cached --stat   # tem de sair vazio

# 1
git add packages/internationalization/translations/components/index.ts \
  packages/internationalization/translations/components/ui/breadcrumb.ts \
  packages/internationalization/translations/components/ui/carousel.ts \
  packages/internationalization/translations/components/ui/dialog.ts \
  packages/internationalization/translations/components/ui/language-switcher.ts \
  packages/internationalization/translations/components/ui/mode-toggle.ts \
  packages/internationalization/translations/components/ui/pagination.ts \
  packages/internationalization/translations/components/ui/sidebar.ts \
  packages/internationalization/translations/components/ui/spinner.ts

# 2
git add apps/app/__tests__/sharedFooterPendingState.test.tsx

# 3
git add packages/design-system/components/ui/breadcrumb.tsx \
  packages/design-system/components/ui/carousel.tsx \
  packages/design-system/components/ui/dialog.tsx \
  packages/design-system/components/ui/mode-toggle.tsx \
  packages/design-system/components/ui/pagination.tsx \
  packages/design-system/components/ui/sheet.tsx \
  packages/design-system/components/ui/sidebar.tsx \
  packages/design-system/components/ui/spinner.tsx \
  packages/design-system/__tests__/componentCopy.test.tsx

# 4
git add packages/design-system/providers/antd-app.tsx \
  packages/design-system/__tests__/antdLocale.test.tsx

# 5
git add apps/app/shared/components/ui/LanguageSwitcher.tsx \
  apps/app/shared/components/ui/PageBreadcrumb.tsx \
  apps/app/__tests__/sharedComponentCopy.test.tsx

# 6
git add "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx" \
  apps/app/__tests__/accountPrivacyPanel.test.tsx

# 7
git add "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountEmailChangeDialog.tsx" \
  apps/app/__tests__/accountEmailChangeDialog.test.tsx

# 8
git add "apps/web/app/[locale]/components/header/language-switcher.tsx" \
  apps/web/__tests__/languageSwitcher.test.tsx

# 9
git add specs/BACKLOG.md

# 10
git add docs/features/account-deletion-dialog-focus/

# 11
git add docs/features/ui-strings-and-password-focus/
```

Título de PR sugerido: `fix: translate shared UI labels and keep focus in the account dialogs`. Depois do
último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin fix/ui-labels-and-account-dialog-focus`.

### Commits realizados

(preenchido pelo orquestrador depois de commitar)
