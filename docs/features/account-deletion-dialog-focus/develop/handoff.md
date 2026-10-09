# Handoff do develop: o diálogo de exclusão de conta leva o foco para dentro ao abrir

Plano: `analyze/plan.md`. Rodada autônoma do `/cycle`. Nenhum processo foi iniciado nesta etapa: não houve
smoke no navegador, e tudo o que está abaixo foi medido no Vitest (jsdom) ou nos gates estáticos.

Para encurtar, `<account>` é `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account`.

## Blueprint → arquivos

| Item do plano | Arquivo | O que mudou |
|---------------|---------|-------------|
| §13.1 `handleOpenChange` com `form.reset()` ao fechar | `<account>/(components)/AccountPrivacyPanel.tsx:71-76` | Ligado ao `onOpenChange` do `AlertDialog` (`:138`) e ao `onBack` do `Footer` (`:182-184`) |
| §13.1 `handleOpenAutoFocus` | `<account>/(components)/AccountPrivacyPanel.tsx:78-83` | `event.preventDefault()` e `form.setFocus("currentPassword")`, ligado ao `onOpenAutoFocus` do `AlertDialogContent` (`:151-153`) |
| §13.2 casos T1 a T6 | `apps/app/__tests__/accountPrivacyPanel.test.tsx:208-332` | Helpers `passwordField`, `deleteTrigger`, `clickFocusedTrigger`, `openFromFocusedTrigger` e o bloco `describe("AccountPrivacyPanel — foco do diálogo de exclusão")` com 6 casos |

Os 10 casos que já existiam não foram tocados: `git diff --numstat` no arquivo de teste dá `126 0` (só
inserções, no fim do arquivo).

## Contrato

Nenhum DTO, action do SDK, rota ou schema mudou. Nenhum consumidor novo.

## Códigos de erro novos

Nenhum. Nenhuma chave de i18n nova.

## Desvios em relação ao plano

1. **Asserções fora do `it` no helper de abertura.** O esqueleto da §13.2 punha `expect` dentro de
   `openFromFocusedTrigger`, declarado no nível do módulo. O Biome recusa isso
   (`lint/suspicious/noMisplacedAssertion`, 2 erros em `npx biome check` no arquivo), então o plano estava
   errado nesse ponto. Separei em dois helpers: `clickFocusedTrigger` só foca e clica no gatilho, e
   `openFromFocusedTrigger` espera o foco chegar ao campo com um `vi.waitFor` que lança `Error` em vez de
   usar `expect`. A pré-condição continua derrubando T2 a T6 quando o foco não chega. O T1 faz as duas
   asserções do plano (`activeElement` é o campo e `dialog.contains(activeElement)`) dentro do próprio `it`.
2. **Mutação sem `onOpenAutoFocus` derruba 6 casos, não 4.** O plano previa T1 a T4 caindo. T5 e T6 também
   caem, porque abrem o diálogo por `openFromFocusedTrigger`, que exige o foco no campo. A mutação do
   `form.reset()` continua isolada: só T5 e T6 caem (ver Validação).

O comentário de duas linhas acima do `handleOpenAutoFocus` ficou. Ele explica comportamento do Radix que o
código não mostra (o autofoco vai para um `AlertDialogCancel` que este diálogo não tem), sem citar plano nem
etapa, o que cabe na exceção 2 de `.claude/rules/code-comments.md`. O texto é igual ao do diálogo de troca de
e-mail (`<account>/(components)/AccountEmailChangeDialog.tsx:89-90`). Sem ele, o `preventDefault` num evento
de foco parece engano.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Arquivo de teste | `npx vitest run __tests__/accountPrivacyPanel.test.tsx` (em `apps/app`) | 16 passed (16) |
| Suíte do app | `pnpm --filter app test` | Test Files 102 passed (102), Tests 832 passed (832) |
| Typecheck | `pnpm --filter app typecheck` | exit 0, sem diagnóstico |
| Lint | `pnpm check` | `Checked 861 files in 370ms. No fixes applied.` |

Teste de mutação, mesmo comando do arquivo de teste, com o `AccountPrivacyPanel.tsx` trocado
temporariamente e restaurado depois (16 passed na volta):

| Variante | Resultado | Casos que caem |
|----------|-----------|----------------|
| Arquivo de `HEAD` (`git show HEAD:<arquivo>`) | 6 failed, 10 passed | T1 a T6 |
| Só sem `onOpenAutoFocus={handleOpenAutoFocus}` | 6 failed, 10 passed | T1 a T6 (desvio 2) |
| Só sem `form.reset();` | 2 failed, 14 passed | T5 e T6, pela asserção final (59 ms e 67 ms, não por timeout) |

Os 10 casos antigos passam nas três variantes.

O T4 (Tab no último botão volta ao campo) funcionou no jsdom. O `fireEvent.keyDown` de Tab não move o foco
sozinho no jsdom, então o caso só passa se o `FocusScope` do Radix fizer a volta. A ressalva da §8 do plano
(remover o T4 se o jsdom não reproduzisse) não precisou ser aplicada.

## A verificar no `/test`

Nada disto foi medido em navegador:

- Abrir pelo Enter e pelo Espaço no gatilho leva o foco a `input[name="currentPassword"]`. O teste só cobre
  `focus()` seguido de `click`. Repro: §9, item 1 do plano, lendo `document.activeElement`.
- Ordem real do Tab e do Shift+Tab dentro do diálogo, incluindo o botão de mostrar senha. O T4 só cobre a
  volta do último botão ao campo. Repro: §9, item 2.
- Foco devolvido ao gatilho com "Cancelar" ativado pelo teclado (Tab até ele, Enter). Repro: §9, item 3.
- Anel de foco visível no campo de senha em claro e escuro, e o diálogo inteiro a 390 px, nos 3 idiomas.
- Para onde vai o foco depois de `ACCOUNT_CURRENT_PASSWORD_INVALID`. Observação, não critério (§9, item 6).
- Clique no overlay continua sem fechar o diálogo. Não há teste para isso.

## Lacunas de teste conhecidas

- Nenhum caso cobre a abertura por teclado (Enter/Espaço). O Radix trata o gatilho como botão, então o
  caminho é o mesmo do clique, mas isso não foi medido aqui.
- Nenhum caso cobre a limpeza do formulário depois de uma exclusão bem-sucedida. Nesse caminho o
  `useAccountDataRights` faz `signOut`, então o diálogo não volta a abrir na mesma sessão.

## Pendências e bloqueios

Nenhum. Os achados para o backlog continuam os da §13.3 do plano (`autoComplete="current-password"` e
`required` ausentes no campo de senha), sem mudança nesta etapa.

O `specs/BACKLOG.md` já estava modificado antes desta etapa e não faz parte desta tarefa.
