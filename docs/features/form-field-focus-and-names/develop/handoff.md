# Handoff do develop: form-field-focus-and-names

Implementação do plano em `analyze/plan.md` sem desvio de decisão. Divide o working tree com a
`date-input-navigation`, que não foi tocada: os arquivos de código dela (`date-input.tsx`,
`EntityFormFields.tsx`, `contact-form-client.tsx`, testes) e o `specs/BACKLOG.md` ficaram como estavam. No
`AGENTS.md` entrou só a linha desta tarefa.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 13.1 senha: `readOnly` no envio, placeholder do chamador vence | `packages/design-system/components/form/hookform/hookformInputPassword.tsx` |
| 13.2 texto: `readOnly` no envio | `packages/design-system/components/form/hookform/hookformInput.tsx` |
| 13.3 grupo de rádio com `aria-labelledby` | `packages/design-system/components/ui/radio-group-input.tsx` |
| 13.4 botão: conteúdo em `opacity-0` sob o spinner, `disabled={loading \|\| disabled}` depois do spread | `packages/design-system/components/ui/button.tsx` |
| 13.5 footers sem a fusão `disabled \|\| isLoading` | `apps/app/shared/components/ui/Footer.tsx`, `apps/app/shared/components/ui/PageFormFooter.tsx`, docstring de `apps/app/__tests__/sharedFooterPendingState.test.tsx` |
| 13.6 documentação | `AGENTS.md` (1 linha na seção "Label e erros") |
| 8.1 teste novo | `packages/design-system/__tests__/hookformSubmitReadOnly.test.tsx` (4 casos × 2 componentes) |
| 8.2 casos novos | `packages/design-system/__tests__/hookformInputPassword.test.tsx` (+3) |
| 8.3 teste novo | `packages/design-system/__tests__/radioGroupInput.test.tsx` (5 casos) |
| 8.4 casos novos | `packages/design-system/__tests__/button.test.tsx` (+5) |

O `button.tsx` tem um comentário JSX de uma linha explicando por que é `opacity-0` e não `invisible`
(exceção 2 da regra de comentários, como o plano previu). O Biome quebrou o `<Button>` do `PageFormFooter`
em várias linhas depois da edição; só formatação.

## Contrato

Nenhum DTO, action, rota, chave de i18n ou `error.code` novo. A API pública dos componentes não mudou:
`Button`, `HookFormInput`, `HookFormInputPassword` e `RadioGroupInput` aceitam as mesmas props. O que muda é
comportamento:

- `Button` com `loading` fica desabilitado mesmo com `disabled={false}`; em carregamento renderiza `icon` e
  `children` (transparentes) e o spinner na mesma célula de grid. Parado, o DOM é o de antes. Atinge todo
  consumidor do `Button` (lista no §5.4 do plano).
- `HookFormInput` e `HookFormInputPassword` ficam `readOnly`, e não `disabled`, durante o `handleSubmit`.
- `RadioGroupInput` com `label` publica `aria-labelledby`. Consumidores: `EntityFormFields.tsx` e
  `AccountPreferencesForm.tsx` via `HookFormRadioGroup`.

## Desvios

Nenhum em relação ao plano. Conferências feitas antes de implementar, que confirmaram premissas dele:

- O botão de mostrar senha (`Button` do `@base-ui/react`) não é o botão padrão do formulário, porque o
  `useButton` define `type="button"` em botão nativo (`node_modules/@base-ui/react/esm/use-button/useButton.js:73`).
  A premissa do R1 (o botão padrão é o `type="submit"` desabilitado durante o pedido) se sustenta.
- Os `id` do `FormControl` (`components/ui/form.tsx:58`) terminam em `-form-item`, e o caso G2 confere isso
  no `div role="radiogroup"`.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Casos novos no código anterior | `corepack pnpm exec vitest run __tests__/button.test.tsx __tests__/radioGroupInput.test.tsx __tests__/hookformInputPassword.test.tsx __tests__/hookformSubmitReadOnly.test.tsx` (em `packages/design-system`, antes da mudança de produção) | 9 reprovados, 17 aprovados de 26. Reprovaram exatamente R1 (nos dois componentes), P1, G1, G2, G5, B1, B2 e B3 |
| Mesmos arquivos no código novo | mesmo comando | 26/26 |
| Suíte do design system | `corepack pnpm --filter @repo/design-system test` | antes 146 testes / 11 arquivos; depois 167 / 13 (+21, todos novos) |
| Suíte da app | `corepack pnpm --filter app test` | antes 845 / 105; depois 845 / 105 |
| Suíte da web | `corepack pnpm --filter web test` | antes 95 / 16; depois 95 / 16 |
| Mutação do teste dos footers | `button.tsx` com a ordem antiga (`disabled={loading}` antes do spread), rodando `vitest run __tests__/sharedFooterPendingState.test.tsx` em `apps/app` | 2 de 5 reprovam ("o Footer bloqueia o envio enquanto carrega" e "o PageFormFooter bloqueia..."). Arquivo restaurado depois. O teste dos footers agora prova a trava dentro do `Button` |
| Lint | `corepack pnpm check` | 881 arquivos, sem erro |
| Typecheck | `corepack pnpm --filter @repo/design-system typecheck`, `--filter app`, `--filter web` | os três sem erro |
| Paridade de i18n | não rodada | nenhum arquivo de `packages/internationalization` mudou |

Nenhuma asserção de teste existente foi alterada. Em `sharedFooterPendingState.test.tsx` mudou só o
docstring. `accountPrivacyPanel.test.tsx` e `accountEmailChangeDialog.test.tsx` passaram sem edição, dentro
dos 845 da app. A E2E tem um `toBeDisabled()` em `apps/e2e/tests/panelSwitch.spec.ts:54`, num botão com
`disabled` explícito e sem `loading`, caso coberto pelo B4.

Smoke local: não subi app nem browser.

## A verificar no `/test`

O jsdom não aplica "focus fixup" e não calcula layout, então estes pontos não foram medidos aqui. O roteiro
completo está no §9 do plano.

1. **Foco depois de Enter no login (app 3000 e web 3001).** Senha errada, Enter no campo de senha:
   `document.activeElement` é `input[name="password"]` depois do toast e nenhum `focusout` do campo no log.
   Repetir com Enter no e-mail.
2. **Enter duplo.** Dois Enter rápidos com senha errada: um único `accounts:signInWithPassword` na aba de
   rede. Dois pedidos reprovam o critério.
3. **Diálogos de conta.** Exclusão (senha errada) e troca de e-mail (`EMAIL_NOT_CONFIGURED`): sem
   `focusout` do campo entre o Enter e o alerta.
4. **Largura do botão em carregamento.** `MutationObserver` em `aria-busy` lendo
   `getBoundingClientRect().width`, comparado com a largura parado, no "Salvar" de `/entities/edit/<id>`, no
   "Atualizar" da tabela de `/entities` e em "Baixar meus dados". Diferença abaixo de 1 px, spinner
   centralizado, claro, escuro e 390 px.
5. **Nome dos grupos de rádio na árvore de acessibilidade.** "Gênero"/"Gender"/"Género" em
   `/entities/create` e "Tema"/"Theme"/"Tema" nas preferências da conta, e escolha por setas continua
   salvando.
6. **Placeholder** `••••••••` no campo de senha do login.
7. **Personificação.** Botões de enviar desabilitados em `/account` e `/entities/edit/<id>`.
8. **axe.** `pnpm e2e` sem regra nova, com a `A11Y_ALLOWLIST` vazia.

## Lacunas de teste conhecidas

- Os testes de `readOnly` provam o atributo durante o envio. Que o foco não sai do campo num navegador real
  só aparece no item 1 acima.
- O B3 confere a classe `opacity-0` e a ausência de `.sr-only`; a largura em si é o item 4.
- O nome dos grupos de rádio nos três idiomas não tem teste de unidade (decisão D8 do plano); fica no
  item 5.

## Decisões em aberto

Nenhuma nova. As perguntas P1 a P4 do plano seguem com a opção adotada lá.
