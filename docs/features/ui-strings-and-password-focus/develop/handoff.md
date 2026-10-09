# Handoff do develop: ui-strings-and-password-focus

Implementação do `analyze/plan.md` sobre o working tree que já trazia `account-deletion-dialog-focus`
(`AccountPrivacyPanel.tsx` e o teste dele) e o `specs/BACKLOG.md`. Nada disso foi revertido. Os 16 casos que
já existiam em `accountPrivacyPanel.test.tsx` continuam passando, agora junto com os 2 novos (18 no arquivo).

Sem branch, sem commit, sem `git add`.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| §5.1 copy do design system | `packages/design-system/components/ui/mode-toggle.tsx`, `sidebar.tsx`, `dialog.tsx`, `sheet.tsx`, `pagination.tsx` (+ `"use client"`), `breadcrumb.tsx` (+ `"use client"`), `carousel.tsx`, `spinner.tsx` (+ `"use client"`) |
| §5.1 antd no idioma ativo | `packages/design-system/providers/antd-app.tsx` (exporta `antdLocales`; `locale={antdLocales[locale]}` em `:163`, idioma lido com `useDictionary()`) |
| §5.2 seletor de idioma e breadcrumb | `apps/app/shared/components/ui/LanguageSwitcher.tsx`, `apps/app/shared/components/ui/PageBreadcrumb.tsx` (+ `"use client"`, `href={withLocalePath(locale, "/")}`, rótulo `apps.app.pages.common.routes.home`) |
| §5.2 foco depois da recusa (exclusão) | `AccountPrivacyPanel.tsx:85-93` (`focusPasswordAfterRefusal` no `onError` do `mutate`), `:174` `autoComplete="current-password"`, `:179` `required` |
| §5.2 foco depois da recusa (e-mail) | `AccountEmailChangeDialog.tsx:109-113` (`onError` ao lado do `onSuccess`) |
| §5.3 web | `apps/web/app/[locale]/components/header/language-switcher.tsx` |
| §6 i18n | 8 folhas novas em `packages/internationalization/translations/components/ui/` (`mode-toggle.ts`, `sidebar.ts`, `dialog.ts`, `pagination.ts`, `breadcrumb.ts`, `carousel.ts`, `spinner.ts`, `language-switcher.ts`), ligadas em `components/index.ts`. Valores iguais aos da §13.6 |
| §8 T1 e T2 | `packages/design-system/__tests__/componentCopy.test.tsx` (novo, 28 casos) |
| §8 T3 | `packages/design-system/__tests__/antdLocale.test.tsx` (novo, 5 casos) |
| §8 T4 e T5 | `apps/app/__tests__/accountPrivacyPanel.test.tsx` (+2 casos no fim do arquivo) |
| §8 T6 | `apps/app/__tests__/accountEmailChangeDialog.test.tsx` (+1 caso) |
| §8 T7 | `apps/app/__tests__/sharedComponentCopy.test.tsx` (novo, 6 casos) |
| §8 T8 | `apps/web/__tests__/languageSwitcher.test.tsx` (novo, 3 casos) |
| §8 mocks parciais (R2) | `apps/app/__tests__/sharedFooterPendingState.test.tsx`: mock ganhou `components.spinner.loading` |

O `PageBreadcrumb.tsx` aparece com 105 linhas no `git diff --stat` porque o corpo passou de arrow com retorno
implícito para bloco, e o Biome reindentou o JSX. A mudança real é o `"use client"`, o `getDictionary()`, o
`href` e o rótulo.

## Contrato

Nenhum DTO, action do SDK ou rota de API mudou. A única API nova é `antdLocales` (export de
`packages/design-system/providers/antd-app.tsx`), usada só pelo próprio provider e pelo teste.

Consumidores dos componentes alterados do design system: `Container.tsx` e `FullScreenLoader.tsx` (Spinner),
`button.tsx:75` (Spinner com `aria-hidden`), `Header.tsx` da `apps/app` (Breadcrumb), `cookie-consent.tsx`
(Dialog), a barra lateral das duas áreas da `apps/app` (Sidebar e Sheet) e o `/playground`.

## Códigos de erro novos

Nenhum. Sem mudança em `apiErrors`.

## Desvios do plano

1. O T6 não usa `mockRejectedValue`, que o plano sugeria por analogia com o caso de `:183`. Com a rejeição
   imediata, o teste reprovou mesmo com a correção aplicada: a promessa rejeita na mesma cadeia de microtasks
   do `handleSubmit`, antes de o React re-renderizar o campo sem o `disabled` que o `HookFormInputPassword`
   aplica durante o envio (`hookformInputPassword.tsx:80`), e `focus()` em campo desabilitado não faz nada.
   O teste agora usa uma promessa adiada: envia, espera o campo voltar a habilitado e só então rejeita. É a
   ordem de uma resposta de rede real. O código de produção ficou como o plano descreveu. A ressalva entra em
   "A verificar no `/test`".
2. Pelo mesmo motivo, o T4 espera `deleteMutateMock` chamado e o campo habilitado antes de chamar o
   `onError` capturado.
3. O teste do `Dialog` não conta botões de fechar. O `DialogFooter` com `showCloseButton` renderiza
   `<DialogPrimitive.Close><Button>` sem `asChild` (`dialog.tsx:118-120`), o que gera um `<button>` dentro de
   outro, e os dois recebem o nome. O defeito já existia no shadcn e nenhuma tela usa `showCloseButton` no
   footer (`git grep showCloseButton -- apps` vazio). Não corrigi; ficou para o backlog. O teste confere o X
   (`data-slot="dialog-close"`) e o botão dentro do footer separadamente.
4. O T8 roda em `renderToString`, não em jsdom. A `apps/web` tem `environment: "node"` e não tem
   `@testing-library/react`. Segui o padrão de `headerInteractiveNesting.test.tsx` em vez de acrescentar
   dependência.

Nenhuma decisão do plano estava errada a ponto de exigir correção no código de produção.

## Riscos do plano

- R1 (troca de idioma sem recarregar): medido só para o antd. O T3 faz `rerender` do `LocaleProvider` com
  `pt-br → en → es` e o texto da paginação acompanha (`antdLocale.test.tsx`, caso "troca o idioma da
  paginação sem remontar o provider"). Para os componentes que usam `getDictionary()` (que lê estado de módulo
  e não assina contexto), o jsdom não reproduz a troca de rota do App Router. Vai para o `/test`.
- R2 (mocks parciais): um único mock quebrou, `sharedFooterPendingState.test.tsx` (2 casos com
  `TypeError: Cannot read properties of undefined (reading 'loading')`). O mock ganhou a chave
  `components.spinner.loading`; nenhum teste foi afrouxado ou desativado. Os outros sete mocks parciais
  citados no plano passaram sem mudança (suíte da `apps/app` verde).
- R4 (import de `antd/locale/*`): no Vitest, o default import resolve o objeto de idioma. O T3 lê
  `antdLocales[locale].Pagination.items_per_page` e compara com `"/ página"`/`"/ page"`. No build do Next não
  foi medido.

## Validação

Gates sem `--force`:

| Gate | Comando | Resultado |
|------|---------|-----------|
| testes + typecheck | `pnpm turbo run test typecheck --filter=@repo/design-system --filter=app --filter=web --filter=@repo/internationalization` | 15/15 tasks ok. design-system 9 arquivos/116 testes, app 103/841, web 15/90, internationalization 7/67 (inclui paridade) |
| typecheck | mesmo comando, task `typecheck` de design-system, app, web e internationalization | 4/4 ok |
| lint | `pnpm check` | exit 0, 873 arquivos |
| paridade i18n | `parity.test.ts` dentro da suíte de `@repo/internationalization` | 2/2 |

Antes desta etapa, a `apps/app` tinha 832 testes. A diferença para 841 são os 9 novos (2 + 1 + 6).

## Mutação (os testes reprovam sem a correção)

Cada mutação foi feita sobre cópias em `/tmp`, com restauração e conferência por `cmp`/`git diff --stat`
depois de cada uma.

| Mutação | Teste | Resultado com a mutação |
|---------|-------|-------------------------|
| os 8 componentes do design system voltam ao `HEAD` (`git show HEAD:<arquivo>`) | `componentCopy.test.tsx` | 22 de 28 reprovam: pt-br 9/9, es 9/9, en 4/9. Passam em en os casos em que o literal antigo coincide com a copy nova, e o T2 |
| remover `locale={antdLocales[locale]}` do `ConfigProvider` | `antdLocale.test.tsx` | 3 de 5 reprovam (pt-br, es e a troca de idioma) |
| remover o `onError` dos dois `mutate` | `accountPrivacyPanel` + `accountEmailChangeDialog` | 2 de 34 reprovam (T4 e T6) |
| remover `autoComplete` e `required` do campo da exclusão | `accountPrivacyPanel.test.tsx` | 1 de 18 reprova (T5) |
| `LanguageSwitcher.tsx`, `PageBreadcrumb.tsx` e o switcher da web voltam ao `HEAD` | `sharedComponentCopy` / `languageSwitcher` (web) | 5 de 6 reprovam / 2 de 3 reprovam (en coincide com "Switch language") |
| tirar `es.loading` de `spinner.ts` | `parity.test.ts` | 1 de 2 reprova: `es faltando: components.spinner.loading` |

## Smoke local

Não subi app nem processo. Nenhum screenshot.

## A verificar no `/test`

- Foco e seleção depois da recusa, no navegador, nos dois diálogos (§9 itens 9 e 10). O jsdom provou o
  caminho com a resposta chegando depois de o envio terminar. Repro: senha errada + Enter no diálogo de
  exclusão; no de e-mail, o `503 EMAIL_NOT_CONFIGURED` do ambiente local. Medir `document.activeElement.name`,
  `selectionStart` e `selectionEnd`.
- Troca de idioma sem recarregar (R1) para os nomes que vêm de `getDictionary()`: gatilho de tema, itens do
  menu de tema, botão da barra lateral, seletor de idioma, `nav` do breadcrumb (§9 itens 1 e 6).
- Paginação do antd na `/admin/users` em `build && start` (R4 no Next): "10 / página", "10 / page", títulos
  de anterior/próxima, e a troca de idioma sem recarregar (§9 item 7).
- `PageBreadcrumb` no `/playground`: link para `/<locale>` navegando sem 404 (§9 item 5).
- `Sheet` mobile a 390 px com nome e descrição traduzidos (§9 item 2). No jsdom isso passou com `useIsMobile`
  mockado.
- Nenhuma mudança de layout em claro, escuro e 390 px: só texto mudou, mas o "Próxima"/"Siguiente" da
  `Pagination` do design system é mais longo que "Next". O `/playground` é o único consumidor.
- Regressão de `account-deletion-dialog-focus` (§9 item 12).

## Lacunas de teste conhecidas

- O T1 não cobre o `SidebarRail` no celular nem o `CommandDialog`/`DateInput`, que ficaram fora do corte.
- Nenhum teste prova a troca de idioma sem recarregar para componentes com `getDictionary()`.
- O T6 cobre um código de recusa só (`ACCOUNT_CURRENT_PASSWORD_INVALID`). Como o `onError` não olha o código,
  outros códigos seguem o mesmo caminho, mas não há caso para cada um.

## Achados para o backlog

- `packages/design-system/components/ui/dialog.tsx:118-120`: `DialogFooter` com `showCloseButton` aninha um
  `<button>` dentro de outro (falta `asChild` no `DialogPrimitive.Close`). Sem consumidor hoje.
- Os achados da §13.3 do plano continuam valendo (`command.tsx:31-32`, menu mobile da web sem nome, `disabled`
  do `HookFormInputPassword` durante o envio). A raiz do último ficou mais clara aqui: qualquer `onError`
  que chegue antes do re-render encontra o campo desabilitado.
