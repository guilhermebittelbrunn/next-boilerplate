# Plano: o diálogo de exclusão de conta leva o foco para dentro ao abrir

Tarefa direta, sem spec. Origem: a recomendação para a próxima rodada da auditoria em `specs/BACKLOG.md`
(`:183-213`) e o achado da tabela em `:793`. Plano feito em rodada autônoma do `/cycle`: as decisões tomadas
sem perguntar estão na §12, e a §11 traz as perguntas já com a opção adotada.

As referências `arquivo:linha` do repo foram conferidas neste checkout em 2026-10-08. As de biblioteca apontam
para `node_modules/.pnpm/<pacote>/node_modules/`, abreviado aqui como `<nm>/`. O `radix-ui` 1.6.7 que o
design system importa resolve para `@radix-ui/react-alert-dialog` 1.1.23, `@radix-ui/react-dialog` 1.1.23 e
`@radix-ui/react-focus-scope` 1.1.16.

Para encurtar, `<account>` é `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account`.

## 0. Sumário do desenho

- O `AlertDialogContent` de `<account>/(components)/AccountPrivacyPanel.tsx:137` ganha
  `onOpenAutoFocus`, que cancela o autofoco do Radix e chama `form.setFocus("currentPassword")`. É a mesma
  correção do diálogo de troca de e-mail (`<account>/(components)/AccountEmailChangeDialog.tsx:91-94` e
  `:117`).
- O fechamento passa por um `handleOpenChange` que limpa o formulário (`form.reset()`), como o diálogo de
  troca de e-mail faz (`AccountEmailChangeDialog.tsx:82-87`). Hoje a senha digitada e a mensagem de erro
  sobrevivem a um "Cancelar" e reaparecem quando o diálogo abre de novo (medido, §1.1). Desvio do pedido
  original, registrado na §11, pergunta 2.
- Sem `onCloseAutoFocus`: aqui o diálogo abre por um `AlertDialogTrigger`, e o Radix já devolve o foco a ele
  ao fechar (medido, §1.1). O diálogo de troca de e-mail precisa do handler porque abre por um botão de fora.
- Um arquivo de produção e o teste dele. Sem SDK, API, i18n, variável de ambiente, dependência ou infra.

## 1. Contexto

### 1.1 Problema

O `AlertDialogContent` do Radix cancela o autofoco de abertura do `FocusScope` e foca o `cancelRef`
(`<nm>/@radix-ui/react-alert-dialog/dist/index.mjs:58-60`). Só o `AlertDialogCancel` preenche esse ref
(`:92-94`). O diálogo de exclusão monta os botões com o `Footer` do app
(`AccountPrivacyPanel.tsx:159-167`, `apps/app/shared/components/ui/Footer.tsx:56-74`), que usa `Button`
comum. Ninguém preenche o `cancelRef`, então o foco não se move e fica no botão "Excluir minha conta", atrás
do overlay.

Com o foco fora do contêiner, o `FocusScope` não prende o Tab: o `keydown` que faz a volta fica no próprio
contêiner (`<nm>/@radix-ui/react-focus-scope/dist/index.mjs:107-132`), e o `focusin` de fora tenta voltar
para `lastFocusedElementRef`, que ainda é `null` (`:39-46`). O relatório da troca de e-mail descreve o efeito
no navegador para o diálogo gêmeo: o Tab percorria o resto da página antes de chegar ao primeiro campo
(`docs/features/account-email-change/test/report.md:86-93`), e o mesmo relatório anota que o diálogo de
exclusão "mostra o mesmo resultado" (`:94-95`, `:100-102`).

Medi o estado atual com um teste temporário no Vitest (jsdom), com os mesmos mocks de
`apps/app/__tests__/accountPrivacyPanel.test.tsx`, já removido do working tree:

| Passo | Resultado hoje |
|-------|----------------|
| Foca o gatilho, clica, espera 50 ms | `document.activeElement` é o gatilho; `dialog.contains(activeElement)` é `false` |
| Digita no campo de senha, clica em "Cancelar" | O diálogo fecha e o foco volta ao gatilho |
| Abre de novo | O campo de senha mostra o valor digitado antes |
| Envia vazio, aparece "obrigatório", fecha pelo Esc | O diálogo fecha e o foco volta ao gatilho |
| Abre de novo | A mensagem de campo obrigatório continua lá |

A retenção vem de o `useForm` morar no painel (`AccountPrivacyPanel.tsx:66-69`), que continua montado depois
que o Radix desmonta o conteúdo do diálogo. O `shouldUnregister` padrão do RHF é `false`, então valor e erro
ficam no estado do formulário.

Isso falha o WCAG 2.4.3 (ordem do foco, nível A). A exclusão de conta é o direito do titular que todo fork
herda da `data-rights-lgpd`, e a `accessibility-conformance` declarou o nível AA.

### 1.2 Objetivo e corte

Dentro do corte:

1. Abrir o diálogo, pelo mouse ou pelo teclado (Enter ou Espaço no gatilho), leva o foco ao campo "Senha
   atual".
2. Com o foco dentro, o Tab e o Shift+Tab ficam presos no diálogo. Isso é comportamento do `FocusScope` do
   Radix e passa a funcionar sozinho quando o foco entra.
3. Esc e "Cancelar" devolvem o foco ao botão "Excluir minha conta". Já acontece hoje; vira teste de
   regressão.
4. Fechar o diálogo limpa a senha e as mensagens de validação.
5. O resto do fluxo fica igual: senha obrigatória, campo vazio recusado sem requisição, bloqueio durante a
   personificação, conta sem provedor de senha encaminhada ao canal de privacidade, e os dez casos atuais do
   teste verdes.

Fora do corte:

- Mexer no `AlertDialogContent` do design system ou no `Footer` do app (§12, D1).
- Unificar `requiresPrivacyChannel` com `lacksPasswordProvider` (`specs/BACKLOG.md:794`). É dívida do mesmo
  arquivo, mas não muda comportamento.
- `autoComplete="current-password"` e a prop `required` no campo de senha, que o diálogo de troca de e-mail
  tem (`AccountEmailChangeDialog.tsx:143-148`) e este não. Achado para o backlog (§13.3).
- Para onde vai o foco quando a API recusa a senha (`ACCOUNT_CURRENT_PASSWORD_INVALID`). O `/test` observa e
  registra; não é critério desta tarefa (§9, item 6).

### 1.3 Apps impactados

| App/pacote | Impacto |
|------------|---------|
| `apps/app` | `AccountPrivacyPanel.tsx` e `apps/app/__tests__/accountPrivacyPanel.test.tsx` |
| `apps/web`, `apps/api`, `packages/*` | Nenhum |

Área: painel comum, aba Privacidade da página de conta. Vale nos dois modos de produto (`subscription` e
`simple`) e não depende de plano.

`contends_on`: `<account>/(components)/AccountPrivacyPanel.tsx` e
`apps/app/__tests__/accountPrivacyPanel.test.tsx`. Nenhuma spec viva declara algum deles
(`specs/BACKLOG.md:208`).

### 1.4 Fontes

- `specs/BACKLOG.md:183-213` (recomendação e critério de pronto) e `:793` (achado).
- `docs/features/account-email-change/test/report.md:84-115` e `review/review.md:37-40`: diagnóstico e
  correção do diálogo gêmeo.
- Código do Radix citado na §1.1.

Nenhuma referência ficou sem leitura.

### 1.5 A raiz está no componente compartilhado?

Não. O `AlertDialogContent` do design system (`packages/design-system/components/ui/alert-dialog.tsx:52-73`)
só repassa props ao primitivo do Radix. Focar o cancelar é decisão do Radix para diálogo destrutivo, e o
componente entrega o `AlertDialogCancel` para isso (`:168-180`). O defeito aparece quando o call site troca o
rodapé do Radix pelo `Footer` do app.

Os quatro `AlertDialogContent` de `apps/app`:

| Call site | Rodapé | Situação |
|-----------|--------|----------|
| `AccountSecurityForm.tsx:125` | `AlertDialogCancel` (`:135`) | Sem defeito |
| `AccountSessionsPanel.tsx:154` | `AlertDialogCancel` (`:164`) | Sem defeito |
| `AccountEmailChangeDialog.tsx:115` | `Footer` | Corrigido no call site (`:117`) |
| `AccountPrivacyPanel.tsx:137` | `Footer` | Esta tarefa |

`apps/web` não usa `AlertDialogContent`. São dois call sites com `Footer`, um já corrigido, abaixo do limite
de três da `.claude/cycle-policy.md` §3. A correção fica no call site.

### 1.6 Conta sem provedor de senha

O diálogo só existe quando `requiresPrivacyChannel(account)` é `false` (`AccountPrivacyPanel.tsx:106-115`):

| `account` | O que renderiza | Alvo do foco |
|-----------|-----------------|--------------|
| Com provedor `password` (e-mail e senha, com ou sem Google vinculado) | Gatilho e diálogo | Campo "Senha atual" |
| Só Google ou outro provedor sem senha | Bloco "Exclusão pelo canal de privacidade", sem gatilho nem diálogo | Não se aplica: não há diálogo para abrir |
| `undefined` (conta carregando) | Gatilho e diálogo (`:40-44`) | Campo "Senha atual" |

Sempre que o diálogo existe, ele tem o campo de senha, então o alvo não precisa de fallback. A API recusa a
exclusão sem provedor de senha com `ACCOUNT_DELETION_REAUTH_UNSUPPORTED`
(`apps/api/app/(routes)/account/deletion/route.ts:48-52`).

Durante a personificação o gatilho fica desabilitado (`AccountPrivacyPanel.tsx:130`) e o diálogo não abre.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. O erro de senha incorreta (`ACCOUNT_CURRENT_PASSWORD_INVALID`, `deletion/route.ts:61-69`) já tem
tradução em `apiErrors` (`packages/internationalization/translations/packages/shared/utils.ts:38`, `:169`,
`:300`).

## 5. Front-end

### 5.1 `AccountPrivacyPanel.tsx`

- `handleOpenChange(nextOpen)`: com `nextOpen` falso chama `form.reset()` (volta ao `defaultValues`
  `{ currentPassword: "" }` e limpa os erros) e depois `setConfirmOpen(nextOpen)`. Entra no `onOpenChange` do
  `AlertDialog` (Esc) e no `onBack` do `Footer` ("Cancelar").
- `handleOpenAutoFocus(event)`: `event.preventDefault()` e `form.setFocus("currentPassword")`. Entra no
  `onOpenAutoFocus` do `AlertDialogContent`.
- O `form.setFocus` alcança o `<input>`: o `HookFormInputPassword` espalha o `field` (com o `ref`) no `Input`
  (`packages/design-system/components/form/hookform/hookformInputPassword.tsx:75-85`), que encaminha o ref
  (`packages/design-system/components/ui/input.tsx:11-31`). O RHF registra o ref no commit, antes do efeito
  do `FocusScope` que dispara o evento de autofoco.
- Um comentário de uma ou duas linhas acima do `handleOpenAutoFocus` explica por que o foco precisa ser
  levado à mão (o Radix foca um `AlertDialogCancel` que este diálogo não tem). É a exceção 2 de
  `.claude/rules/code-comments.md`: comportamento de biblioteca que a leitura do código não mostra. Sem
  citar plano, etapa ou ID.

### 5.2 Estados

| Estado | Comportamento esperado |
|--------|------------------------|
| Diálogo aberto | Foco em "Senha atual" |
| Envio com senha vazia | Mensagem "obrigatório", sem requisição, diálogo aberto |
| Envio em andamento | Botão "Excluir para sempre" com `loading` e desabilitado (`Footer.tsx:43`, `:71`) |
| API recusa a senha | Alerta com a mensagem de `ACCOUNT_CURRENT_PASSWORD_INVALID`, diálogo aberto |
| API aceita | Alerta de sucesso e `signOut` (`useAccountDataRights.tsx:64-69`) |
| Fechado por Esc ou "Cancelar" | Foco no gatilho; senha e erro limpos na próxima abertura |

## 6. i18n

Nenhuma chave nova. Os textos do diálogo já existem nos três idiomas
(`packages/internationalization/translations/apps/app/pages/common/account.ts:181-199`, `:396-414`,
`:612-630`).

## 7. Autorização e segurança

Nada muda no servidor: a rota de exclusão continua exigindo a senha
(`apps/api/app/(routes)/account/deletion/route.ts:57-71`). Limpar a senha ao fechar evita que ela fique no
estado do formulário e reapareça no campo para quem abrir o diálogo de novo na mesma aba. Sob personificação o
gatilho segue desabilitado e o `Footer` também (`AccountPrivacyPanel.tsx:130`, `:162`).

## 8. Testes

Nível: componente, no jsdom, no arquivo que já existe (`apps/app/__tests__/accountPrivacyPanel.test.tsx`),
com os mocks dele. Nenhum teste precisa de emulador ou app de pé, porque o objeto é o comportamento do
componente.

Bloco novo `describe("AccountPrivacyPanel — foco do diálogo de exclusão")`, no molde de
`apps/app/__tests__/accountEmailChangeDialog.test.tsx:280-360`:

| # | Caso | Hoje |
|---|------|------|
| T1 | Foca o gatilho, clica: o foco vai para `input[name="currentPassword"]` e fica dentro do `alertdialog` | Falha |
| T2 | Com o foco no campo, Esc fecha e o foco volta ao gatilho | Falha na pré-condição (foco no campo) |
| T3 | Com o foco no campo, "Cancelar" fecha e o foco volta ao gatilho | Falha na pré-condição |
| T4 | Com o foco no campo, foca "Excluir para sempre" (último tabulável) e dispara `keyDown` Tab: o foco volta ao campo de senha | Falha na pré-condição |
| T5 | Digita uma senha, cancela, abre de novo: o campo está vazio | Falha (medido, §1.1) |
| T6 | Envia vazio, vê "obrigatório", fecha pelo Esc, abre de novo: a mensagem sumiu | Falha (medido, §1.1) |

Sobre o T4: ele prova que a volta do Tab funciona quando o foco está dentro. O `FocusScope` trata isso no
`keydown` do contêiner (`<nm>/@radix-ui/react-focus-scope/dist/index.mjs:107-132`), e a lista de tabuláveis
dele depende de `getComputedStyle`. Se o jsdom não reproduzir a volta, o `desenvolvedor` remove o T4,
registra no handoff e o Tab fica só com o `/test` (§9, item 2).

Mutação a conferir no `/develop`: sem a linha `onOpenAutoFocus={handleOpenAutoFocus}`, T1 a T4 falham; sem o
`form.reset()`, T5 e T6 falham. Os dez casos atuais continuam verdes sem alteração. O "fecha o diálogo no
cancelar" (`:156-166`) segue valendo com o `onBack` passando pelo `handleOpenChange`.

Comando: `pnpm --filter app test` (o arquivo sozinho: `vitest run __tests__/accountPrivacyPanel.test.tsx`
dentro de `apps/app`).

## 9. O que o `/test` vai percorrer

Ambiente: `pnpm --filter app build && start` (e a `api`), contra o emulador do Firebase com `pnpm seed`. Conta
`user@example.com` do seed (senha em `.claude/dev-credentials.local.md` ou no script do seed; não grave em
artefato). A conta do seed **não** deve ser excluída, porque outros fluxos dependem dela.

Fluxos, todos com `agent-browser`:

1. **Abrir pelo teclado.** Conta → aba Privacidade. Tab até "Excluir minha conta" e Enter; numa segunda
   volta, Espaço. Ler `document.activeElement`: tem de ser `input[name="currentPassword"]`, dentro de
   `[role=alertdialog]`.
2. **Tab preso.** A partir do campo, Tab várias vezes (campo, mostrar senha, "Cancelar", "Excluir para
   sempre", volta ao campo) e Shift+Tab no campo (vai para "Excluir para sempre"). Nenhum elemento fora do
   diálogo recebe foco. Anotar a ordem lida.
3. **Esc e "Cancelar".** Com o foco no campo, Esc: o diálogo fecha e o foco está em "Excluir minha conta".
   Repetir com "Cancelar" ativado pelo teclado (Tab até ele, Enter).
4. **Abrir pelo mouse.** Clique no gatilho: o foco vai para o campo do mesmo jeito.
5. **Limpeza ao fechar.** Digitar algo, cancelar, abrir de novo: campo vazio. Enviar vazio, ver a mensagem de
   obrigatório, Esc, abrir de novo: sem mensagem.
6. **Senha errada.** Digitar uma senha errada com ao menos 6 caracteres (abaixo disso o schema recusa no cliente com a mensagem `validation.min`, `<account>/(validations)/accountDeletionSchema.ts:15-19`) e confirmar: alerta com a mensagem de
   `ACCOUNT_CURRENT_PASSWORD_INVALID` no idioma ativo, diálogo aberto, nenhuma exclusão. Anotar onde o foco
   fica depois do erro (dentro do diálogo, no `body` ou em outro lugar). Não reprova a tarefa: se cair fora,
   vira achado, porque o mesmo vale para o diálogo de troca de e-mail.
7. **Exclusão de verdade (opcional).** Só com uma conta de QA criada no cadastro, por exemplo
   `qa-account-deletion-focus@example.com`, nunca com a do seed: confirmar com a senha certa, ver o alerta de
   sucesso e a saída para o login. Listar a conta criada no relatório, conforme a §8 da política.
8. **Personificação.** Admin personificando um usuário comum: "Excluir minha conta" desabilitado, o diálogo
   não abre por clique nem por teclado.
9. **Conta sem senha.** Se houver conta só Google no emulador, a aba mostra o bloco do canal de privacidade e
   não há diálogo. Sem essa conta, fica coberto pelo teste Vitest atual (`:170-179`) e vira 🔒 no navegador.

Combinações: pt-br, en e es ("Excluir minha conta" / "Delete my account" / "Eliminar mi cuenta"; "Cancelar" /
"Cancel" / "Cancelar"), claro e escuro, desktop (1280 px) e 390 px. O anel de foco do campo de senha precisa
estar visível nos dois temas. O diálogo inteiro precisa caber a 390 px.

Não verificável sem ferramenta própria: o anúncio do leitor de tela (🔒). Nada depende de infra externa.

## 10. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Abrir o diálogo leva o foco ao campo de senha**
  Na aba Privacidade, ativar "Excluir minha conta" pelo clique, pelo Enter ou pelo Espaço abre o diálogo com o
  foco no campo "Senha atual". O foco não fica no gatilho atrás do overlay nem no `body`. Vale nos três
  idiomas e com a conta ainda carregando (`account` indefinido), caso em que o diálogo também aparece.

- [ ] **O Tab fica preso no diálogo**
  Com o diálogo aberto, Tab e Shift+Tab percorrem só o campo de senha, o botão de mostrar senha, "Cancelar" e
  "Excluir para sempre", voltando ao início depois do último. Nenhum elemento da página atrás do overlay
  recebe foco. Vale em desktop e a 390 px.

- [ ] **Esc e "Cancelar" devolvem o foco ao gatilho**
  Esc ou "Cancelar" (por clique ou teclado) fecham o diálogo sem disparar a exclusão, e o foco volta ao botão
  "Excluir minha conta". O clique no overlay continua sem fechar o diálogo, como o Radix define para
  `alertdialog`.

- [ ] **Fechar o diálogo limpa a senha e os erros**
  Depois de digitar uma senha e cancelar, ou de ver a mensagem de campo obrigatório e fechar pelo Esc, abrir o
  diálogo de novo mostra o campo vazio e sem mensagem. A senha não reaparece em nenhum caso.

- [ ] **O fluxo de exclusão continua igual**
  A exclusão só sai com a senha preenchida; o envio com o campo vazio mostra a mensagem de obrigatório e não
  faz requisição. Senha errada mostra o alerta de `ACCOUNT_CURRENT_PASSWORD_INVALID` no idioma ativo e mantém o
  diálogo aberto. Os dez casos atuais de `accountPrivacyPanel.test.tsx` passam sem alteração.

- [ ] **Personificação e conta sem senha não mudam**
  Durante a personificação o gatilho e o botão de confirmar ficam desabilitados e o diálogo não abre. Conta que
  só entra pelo Google vê o bloco do canal de privacidade, sem gatilho e sem diálogo, então não há foco a
  levar.

- [ ] **Teste que falha no código anterior**
  Os casos novos de foco (abertura, Esc, "Cancelar", Tab) e de limpeza falham com o
  `AccountPrivacyPanel.tsx` anterior e passam com o novo. Tirar a linha do `onOpenAutoFocus` derruba os de
  foco; tirar o `form.reset()` derruba os de limpeza.

- [ ] **Tema, idioma e largura**
  O diálogo aparece inteiro e legível em claro e escuro, em desktop e a 390 px, com os textos em pt-br, en e
  es. O anel de foco do campo de senha é visível nos dois temas.

- [ ] **Gates verdes em build de produção**
  `pnpm check`, `pnpm --filter app typecheck` e a suíte passam, e o roteiro da §9 é medido em
  `build && start` contra o emulador com `pnpm seed`.

## 11. Perguntas em aberto

Nenhuma bloqueia a implementação. As duas já têm a opção adotada.

1. **Corrigir no call site ou no componente compartilhado?**
   Opções: (a) `onOpenAutoFocus` no `AccountPrivacyPanel.tsx`, como o diálogo de troca de e-mail; (b) o
   `AlertDialogContent` do design system cair para o primeiro tabulável quando não há `AlertDialogCancel`;
   (c) o `Footer` do app aceitar ser renderizado como `AlertDialogCancel`.
   **Adotada: (a).** São dois call sites, um já corrigido, abaixo do limite de três da política (§1.5). (b)
   muda o comportamento do Radix para todo fork e todo diálogo futuro. (c) acopla o `Footer`, usado em todo
   formulário do app, a um primitivo de diálogo.

2. **Limpar o formulário ao fechar entra nesta tarefa?**
   Opções: (a) entra, com `form.reset()` no fechamento; (b) fica como achado no backlog.
   **Adotada: (a).** É defeito medido no mesmo diálogo (§1.1): a senha digitada volta ao campo depois de
   "Cancelar". A política manda corrigir defeito encontrado no caminho (§3), o diálogo gêmeo já faz isso
   (`AccountEmailChangeDialog.tsx:82-87`), e o custo é uma função no mesmo arquivo e dois casos no mesmo
   teste. Se você preferir o pedido estrito, basta tirar o `form.reset()` e os casos T5 e T6.

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada e por quê |
|---|---------|----------------------------------|
| D1 | Correção no call site | Componente compartilhado: pergunta 1 |
| D2 | Foco inicial no campo "Senha atual" | "Cancelar", como o Radix faria com `AlertDialogCancel`: o diálogo só serve para digitar a senha, e o gêmeo foca o primeiro campo. Focar "Excluir para sempre" está fora de questão em ação destrutiva |
| D3 | Sem `onCloseAutoFocus` | Copiar o handler do gêmeo: aqui há `AlertDialogTrigger` e o Radix já devolve o foco a ele (`<nm>/@radix-ui/react-dialog/dist/index.mjs:154-156`, medido na §1.1). O handler e um `ref` a mais seriam código sem efeito |
| D4 | Não usar `AlertDialogCancel` no rodapé | Trocar o `Footer` pelo par `AlertDialogCancel`/botão de envio: o foco iria para "Cancelar", não para o campo, e o rodapé ficaria diferente do diálogo gêmeo |
| D5 | Limpar o formulário em todo fechamento | Limpar só no "Cancelar": o Esc deixaria a mesma retenção |
| D6 | Testes no arquivo existente | Arquivo novo: o `contends_on` declarado já é este arquivo, e os mocks são os mesmos |
| D7 | Comentário curto acima do `handleOpenAutoFocus` | Sem comentário: o `preventDefault` num evento de foco parece erro para quem não conhece o `cancelRef` do Radix |

## 13. Blueprint técnico

### 13.1 `<account>/(components)/AccountPrivacyPanel.tsx`

```diff
     const form = useForm<AccountDeletionFormValues>({
         resolver: zodResolver(schema),
         defaultValues: { currentPassword: "" },
     });

+    const handleOpenChange = (nextOpen: boolean) => {
+        if (!nextOpen) {
+            form.reset();
+        }
+        setConfirmOpen(nextOpen);
+    };
+
+    // Radix's AlertDialog sends the opening focus to an AlertDialogCancel, and this
+    // dialog has none (its buttons come from Footer), so focus would stay behind it.
+    const handleOpenAutoFocus = (event: Event) => {
+        event.preventDefault();
+        form.setFocus("currentPassword");
+    };
+
     const onSubmit = (values: AccountDeletionFormValues) => {
@@
                         <AlertDialog
-                            onOpenChange={setConfirmOpen}
+                            onOpenChange={handleOpenChange}
                             open={confirmOpen}
                         >
@@
-                            <AlertDialogContent>
+                            <AlertDialogContent
+                                onOpenAutoFocus={handleOpenAutoFocus}
+                            >
@@
                                         <Footer
                                             backLabel={deleteCopy.cancel}
                                             confirmLabel={deleteCopy.confirm}
                                             disabled={isImpersonating}
                                             isLoading={
                                                 deleteAccountMutation.isPending
                                             }
-                                            onBack={() => setConfirmOpen(false)}
+                                            onBack={() => handleOpenChange(false)}
                                         />
```

Nenhum import novo. O `pnpm fix` decide a quebra de linha.

### 13.2 `apps/app/__tests__/accountPrivacyPanel.test.tsx`

Esqueleto do bloco novo, depois de `"AccountPrivacyPanel — excluir conta"`:

```tsx
function passwordField(): HTMLInputElement {
    const field = document.querySelector('input[name="currentPassword"]');
    if (!field) {
        throw new Error("o campo de senha não foi renderizado");
    }
    return field as HTMLInputElement;
}

function deleteTrigger(): HTMLButtonElement {
    const trigger = screen
        .getAllByRole("button", { name: privacyCopy.delete.action })
        .at(-1);
    if (!trigger) {
        throw new Error("o botão que abre o diálogo não foi renderizado");
    }
    return trigger as HTMLButtonElement;
}

async function openFromFocusedTrigger() {
    const trigger = deleteTrigger();
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("alertdialog");
    await vi.waitFor(() => expect(document.activeElement).toBe(passwordField()));
    expect(dialog.contains(document.activeElement)).toBe(true);
    return { trigger, dialog };
}

describe("AccountPrivacyPanel — foco do diálogo de exclusão", () => {
    it("leva o foco ao campo de senha quando o diálogo abre", async () => { /* T1 */ });
    it("devolve o foco ao botão que abriu ao fechar pelo Esc", async () => { /* T2 */ });
    it("devolve o foco ao botão que abriu ao cancelar", async () => { /* T3 */ });
    it("mantém o Tab dentro do diálogo", async () => { /* T4 */ });
    it("limpa a senha digitada ao cancelar", async () => { /* T5 */ });
    it("limpa a mensagem de validação ao fechar pelo Esc", async () => { /* T6 */ });
});
```

- T2: `fireEvent.keyDown(passwordField(), { key: "Escape" })`, depois `waitFor` do `alertdialog` sumir e do
  foco no gatilho.
- T3: clique em `privacyCopy.delete.cancel`, `waitFor` do foco no gatilho.
- T4: `screen.getByRole("button", { name: privacyCopy.delete.confirm }).focus()`,
  `fireEvent.keyDown(document.activeElement, { key: "Tab" })`, `waitFor` do foco no campo de senha.
- T5: `fireEvent.change(passwordField(), { target: { value: "typed-secret" } })`, cancelar, reabrir, esperar
  `passwordField().value === ""`.
- T6: clicar em `privacyCopy.delete.confirm` com o campo vazio, `findByText(validation.required)`, Esc,
  reabrir, `queryByText(validation.required)` nulo.

O `openDeleteDialog` existente pode passar a usar `deleteTrigger()`; não é obrigatório.

### 13.3 Achados para o backlog (o `/spec --sync` registra)

- O campo de senha do diálogo de exclusão não tem `autoComplete="current-password"` nem `required`, que o
  diálogo de troca de e-mail tem (`AccountPrivacyPanel.tsx:152-157` contra
  `AccountEmailChangeDialog.tsx:143-148`).
- Se o `/test` medir o foco fora do diálogo depois de uma recusa da API (§9, item 6), o achado vale para os
  dois diálogos que usam o `Footer`.

### 13.4 Ordem de implementação e de commit

| # | Commit | Arquivos |
|---|--------|----------|
| 1 | `fix(app): move focus into the account deletion dialog when it opens` | `<account>/(components)/AccountPrivacyPanel.tsx`, `apps/app/__tests__/accountPrivacyPanel.test.tsx` |
| 2 | `docs(features): account-deletion-dialog-focus` | `docs/features/account-deletion-dialog-focus/**` |

O `form.reset()` vai no commit 1. Separar exigiria `git add -p` no mesmo arquivo e no mesmo teste, e a
política aceita o commit misto nesse caso; o corpo da mensagem cita as duas mudanças.

O `specs/BACKLOG.md` já estava modificado neste checkout antes desta etapa (reescrita da auditoria). Ele não
pertence a nenhum dos dois commits acima. Antes do primeiro commit, `git diff --cached --stat` precisa sair
vazio.

### 13.5 Env e infra

Nenhuma variável de ambiente, dependência, índice, regra, rota ou chave de tradução nova.

Pré-requisitos manuais de infra: nenhum. O `/test` usa só o emulador local e o `pnpm seed`, que já existem.

Rollback: reverter o commit 1.
