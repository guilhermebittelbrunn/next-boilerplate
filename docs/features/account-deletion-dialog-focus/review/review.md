# Revisão: o diálogo de exclusão de conta leva o foco para dentro ao abrir

Rodada autônoma do `/cycle`. Esta etapa leu o código e os gates registrados no handoff. Ninguém subiu app,
abriu navegador ou rodou a suíte aqui; isso fica com o `/test`.

Para encurtar, `<account>` é `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account`, e `<nm>` é
`node_modules/.pnpm/<pacote>/node_modules/`.

## Branch

| | Nome | Regex | Situação |
|---|------|-------|----------|
| Atual | `guilhermebittelbrunn/cycle-command-v2` | `BRANCH INVALIDA` | Nome de workspace do Conductor. Sem upstream; `git log origin/main..HEAD` sai vazio (a branch aponta para `origin/main`, `dbcac2a`) |
| Proposta | `app/fix/account-deletion-dialog-focus` | `branch OK` | Não existe local nem no remoto |

Saída do gate:

```
BRANCH INVALIDA: guilhermebittelbrunn/cycle-command-v2
branch OK: app/fix/account-deletion-dialog-focus
```

Não criei nem troquei de branch: o workspace do Conductor está amarrado à branch atual, e o orquestrador pediu
para não mexer nela nesta rodada. A branch proposta sai da atual, antes do primeiro commit:

```bash
git switch -c app/fix/account-deletion-dialog-focus
```

O nome segue `<project>/<type>/<title>`: o código mexe só em `apps/app`, e a mudança corrige um defeito de
acessibilidade (`fix`).

## Revisão: `AccountPrivacyPanel` (foco e limpeza do diálogo de exclusão)

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/app/__tests__/accountPrivacyPanel.test.tsx:216-224`: `deleteTrigger()` repete a busca do gatilho que
  `openDeleteDialog()` (`:58-66`) já faz. O `openDeleteDialog` poderia chamar `deleteTrigger()`. Não apliquei,
  porque isso mexe no helper dos 10 casos antigos, que ficaram intactos de propósito (`git diff --numstat` dá
  `126 0`), e a economia é de seis linhas.
- `<account>/(components)/AccountPrivacyPanel.tsx:78-79`: o comentário repete, palavra por palavra, o de
  `AccountEmailChangeDialog.tsx:89-90`. Cabe na exceção 2 de `.claude/rules/code-comments.md` (explica um
  comportamento do Radix que o código não mostra). Se um terceiro call site puser o `Footer` dentro de um
  `AlertDialogContent`, a §3 da `.claude/cycle-policy.md` manda corrigir no componente compartilhado, e os
  comentários saem junto.

### ✅ OK

- `AccountPrivacyPanel.tsx:71-76`: `handleOpenChange` chama `form.reset()` ao fechar. O `defaultValues` é
  `{ currentPassword: "" }` (`:68`), então o campo volta vazio e os erros somem. A função está ligada ao
  `onOpenChange` do `AlertDialog` (`:138`, caminho do Esc) e ao `onBack` do `Footer` (`:182-184`, caminho do
  "Cancelar").
- `AccountPrivacyPanel.tsx:80-83`: `handleOpenAutoFocus` faz `preventDefault` e `form.setFocus("currentPassword")`.
  O Radix roda o handler do call site antes do dele e pula o próprio quando o evento chega com
  `defaultPrevented` (`composeEventHandlers` em `<nm>/@radix-ui/react-alert-dialog/dist/index.mjs:58-60`).
  O `setFocus` alcança o `<input>`: o `HookFormInputPassword` espalha o `field`, com o `ref`, no `Input`
  (`packages/design-system/components/form/hookform/hookformInputPassword.tsx:76-85`), e o `Input` repassa o
  ref ao `<input>` por `forwardRef` (`packages/design-system/components/ui/input.tsx:11`, `:29`).
- A ausência de `onCloseAutoFocus` está certa. O conteúdo modal do Radix foca `context.triggerRef` ao fechar
  (`<nm>/@radix-ui/react-dialog/dist/index.mjs:154-156`), e este diálogo abre por `AlertDialogTrigger`
  (`AccountPrivacyPanel.tsx:141`).
- Clique no overlay continua sem fechar: o `AlertDialogContent` do Radix cancela `onPointerDownOutside` e
  `onInteractOutside` (`<nm>/@radix-ui/react-alert-dialog/dist/index.mjs:61-62`), e o diff não mexe nisso.
- O diálogo só é montado quando `requiresPrivacyChannel` devolve `false` (`AccountPrivacyPanel.tsx:59`, `:120`). Sempre
  que ele existe, o campo de senha também existe, então o alvo do foco não precisa de fallback.
- Personificação: o gatilho continua desabilitado (`:144`) e o `Footer` também (`:178`).
- Fechar durante o envio: o "Cancelar" do `Footer` não usa `isBlocked` (`apps/app/shared/components/ui/Footer.tsx:56-60`),
  então já dava para fechar com a mutation em voo antes desta mudança. Agora o fechamento também limpa o
  formulário. A mutation segue igual, e nada piorou.
- Nenhuma string de UI, chave de i18n, action do SDK ou rota nova. Identificadores em inglês.
- Testes: imports explícitos de `vitest`, sem `toBeInTheDocument`, mocks nas bordas que o arquivo já tinha,
  nível de componente no jsdom (o mais barato que prova foco). O `vi.waitFor` que lança `Error` no helper
  `openFromFocusedTrigger` evita `expect` fora de `it` (`lint/suspicious/noMisplacedAssertion`). A senha de
  teste é o literal `typed-secret`.
- `/code-review` (nível low) sobre o diff: nenhum achado.

### 👁 Verificar no `/test`

Em ordem de risco. O primeiro item sustenta o corte da tarefa; o jsdom não reproduz `Presence`, animação nem a
ordem real de foco do navegador.

1. **Foco no campo ao abrir, no navegador.** O handoff mediu só no jsdom (T1). Repro: aba Privacidade, clicar
   em "Excluir minha conta" e ler `document.activeElement`. Tem de ser `input[name="currentPassword"]` dentro de
   `[role=alertdialog]`.
2. **Abertura pelo teclado (Enter e Espaço).** Nenhum teste cobre. Repro: plano §9, item 1.
3. **Ordem do Tab e do Shift+Tab.** O T4 só cobre a volta do último botão ao campo. Repro: plano §9, item 2,
   anotando a ordem (campo, mostrar senha, "Cancelar", "Excluir para sempre").
4. **"Cancelar" ativado pelo teclado devolve o foco ao gatilho.** T3 usa clique. Repro: plano §9, item 3.
5. **Limpeza ao fechar, no navegador.** T5 e T6 cobrem no jsdom. Repro: plano §9, item 5. Conferir também que o
   botão de mostrar senha volta ao estado oculto ao reabrir (o estado é local do `HookFormInputPassword`, que
   desmonta com o conteúdo do diálogo).
6. **Mutação dos testes.** O handoff afirma que a versão de `HEAD` derruba 6 casos, que tirar só o
   `onOpenAutoFocus` derruba 6 e que tirar só o `form.reset()` derruba 2 (T5 e T6). Leitura não confirma número
   de teste. Repro: em `apps/app`, trocar o arquivo por `git show HEAD:<arquivo>`, rodar
   `npx vitest run __tests__/accountPrivacyPanel.test.tsx` (esperado `6 failed, 10 passed`) e restaurar.
7. **Foco depois de `ACCOUNT_CURRENT_PASSWORD_INVALID`.** Observação, não critério (plano §9, item 6). Pista de
   leitura: o campo recebe `disabled={formState.isSubmitting}`
   (`hookformInputPassword.tsx:80`). Com o Enter dentro do campo, o input fica desabilitado durante o envio e o
   navegador pode tirar o foco dele. No envio vazio o RHF devolve o foco ao campo com erro; com senha errada
   não há erro de formulário para puxar o foco de volta. O comportamento é anterior a esta tarefa e vale também
   para o diálogo de troca de e-mail.
8. Anel de foco visível no campo de senha em claro e escuro; diálogo inteiro a 390 px; pt-br, en e es.

## Lacunas de teste

| Lacuna (herdada do handoff) | Veredito |
|-----------------------------|----------|
| Nenhum caso cobre a abertura por Enter ou Espaço | **Continua aberta.** O gatilho é um `<button>` (o `Button` via `asChild`), então Enter e Espaço geram o mesmo `click` do mouse; a medição fica com o `/test` (item 2 acima) |
| Nenhum caso cobre a limpeza depois de uma exclusão bem-sucedida | **Fora de escopo.** No sucesso o `useAccountDataRights` faz `signOut`, e o diálogo não volta a abrir na mesma sessão |

Esta revisão não abriu lacuna nova.

## Correções aplicadas

Nenhuma. O diff não tinha problema que justificasse edição, e o único nit ficou registrado acima.

## Raio de impacto

Nenhum símbolo público mudou. As funções novas são locais do componente. Nenhum DTO, action do SDK, rota,
`error.code`, chave de i18n ou prop de componente do design system. Consumidores afetados: nenhum além da aba
Privacidade da página de conta.

## Decisões em aberto

1. **Criar a branch `app/fix/account-deletion-dialog-focus` antes do primeiro commit.** Recomendação: criar a
   partir da atual com `git switch -c app/fix/account-deletion-dialog-focus`. A atual tem nome inválido para o
   padrão e não tem commit nem upstream próprios.
2. **`form.reset()` ao fechar vai além do pedido original** (pergunta 2 da §11 do plano, já adotada).
   Recomendação: manter. O defeito foi medido no mesmo diálogo, e o diálogo gêmeo já limpa o formulário. Para o
   corte estrito, basta tirar o `form.reset()` e os casos T5 e T6.

## Gates

Esta revisão não editou arquivo de código, então os números do handoff valem e não foram medidos de novo:

| Gate | Resultado (do handoff) |
|------|------------------------|
| `pnpm --filter app typecheck` | exit 0, sem diagnóstico |
| `pnpm check` | `Checked 861 files in 370ms. No fixes applied.` |
| Paridade de i18n | Não se aplica: o diff não mexe em `@repo/internationalization` |

## Segredos nos artefatos

Varredura em `docs/features/account-deletion-dialog-focus/` por senha, token, chave e e-mail. Aparecem só
`user@example.com` e `qa-account-deletion-focus@example.com` (domínio reservado) e o literal de teste
`typed-secret`. O plano manda buscar a senha do seed em `.claude/dev-credentials.local.md` e não a grava. Nada a
remover.

## Plano de commits

Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio. Depois de cada commit, conferir
`git show --stat --oneline HEAD` contra a lista de arquivos.

0. `git switch -c app/fix/account-deletion-dialog-focus`
1. `fix(app): move focus into the account deletion dialog and clear it on close`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx`
   - `apps/app/__tests__/accountPrivacyPanel.test.tsx`
2. `docs(specs): audit backlog after PR #42`
   - `specs/BACKLOG.md`
3. `docs(features): account-deletion-dialog-focus`
   - `docs/features/account-deletion-dialog-focus/`

Título de PR sugerido: `fix(app): move focus into the account deletion dialog`.

Commits realizados: _(preenchido pelo orquestrador)_
