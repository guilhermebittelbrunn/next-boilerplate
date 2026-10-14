# Plano: campos de formulário mantêm o foco, têm nome e travam no carregamento

Tarefa direta, sem spec. Vem da recomendação para a próxima tarefa em `specs/BACKLOG.md:281-330`, que junta
cinco achados abertos em três primitivos de `packages/design-system`. Plano feito na segunda rodada autônoma
do `/cycle` no mesmo working tree: divide a PR com `date-input-navigation`, que já está implementada e
revisada mas não commitada. As decisões tomadas sem perguntar estão na §12, e a §11 traz as perguntas já com
a opção adotada.

As âncoras foram conferidas neste checkout em 2026-10-14, com o working tree da `date-input-navigation` como
base. Abreviações: `<ds>` = `packages/design-system/components`, `<account>` =
`apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)`, `<radix-rg>` =
`node_modules/.pnpm/@radix-ui+react-radio-group@1.4.7_…/node_modules/@radix-ui/react-radio-group/dist/index.mjs`.

## 0. Sumário do desenho

- `<ds>/form/hookform/hookformInputPassword.tsx` e `<ds>/form/hookform/hookformInput.tsx` trocam
  `disabled={formState.isSubmitting}` por `readOnly={formState.isSubmitting}`. O campo continua sem aceitar
  digitação durante o envio, mas segue focável, então o navegador não tira o foco dele quando o usuário
  envia com Enter. O `HookFormInput` entra junto (desvio da recomendação, §12 D1).
- No mesmo `hookformInputPassword.tsx`, o `placeholder="••••••••"` passa para antes de `{...field}` e
  `{...rest}`, como o `placeholder=""` do `HookFormInput` já faz. O placeholder do chamador vence.
- `<ds>/ui/radio-group-input.tsx` dá um `id` ao `Label` (um segundo `useId()`) e passa
  `aria-labelledby` ao `RadioGroup`, antes do spread, para o chamador poder sobrescrever. O grupo passa a ter
  o rótulo como nome acessível. Nenhum consumidor muda.
- `<ds>/ui/button.tsx`: o `disabled` vira `loading || disabled` e vai depois do spread, então `loading`
  trava o botão mesmo com `disabled={false}`. Em carregamento, o conteúdo (ícone e texto) fica no layout com
  `opacity-0` e o spinner é empilhado por cima, na mesma célula de um grid. O botão mantém a largura e o
  texto continua dando nome acessível. Sem carregamento, o DOM do botão não muda.
- `apps/app/shared/components/ui/Footer.tsx` e `PageFormFooter.tsx` perdem a fusão
  `disabled || isLoading` e o comentário que a justificava, que passaria a ser falso. O docstring de
  `sharedFooterPendingState.test.tsx` é reescrito pelo mesmo motivo; as asserções ficam como estão.
- `AGENTS.md` ganha uma linha: o `RadioGroupInput` nomeia o grupo por `aria-labelledby`, porque `htmlFor` não
  rotula um `div`.
- Testes em jsdom no design system: um arquivo novo para o `readOnly`, um novo para o grupo de rádio, e casos
  novos em `hookformInputPassword.test.tsx` e `button.test.tsx`. Todos os casos novos reprovam no código
  atual. O foco no navegador fica para o `/test`, porque o jsdom 27.0.1 não aplica a regra de "focus fixup".
- Sem SDK, API, Firestore, chave de i18n, env, dependência nem infra.

## 1. Contexto

### 1.1 Problema

| Âncora | Hoje | Efeito |
|--------|------|--------|
| `<ds>/form/hookform/hookformInputPassword.tsx:80` | `disabled={formState.isSubmitting}` | quem envia com Enter no campo de senha perde o foco quando o campo fica desabilitado. Medido no navegador no diálogo de exclusão: depois da recusa da API, o foco estava no contêiner `[role=alertdialog]`, não no campo (`docs/features/account-deletion-dialog-focus/test/report.md`, passo 14 e item 7 da `:128`). No login, sem `FocusScope`, o foco vai para o `body` |
| `<ds>/form/hookform/hookformInput.tsx:74` | o mesmo `disabled={formState.isSubmitting}` | o mesmo defeito para quem aperta Enter no e-mail do login, no campo único do "esqueci a senha" ou em qualquer campo de texto do CRUD de `entity` |
| `<ds>/form/hookform/hookformInputPassword.tsx:81-83` | `{...field}`, `{...rest}` e depois `placeholder="••••••••"` | o placeholder do chamador é apagado. Latente: os dicionários passam o mesmo `"••••••••"` (`translations/apps/app/pages/signIn/index.ts:11` e vizinhos) |
| `<ds>/ui/radio-group-input.tsx:42-55` | `Label` sem `id` nem `htmlFor`; `RadioGroup` sem `aria-labelledby` | o `div role="radiogroup"` fica sem nome. O `/test` da PR #32 leu "Não informarMasculinoFemininoOutro" no grupo de gênero (`specs/BACKLOG.md:301-305`); no jsdom, o nome é vazio |
| `<ds>/ui/button.tsx:73-77` | em carregamento, o conteúdo vira `Spinner` + `<span className="sr-only">` | o botão encolhe (74 para 48 px no "Salvar", medido pelo `/test` da PR #32). O `Spinner` vira filho direto do `<button>` e casa com `has-[>svg]:px-3` (`:24`), então até o padding muda. O `icon` some |
| `<ds>/ui/button.tsx:69-71` | `disabled={loading}` antes de `{...props}` | um `disabled={false}` explícito do chamador destrava o botão em carregamento. O `Footer.tsx:40-43` e o `PageFormFooter.tsx:27-30` contornam fundindo os dois estados no chamador |

### 1.2 Conferência das afirmações da auditoria

| Afirmação | Situação |
|-----------|----------|
| `hookformInputPassword.tsx:80` com `disabled`; `:83` com o placeholder fixo depois do `{...rest}` | confere |
| Login das duas apps chama `form.handleSubmit` com `signIn.mutate`, sem aguardar (`SignInForm.tsx:131-136`; web `sign-in-form-client.tsx:63-64`) | confere. Acréscimo: nenhum dos nove formulários com senha aguarda a mutação (`grep mutateAsync` em `apps/app` e `apps/web` só acha um teste). O `isSubmitting` fica `true` só durante o resolver e o `onSubmit` síncrono. Nenhum schema tem refinamento assíncrono, então a janela se resolve em microtarefas |
| jsdom 27.0.1 mantém o `input` focado como `document.activeElement` depois de `disabled` | confere (script de uma linha em `packages/design-system`: `after disabled: a`) |
| Os dois diálogos de conta contornam no call site (`AccountPrivacyPanel.tsx:85-93`, `AccountEmailChangeDialog.tsx:111-112`); os outros sete, não | confere: são 15 usos em 9 arquivos. Ressalva: a auditoria diz que os diálogos "aguardam a mutação". Não aguardam. Os dois chamam `mutate` com `onError`, que devolve o foco ao campo depois da recusa |
| `radio-group-input.tsx:42-55` sem `htmlFor` nem `aria-labelledby`; consumidores em `EntityFormFields.tsx:146` e `AccountPreferencesForm.tsx:116` | confere. Acréscimo: o `htmlFor` não resolveria, porque o alvo seria o `div role="radiogroup"`, que não é elemento rotulável. A técnica certa é `aria-labelledby`. O Radix repassa o atributo ao `div` (`<radix-rg>:285-290`, `...groupProps`) |
| `button.tsx:73-77` encolhe; `:69-71` com `disabled` antes do spread | confere |
| `sharedFooterPendingState.test.tsx:38-40` documenta o contorno | confere. O mesmo texto está em `Footer.tsx:40-42` e `PageFormFooter.tsx:27-29`; os três ficam falsos com a correção |
| `accountPrivacyPanel.test.tsx:352` e `accountEmailChangeDialog.test.tsx:227` esperam `disabled === false` | confere, e continuam verdes: com `readOnly` o campo nunca fica `disabled`, e as duas esperas também aguardam a chamada da mutação |
| "nos diálogos que aguardam a mutação, conferir se um segundo Enter dispara um segundo pedido" | resolvido na §5.2 (R1): o Enter só envia se o botão padrão do formulário estiver habilitado, e nos nove formulários ele fica desabilitado enquanto a mutação está pendente |

### 1.3 Objetivo e corte

Corte de MVP:

1. Enviar com Enter num `HookFormInputPassword` ou num `HookFormInput` não tira o foco do campo. Depois de
   uma recusa da API, o foco continua onde estava, sem depender de `onError` no chamador.
2. Durante o envio, o campo continua sem aceitar digitação (`readOnly`).
3. O `placeholder` do chamador vence o padrão `"••••••••"` do campo de senha; sem ele, o padrão continua.
4. Todo `RadioGroupInput` com `label` (e, por ele, todo `HookFormRadioGroup`) tem o rótulo como nome
   acessível. Um `aria-labelledby` vindo do chamador vence.
5. O `Button` em carregamento mantém a largura que tinha antes de carregar, com o spinner centralizado e o
   nome acessível igual ao texto. `loading` desabilita o botão qualquer que seja o `disabled` passado.

Fora do corte, só citados (viram achados no backlog):

- **Foco perdido ao clicar no botão de enviar.** Quem clica em "Entrar" está com o foco no botão, e o botão
  fica `disabled` durante todo o pedido; o navegador tira o foco dele. Nos diálogos, o `onError` devolve o
  foco ao campo. No login, o foco fica no `body` depois da recusa. Resolver isso pede `aria-disabled` no
  lugar de `disabled` no `Button`, que muda a semântica de todo botão do repositório.
- **Os outros `HookForm*` continuam com `disabled` durante o envio** (`hookformTextarea.tsx:58`,
  `hookformSelect.tsx:90`, `hookformSwitch.tsx:65`, `hookformDateInput.tsx:54`, `hookformImageUpload.tsx:57`,
  `hookformRadioGroup.tsx:57`). Nenhum deles envia o formulário com Enter: o `textarea` quebra linha, e os
  demais são botões ou combobox que tratam a tecla sozinhos. A perda de foco só aconteceria por clique no
  botão de enviar, que é o item anterior.
- **O asterisco de obrigatório entra no nome acessível.** `<ds>/ui/label.tsx:27` renderiza o `*` sem
  `aria-hidden`, então um grupo `required` teria o nome "Gênero *". Vale igual para `TextareaInput` e
  `DateInput`, que já usam esse `Label` com `htmlFor`. Nenhum dos dois grupos de rádio do repositório é
  obrigatório. Corrigir o `Label` mexe em três compostos e é tarefa própria.
- **`required` no `RadioGroup`.** O `RadioGroupInput` recebe `required` e não repassa ao Radix. Repassar
  publicaria `aria-required`, mas o Radix também marca os `input` ocultos com `required`, e isso liga a
  validação nativa do navegador dentro do `<form>`. Fica de fora.
- **Remover o `onError` com `setFocus` dos dois diálogos** (§12 D5).

### 1.4 Apps impactados

| App/pacote | Impacto |
|------------|---------|
| `packages/design-system` | `hookformInputPassword.tsx`, `hookformInput.tsx`, `radio-group-input.tsx`, `button.tsx`; 2 testes novos e 2 editados |
| `apps/app` | `shared/components/ui/Footer.tsx`, `shared/components/ui/PageFormFooter.tsx` (sai a fusão); docstring de `__tests__/sharedFooterPendingState.test.tsx`. As telas mudam pelo design system, sem edição |
| `apps/web` | nenhuma edição; login e cadastro mudam pelo design system |
| `AGENTS.md` | 1 linha na seção "Label e erros" |
| `apps/api`, `packages/sdk`, `packages/internationalization`, demais | nenhum |

Área: pública (login, cadastro, senha), comum (conta, `entity`) e admin (criar usuário, trilha). Modo de
produto e plano: indiferentes.

### 1.5 Fontes

`specs/BACKLOG.md:281-330`; `docs/features/account-deletion-dialog-focus/test/report.md` (passo 14, `:128`,
`:162-166`); `docs/features/ui-strings-and-password-focus/analyze/plan.md:343` (D7, a troca por `readOnly`
registrada como alternativa de raiz) e `test/report.md:212`. Nenhuma referência inacessível.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhum `error.code` novo.

## 5. Front-end

### 5.1 Campos de texto durante o envio

`readOnly` no lugar de `disabled`, na mesma posição (antes de `{...field}` e `{...rest}`). Um `disabled` ou
`readOnly` passado pelo chamador continua vencendo, como hoje vence o `disabled`. Nenhum dos 15 usos do
campo de senha passa `disabled` (conferido nos 9 arquivos), e a personificação desabilita o envio pelo
`Footer` (`disabled={isImpersonating}`), não pelos campos.

O que muda para quem vê: o `Input` tem `disabled:opacity-50` (`<ds>/ui/input.tsx:23`) e nenhum estilo para
`read-only`. Durante o envio o campo deixa de esmaecer. Nos formulários atuais essa janela dura microtarefas
e não chega a ser pintada; num fork que aguarde a mutação dentro do `onSubmit`, o campo fica sem esmaecer e o
spinner do botão é a indicação de envio (§11, P2).

O `readOnly` também é anunciado como "somente leitura" por leitor de tela enquanto dura, o que pela mesma
razão não chega a acontecer nos formulários de hoje.

### 5.2 Riscos do `readOnly`

**R1. Enter repetido durante o envio.** O campo continua focado, então um segundo Enter dispara a submissão
implícita de novo. Pela especificação do HTML, a submissão implícita só acontece se o botão padrão do
formulário (o primeiro `type="submit"`) estiver habilitado. Nos nove formulários com senha ele fica
desabilitado enquanto a mutação está pendente:

| Formulário | Botão padrão |
|------------|--------------|
| login app (`SignInForm.tsx:159-166`) e web (`sign-in-form-client.tsx:91-97`) | `disabled={isLoading} loading={isLoading}` |
| cadastro app (`SignUpFormClient.tsx:186-192`) e web (`sign-up-form-client.tsx:125-131`) | `disabled` com o `isPending` das mutações |
| redefinir senha (`ResetPasswordForm.tsx:115-120`) | `disabled` e `loading` com `confirmReset.isPending` |
| diálogos de conta, segurança da conta, criar usuário | `Footer` com `isLoading` |

Fica uma janela entre o `mutate()` e o commit do React que desabilita o botão. Hoje, nessa janela, o foco já
saiu do campo e o Enter cai no `body`. Com `readOnly`, um segundo Enter nessa janela submete de novo. O
`/test` mede (§9, item 1): Enter duas vezes seguidas com senha errada tem de gerar um único pedido de login.
Se gerar dois, o defeito é registrado como achado, e a correção é bloquear o reenvio no `HookFormInput*` com
`formState.isSubmitting`, não voltar ao `disabled`.

**R2. Os testes dos diálogos.** `accountPrivacyPanel.test.tsx:347-354` espera
`mutate.calls.length === 1 && !disabled`, e `accountEmailChangeDialog.test.tsx:226-228` espera
`disabled === false` depois de a mutação ser chamada. As duas condições continuam verdadeiras, e o resto dos
testes (foco no botão de confirmar depois do clique, foco no campo depois da recusa) não depende do
`disabled`.

### 5.3 Grupo de rádio

- `const labelId = useId();` separado do `rootId`. Os `id` das opções são `${rootId}-${valor}`, e um
  segundo `useId()` evita colisão com uma opção de valor `"label"`, por exemplo.
- `<Label id={labelId} …>` e `<RadioGroup aria-labelledby={label ? labelId : undefined} … {...radioGroupProps}>`.
- O `FormControl` do `HookFormRadioGroup` (`hookformRadioGroup.tsx:53-63`) continua passando `id`,
  `aria-describedby` e `aria-invalid` pelo spread. O `hookformAria.test.tsx:82-94` segue verde.
- Clicar no texto do rótulo continua sem efeito, como hoje. Um `div` não recebe ativação de `label`.

### 5.4 Botão em carregamento

Técnica de menor raio: o DOM sem carregamento não muda (`<div className="flex items-center gap-2">` com
`icon` e `children`). Em carregamento:

```tsx
<div className="grid place-items-center">
  <div className="col-start-1 row-start-1 flex items-center gap-2 opacity-0">
    {icon}
    {children}
  </div>
  <Spinner aria-hidden="true" className="col-start-1 row-start-1" />
</div>
```

- O grid de uma célula tem a largura do conteúdo, então o botão fica com a largura de antes de carregar.
- `opacity-0` e não `invisible`: `visibility: hidden` tira o texto da árvore de acessibilidade e o botão
  ficaria sem nome. Com `opacity-0` o texto continua sendo o nome, e o axe ignora elementos com opacidade
  zero na regra de contraste.
- Nada de `relative` ou `absolute` no `<button>`. Há consumidor que posiciona o próprio botão com
  `absolute` pelo `className`, e o empilhamento por grid não interage com isso.
- O `Spinner` deixa de ser filho direto do `<button>`, então `has-[>svg]:px-3` (`button.tsx:24`) para de casar
  em carregamento e o padding fica igual ao do botão parado.
- `aria-busy` continua como está (`:64`).

Trava: `disabled` é desestruturado e o atributo vira `disabled={loading || disabled}`, depois de
`{...props}`. Sem `loading`, um `disabled` explícito continua valendo.

Consumidores que mudam de largura em carregamento (largura automática):

| Consumidor | Botão |
|------------|-------|
| `apps/app/shared/components/ui/Footer.tsx:62-73` | confirmar/enviar de todo formulário com `Footer`: `entity` criar e editar, conta (perfil, segurança, preferências, diálogos), criar e editar usuário no admin |
| `apps/app/shared/components/ui/PageFormFooter.tsx:42` | enviar |
| `<ds>/ui/table.tsx:41-48` e `:161-169` | "Atualizar" e "Carregar mais" de toda `Table` |
| `<account>/AccountSessionsPanel.tsx:93-104`, `:140-152` | encerrar sessão (`size="sm"`) e encerrar as outras |
| `<account>/AccountPrivacyPanel.tsx:109-118` | "Baixar meus dados" |
| `<account>/AccountBillingPanel.tsx:153-161` | "Gerenciar assinatura" |
| `apps/app/shared/components/ui/EmailNotVerifiedNotice.tsx:41-50` | reenviar verificação (`size="sm"`) |

Com `w-full`, a largura já não mudava e o visual fica igual: login app e web, "esqueci a senha",
redefinir senha, botões do Google no login e no cadastro da app, assinar plano em `BillingPlanCard.tsx:64-71`.

### 5.5 Footers

`Footer.tsx:40-43` e `PageFormFooter.tsx:27-30` passam a repassar `disabled={disabled}` /
`disabled={submitDisabled}` direto, com `loading` ao lado. O comentário sai, porque descreve um defeito que o
`Button` deixa de ter. A trava continua coberta pelo `sharedFooterPendingState.test.tsx`, que agora passa a
provar a fusão dentro do `Button`.

### 5.6 Estados

| Estado | Como produzir | Esperado |
|--------|---------------|----------|
| senha errada com Enter | login com um e-mail do seed e senha errada | toast de erro; foco no campo de senha, valor mantido |
| e-mail com Enter | login, foco no e-mail, Enter com senha errada já preenchida | foco continua no e-mail |
| Enter duplo | senha errada, Enter duas vezes rápido | um pedido de login |
| recusa no diálogo de exclusão | `/account`, Privacidade, senha errada, Enter | foco no campo, sem `focusout` entre o Enter e o alerta |
| recusa no diálogo de e-mail | `/account`, trocar e-mail, Enter na senha | sem Resend, a API responde `EMAIL_NOT_CONFIGURED` (503, `apps/api/app/(routes)/account/email/route.ts:77-82`) antes de olhar a senha; a recusa serve igual para medir o foco |
| grupo de rádio | `/entities/create`, `/account` preferências | grupos nomeados "Gênero" e "Tema" |
| botão carregando | qualquer `Footer` durante o pedido | mesma largura de parado, spinner no centro |
| personificação | admin personificando, `/account` e `/entities/edit/<id>` | botões de enviar desabilitados como hoje |

## 6. i18n

Nenhuma chave nova. O nome do grupo de rádio é o texto do rótulo que os consumidores já traduzem
(`entities.ts:33`, `:110`, `:187`: "Gênero", "Gender", "Género"; `account.ts:118`, `:334`, `:550`: "Tema",
"Theme", "Tema").

## 7. Autorização e segurança

N/A. Nenhuma regra de acesso muda. Sob personificação, os formulários continuam travados pelo `disabled`
que os chamadores passam ao `Footer` e aos botões; a correção do `Button` só torna essa trava mais difícil de
desfazer por engano.

## 8. Testes

Todos em jsdom, sem emulador nem app de pé. Nada aqui depende de infra. O jsdom não aplica "focus fixup",
então para o campo de senha ele prova o atributo, e o foco fica para o navegador no `/test`.

### 8.1 `packages/design-system/__tests__/hookformSubmitReadOnly.test.tsx` (novo)

Harness: `useForm`, `<Form>`, `<form onSubmit={form.handleSubmit(() => pending.promise)}>`, com `pending` um
deferred. O `handleSubmit` aguarda a promessa devolvida pelo `onSubmit`, então o `isSubmitting` fica `true`
até o teste resolver. `fireEvent.submit` no `<form>`. `it.each` sobre `HookFormInput` e
`HookFormInputPassword`.

| # | Caso | No código atual |
|---|------|-----------------|
| R1 | durante o envio, o campo tem `readOnly === true` e `disabled === false` | reprova |
| R2 | o campo focado antes do envio continua `document.activeElement` durante o envio | passa (o jsdom não tira o foco); fica como regressão de que nada no componente move o foco |
| R3 | depois de resolver, `readOnly === false` | passa; regressão |
| R4 | com `disabled` vindo do chamador, o campo continua `disabled` antes e durante o envio | passa; regressão da personificação |

### 8.2 `packages/design-system/__tests__/hookformInputPassword.test.tsx` (casos novos)

| # | Caso | No código atual |
|---|------|-----------------|
| P1 | com `placeholder="Sua senha"`, o atributo é `"Sua senha"` | reprova |
| P2 | sem `placeholder`, o atributo é `"••••••••"` | passa; regressão |
| P3 | o botão de mostrar senha continua alternando `type` mesmo com `type="password"` vindo do chamador (como `SignUpFormClient.tsx:170`) | passa; regressão de que o `type` segue depois do spread |

### 8.3 `packages/design-system/__tests__/radioGroupInput.test.tsx` (novo)

| # | Caso | No código atual |
|---|------|-----------------|
| G1 | `RadioGroupInput label="Gênero"`: `getByRole("radiogroup", { name: "Gênero" })` | reprova |
| G2 | `HookFormRadioGroup` dentro de `Form`: mesmo nome, e o `id` do `FormControl` continua no `div role="radiogroup"` | reprova no nome |
| G3 | sem `label`: o grupo não tem `aria-labelledby` | passa; regressão |
| G4 | com `aria-labelledby` do chamador apontando para outro elemento: o nome é o texto desse elemento | passa (hoje o atributo já chega ao grupo pelo spread); regressão de que o chamador vence |
| G5 | dois grupos na mesma página: os `aria-labelledby` são diferentes e cada um aponta para o próprio rótulo | reprova (hoje não há atributo) |

### 8.4 `packages/design-system/__tests__/button.test.tsx` (casos novos)

| # | Caso | No código atual |
|---|------|-----------------|
| B1 | `<Button disabled={false} loading>`: `disabled === true` | reprova |
| B2 | `<Button icon={<svg data-testid="icon" />} loading>Salvar</Button>`: o ícone continua no DOM | reprova (o ícone some) |
| B3 | em carregamento, o texto não está dentro de um `.sr-only`, e o elemento que o contém tem `opacity-0` | reprova. É o atributo que garante a largura; a largura em si é medida no navegador |
| B4 | `<Button disabled>` sem `loading`: `disabled === true` | passa; regressão |
| B5 | sem `loading`, o DOM é o de hoje: um `div.flex` com o ícone e o texto, sem spinner | passa; regressão de que o botão parado não muda |

Os três casos existentes (`:10-33`) seguem como estão. O de `:18-25` lê o primeiro `svg` do botão; sem
`icon`, continua sendo o spinner.

### 8.5 Regressão que deve seguir verde

`sharedFooterPendingState.test.tsx` (só o docstring muda), `signUpFormSubmitLock.test.tsx` (conta as
mudanças de `disabled` no botão de enviar e no do Google: sem `loading` no primeiro e com `disabled` que já
cobre o `loading` no segundo, a sequência `[true, false]` não muda), `accountPrivacyPanel.test.tsx`,
`accountEmailChangeDialog.test.tsx`, `accountSecurityForm.test.tsx`, `accountBillingPanel.test.tsx`,
`accountSessionsPanel.test.tsx`, `entityFormsReadOnly.test.tsx`, `hookformAria.test.tsx`,
`apps/web/__tests__/languageSwitcher.test.tsx` (conta `span.sr-only`, mas sem botão em carregamento) e a
paridade de i18n.

Mutação a registrar no handoff: R1, P1, G1, G2, G5, B1, B2 e B3 reprovam com o código atual.

## 9. O que o `/test` vai percorrer

App e web em `build && start`, emuladores com `pnpm seed`. Três idiomas, claro e escuro, 1280 px e 390 px.
Para foco, antes de cada envio, instalar `document.addEventListener("focusout", …)` que guarda o `name` do
alvo, e ler `document.activeElement` depois da resposta.

1. **Login da app** (`/pt-br/sign-in`): e-mail do seed, senha errada, Enter no campo de senha. Depois do
   toast, `activeElement` é `input[name="password"]`, o valor continua lá e o log de `focusout` está vazio.
   Repetir com Enter no campo de e-mail: o foco fica no e-mail. Repetir com dois Enter seguidos: um único
   pedido `accounts:signInWithPassword` ao emulador de Auth (aba de rede).
2. **Login da web** (`/pt-br/sign-in` na 3001): o mesmo roteiro do item 1.
3. **Diálogo de exclusão** (`/account`, Privacidade): senha errada, Enter. Sem `focusout` do campo entre o
   Enter e o alerta, e o foco no campo com o texto selecionado.
4. **Diálogo de troca de e-mail** (`/account`, perfil): novo e-mail válido, senha qualquer, Enter. A API
   responde `EMAIL_NOT_CONFIGURED`; sem `focusout` do campo, foco no campo. A recusa por senha errada nesse
   diálogo é 🔒 (exige Resend), mas o caminho do foco é o mesmo.
5. **Grupos de rádio**: na árvore de acessibilidade, o grupo de `/entities/create` se chama "Gênero" /
   "Gender" / "Género" e o de preferências da conta, "Tema" / "Theme" / "Tema". Escolher uma opção por
   teclado (setas) e salvar continua funcionando.
6. **Botão em carregamento**: um `MutationObserver` em `aria-busy` guarda `getBoundingClientRect().width`
   quando o atributo aparece, comparado com a largura parado. Medir no "Salvar" do `Footer` em
   `/entities/edit/<id>`, no "Atualizar" da tabela de `/entities` e em "Baixar meus dados". A largura tem de
   ser igual (diferença abaixo de 1 px), com o spinner centralizado e sem texto visível. Claro, escuro e
   390 px; no escuro, o spinner tem contraste com o fundo do botão.
7. **Placeholder**: o campo de senha do login mostra `••••••••`, igual a hoje.
8. **Personificação**: admin personificando, `/account` e `/entities/edit/<id>`: botões de enviar
   desabilitados como hoje.
9. **axe**: a suíte E2E (`pnpm e2e`) sem regra nova, com a `A11Y_ALLOWLIST` vazia (`apps/e2e/a11y/allowlist.ts:20`).

Só a recusa por senha errada no diálogo de e-mail depende de infra externa (Resend) e fica 🔒.

## 10. Critérios de aceite

- [ ] **Enter no campo de senha não perde o foco**
  No login da app e da web, com senha errada, enviar com Enter no campo de senha deixa o foco no campo depois
  da recusa, com o valor digitado preservado, e nenhum `focusout` do campo acontece entre o Enter e o toast.
  Nos diálogos de exclusão de conta e de troca de e-mail vale o mesmo: o foco não sai do campo durante o
  pedido. A recusa usada no diálogo de e-mail é `EMAIL_NOT_CONFIGURED`, porque o ambiente não tem Resend.

- [ ] **Enter num campo de texto comum não perde o foco**
  Enviar com Enter no campo de e-mail do login, ou em qualquer `HookFormInput`, deixa o foco no campo
  durante e depois do pedido. Um `disabled` passado pelo chamador continua deixando o campo desabilitado,
  inclusive sob personificação.

- [ ] **O campo não aceita digitação durante o envio**
  Enquanto o `handleSubmit` está em andamento, os campos de texto e de senha estão `readOnly` e não
  `disabled`. Terminado o envio, com sucesso ou recusa, o campo volta a aceitar digitação.

- [ ] **Enter repetido não duplica o pedido**
  Dois Enter seguidos no campo de senha do login com senha errada geram um único pedido de login. Depois do
  primeiro, o botão de enviar fica desabilitado até a resposta, e a submissão implícita não acontece com o
  botão padrão desabilitado. Se o navegador mostrar dois pedidos, o critério reprova.

- [ ] **Placeholder do chamador vence**
  Um `HookFormInputPassword` com `placeholder` mostra o texto do chamador. Sem a prop, mostra `••••••••`,
  como hoje em conta, admin e diálogos.

- [ ] **Grupo de rádio com nome**
  O grupo de gênero do formulário de `entity` se chama "Gênero", "Gender" ou "Género" conforme o idioma da
  URL, e o de tema das preferências se chama "Tema", "Theme" ou "Tema". Um grupo sem `label` não ganha
  `aria-labelledby`, e um `aria-labelledby` passado pelo chamador vence. Dois grupos na mesma página
  apontam cada um para o próprio rótulo.

- [ ] **Botão mantém a largura em carregamento**
  Um `Button` com largura automática tem a mesma largura parado e carregando (diferença abaixo de 1 px),
  com o spinner centralizado e o texto invisível, em claro, escuro e 390 px. O nome acessível continua sendo
  o texto do botão, e o ícone passado por `icon` continua ocupando espaço. Botões com `w-full` não mudam.

- [ ] **`loading` sempre trava o botão**
  `<Button loading disabled={false}>` fica desabilitado. Sem `loading`, um `disabled` explícito continua
  valendo. O `Footer` e o `PageFormFooter` travam o envio durante o pedido sem fundir os dois estados no
  próprio código, e o `sharedFooterPendingState.test.tsx` passa.

- [ ] **Testes e gates**
  Os casos R1, P1, G1, G2, G5, B1, B2 e B3 reprovam no código anterior e passam no novo. `pnpm check`, os
  `typecheck` do design system, da app e da web, e as suítes desses três workspaces passam. A suíte E2E roda
  sem regra nova do axe.

## 11. Perguntas em aberto

Todas já vêm com a opção adotada; mudar qualquer uma é barato e localizado.

| # | Pergunta | Opções | Adotada e por quê |
|---|----------|--------|-------------------|
| P1 | Incluir o `HookFormInput` na troca por `readOnly`? | (a) sim; (b) só o campo de senha, como pede a auditoria | (a). É a mesma linha com o mesmo defeito no campo de e-mail do mesmo login (`hookformInput.tsx:74`), e a política manda corrigir defeito encontrado no caminho. (b) deixaria o e-mail perdendo o foco na tela que a tarefa conserta |
| P2 | Dar um estilo de "enviando" aos campos `readOnly`? | (a) não; (b) `read-only:opacity-50` no `Input` | (a). Nos formulários atuais a janela não chega a ser pintada, e o spinner do botão já indica o envio. (b) esmaeceria todo `input readOnly` do repositório, inclusive campos só de leitura que não estão enviando |
| P3 | Remover a fusão `disabled \|\| isLoading` do `Footer` e do `PageFormFooter`? | (a) remover junto com o comentário; (b) manter a fusão e só apagar o comentário | (a). Com o `Button` corrigido, a fusão é o contorno de um defeito que deixou de existir, e o teste do `Footer` passa a provar a trava real. (b) também é seguro; fica como alternativa se o `/review` preferir não tocar a `apps/app` |
| P4 | Documentar o `aria-labelledby` do grupo no `AGENTS.md`? | (a) sim, uma linha, no mesmo commit de documentação da `date-input-navigation`; (b) não documentar | (a). O `AGENTS.md:72` manda usar `htmlFor={id}` quando o controle expõe `id`, e o grupo expõe `id` sem ser rotulável. Separar as duas linhas do mesmo arquivo em commits diferentes exigiria `git add -p` |

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Motivo |
|---|---------|------------------------|--------|
| D1 | `readOnly` também no `HookFormInput` | só no campo de senha | P1. Desvio da recomendação, registrado aqui |
| D2 | `readOnly` na mesma posição do `disabled` de hoje (antes dos spreads) | `readOnly={readOnly \|\| formState.isSubmitting}` depois dos spreads | nenhum chamador passa `readOnly`, e a posição atual preserva a regra de hoje (o chamador vence). Mudar a ordem não corrige nada observável |
| D3 | `placeholder` padrão antes dos spreads | `placeholder = "••••••••"` na desestruturação | mesma forma do `placeholder=""` do `HookFormInput` (`hookformInput.tsx:75`) |
| D4 | `aria-labelledby` com um segundo `useId()` | `htmlFor` no `Label`; `id` derivado do `rootId` | `htmlFor` não rotula `div`; um `id` derivado pode colidir com o `id` de uma opção |
| D5 | Manter o `onError` com `setFocus` nos dois diálogos | remover, já que o `readOnly` mantém o foco | ele cobre quem confirma clicando no botão, caminho em que o foco está no botão e o `readOnly` não ajuda. Os testes de `:352` e `:227` dependem dele |
| D6 | Botão: conteúdo em `opacity-0` empilhado com o spinner num grid, só em carregamento | largura mínima fixa; `invisible`; `relative`/`absolute` no `<button>`; mudar o DOM também do botão parado | largura fixa não acompanha o texto em três idiomas; `invisible` apaga o nome acessível; `relative` no `<button>` brigaria com consumidor que posiciona o botão com `absolute`; mudar o botão parado aumentaria o raio sem ganho |
| D7 | `disabled={loading \|\| disabled}` depois do spread | manter a ordem e documentar | a ordem atual é o próprio defeito, e dois chamadores já precisaram de contorno |
| D8 | Os testes do grupo ficam no design system | teste novo na `apps/app` renderizando `EntityFormFields` nos três idiomas | o nome é o texto do rótulo, e a tradução do rótulo já existe; o `HookFormRadioGroup` em G2 prova o caminho do consumidor. Os três idiomas são conferidos no navegador |
| D9 | Nada de `aria-disabled` no `Button` | `aria-disabled` no carregamento para o botão clicado não perder o foco | muda a semântica de todo botão do repositório; fica no backlog (§1.3) |

## 13. Blueprint técnico

### 13.1 `<ds>/form/hookform/hookformInputPassword.tsx`

```diff
                                 <Input
                                     aria-required={required}
                                     className={
                                         errorMessage ? "border-destructive" : ""
                                     }
-                                    disabled={formState.isSubmitting}
+                                    placeholder="••••••••"
+                                    readOnly={formState.isSubmitting}
                                     {...field}
                                     {...rest}
-                                    placeholder="••••••••"
                                     type={showPassword ? "text" : "password"}
                                 />
```

### 13.2 `<ds>/form/hookform/hookformInput.tsx`

```diff
                                 className={
                                     errorMessage ? "border-destructive" : ""
                                 }
-                                disabled={formState.isSubmitting}
                                 placeholder=""
+                                readOnly={formState.isSubmitting}
                                 {...field}
                                 {...rest}
```

### 13.3 `<ds>/ui/radio-group-input.tsx`

```diff
   const reactId = useId();
   const rootId = reactId.replace(/:/g, "");
+  const labelId = useId();

   return (
     <div className="grid gap-2">
       {label ? (
-        <Label invalid={Boolean(error)} required={required}>
+        <Label id={labelId} invalid={Boolean(error)} required={required}>
           {label}
         </Label>
       ) : null}
       <RadioGroup
+        aria-labelledby={label ? labelId : undefined}
         className={cn(
```

### 13.4 `<ds>/ui/button.tsx`

```diff
       loading = false,
       icon,
       children,
+      disabled,
       ...props
     },
     ref
   ) {
     return (
       <button
         aria-busy={loading || undefined}
         className={cn(buttonVariants({ variant, size, className }))}
         data-size={size}
         data-slot="button"
         data-variant={variant}
-        disabled={loading}
         ref={ref}
         {...props}
+        disabled={loading || disabled}
       >
         {loading ? (
-          <>
-            <Spinner aria-hidden="true" />
-            <span className="sr-only">{children}</span>
-          </>
+          <div className="grid place-items-center">
+            {/* opacity-0 rather than invisible: the hidden label keeps the button's width and stays its accessible name. */}
+            <div className="col-start-1 row-start-1 flex items-center gap-2 opacity-0">
+              {icon}
+              {children}
+            </div>
+            <Spinner aria-hidden="true" className="col-start-1 row-start-1" />
+          </div>
         ) : (
           <div className="flex items-center gap-2">
```

O comentário entra pela exceção 2 de `.claude/rules/code-comments.md`: sem ele, a próxima pessoa troca
`opacity-0` por `invisible` e o botão perde o nome. O `pnpm fix` acerta a ordem dos atributos que o Biome
aceitar; o `disabled` tem de ficar depois do `{...props}`.

### 13.5 `apps/app/shared/components/ui/Footer.tsx` e `PageFormFooter.tsx`

```diff
-    // `Button` applies its own `disabled={loading}` before spreading the props it was
-    // given, so an explicit `disabled` overrides it and a pending submit would still take
-    // a second click. Both states are merged here instead.
-    const isBlocked = disabled || isLoading;
-
 ...
-                    disabled={isBlocked}
+                    disabled={disabled}
                     loading={isLoading}
 ...
-                <Button disabled={isBlocked} loading={isLoading} type="submit">
+                <Button disabled={disabled} loading={isLoading} type="submit">
```

No `PageFormFooter`, o mesmo com `submitDisabled` e `isSubmitting`.

`apps/app/__tests__/sharedFooterPendingState.test.tsx:37-41`:

```diff
-/**
- * `Button` applies `disabled={loading}` before spreading the props it was given, so a
- * footer that passes both props loses the loading lock unless it merges them itself.
- * These cover the merge, not the button.
- */
+/** A footer passes both `disabled` and `loading` to its submit button; either one locks it. */
```

### 13.6 `AGENTS.md`, seção "Label e erros"

```diff
 - **`label` opcional** em `TextareaInput`, `RadioGroupInput`, `DateInput`: só renderizar o componente `Label` quando `label` estiver definido, com `htmlFor={id}` quando o controlo expuser `id` (como em `Input`).
+- No **`RadioGroupInput`** o grupo é um `div role="radiogroup"`, que `htmlFor` não rotula: o `Label` recebe um `id` e o grupo aponta para ele com `aria-labelledby`. Composto de grupo novo segue o mesmo caminho.
```

### 13.7 Árvore de arquivos

```
packages/design-system/
  components/form/hookform/hookformInputPassword.tsx    (editado)
  components/form/hookform/hookformInput.tsx            (editado)
  components/ui/radio-group-input.tsx                   (editado)
  components/ui/button.tsx                              (editado)
  __tests__/hookformSubmitReadOnly.test.tsx             (novo)
  __tests__/radioGroupInput.test.tsx                    (novo)
  __tests__/hookformInputPassword.test.tsx              (casos novos)
  __tests__/button.test.tsx                             (casos novos)
apps/app/
  shared/components/ui/Footer.tsx                       (editado)
  shared/components/ui/PageFormFooter.tsx               (editado)
  __tests__/sharedFooterPendingState.test.tsx           (docstring)
AGENTS.md                                               (1 linha)
```

### 13.8 `contends_on`

- `packages/design-system/components/form/hookform/hookformInputPassword.tsx`
- `packages/design-system/components/form/hookform/hookformInput.tsx`
- `packages/design-system/components/ui/radio-group-input.tsx`
- `packages/design-system/components/ui/button.tsx`
- `apps/app/shared/components/ui/Footer.tsx`
- `apps/app/shared/components/ui/PageFormFooter.tsx`
- `AGENTS.md`, que a `date-input-navigation` também edita, em outra seção

Disjunto dos arquivos de código da `date-input-navigation` (`date-input.tsx`, `EntityFormFields.tsx`,
`contact-form-client.tsx`). Os dois diffs se encontram só no `AGENTS.md`.

### 13.9 Ordem de implementação

1. Design system: `hookformInputPassword.tsx` e `hookformInput.tsx` com `hookformSubmitReadOnly.test.tsx` e os
   casos de placeholder.
2. Design system: `radio-group-input.tsx` com `radioGroupInput.test.tsx`.
3. Design system: `button.tsx` com os casos novos de `button.test.tsx`.
4. `apps/app`: `Footer.tsx`, `PageFormFooter.tsx` e o docstring do teste, depois do item 3.
5. `AGENTS.md`.
6. `pnpm check`, `pnpm --filter @repo/design-system typecheck`, `pnpm --filter app typecheck`,
   `pnpm --filter web typecheck` e as suítes dos três workspaces.

### 13.10 Chaves de i18n

Nenhuma.

### 13.11 Env

Nenhuma variável nova.

## 14. Pré-requisitos manuais de infra

Nenhum. Nada vai para o `docs/PRE-PRODUCTION.md`. A recusa por senha errada no diálogo de troca de e-mail
depende do Resend configurado, pendência que já existe no `docs/PRE-PRODUCTION.md`; esta tarefa não cria uma
nova.

## 15. Plano de commits (soma ao da `date-input-navigation`)

O plano da `date-input-navigation` está em `docs/features/date-input-navigation/review/review.md:158-180`
(seis commits). Os desta tarefa entram intercalados, respeitando pacotes antes de apps e artefatos por
último. Conferir `git diff --cached --stat` vazio antes do primeiro commit.

| Posição | Commit | Arquivos | Origem |
|---------|--------|----------|--------|
| 1 | `fix(design-system): open the date input calendar on the selected month and accept a month and year selector` | (como no review) | date-input-navigation |
| 2 | `fix(design-system): keep text fields focused while a form submits and honour the password placeholder` | `hookformInputPassword.tsx`, `hookformInput.tsx`, `hookformSubmitReadOnly.test.tsx`, `hookformInputPassword.test.tsx` | esta |
| 3 | `fix(design-system): name the radio group after its label` | `radio-group-input.tsx`, `radioGroupInput.test.tsx` | esta |
| 4 | `fix(design-system): keep the button width and lock while loading` | `button.tsx`, `button.test.tsx` | esta |
| 5 | `feat(app): add a month and year selector to the entity birthdate field` | (como no review) | date-input-navigation |
| 6 | `refactor(app): let the button lock the form footers while loading` | `Footer.tsx`, `PageFormFooter.tsx`, `sharedFooterPendingState.test.tsx` | esta |
| 7 | `fix(web): use the shared date input on the contact form` | (como no review) | date-input-navigation |
| 8 | `docs: document the date input month and year selector and the radio group label` | `AGENTS.md` | as duas; commit misto porque separar as duas linhas exigiria `git add -p`, e a mensagem diz isso |
| 9 | `docs(specs): audit the backlog after PR #44` | `specs/BACKLOG.md` | auditoria |
| 10 | `docs(features): date-input-navigation` | `docs/features/date-input-navigation/` | date-input-navigation |
| 11 | `docs(features): form-field-focus-and-names` | `docs/features/form-field-focus-and-names/` | esta |

O commit 6 depende do 4: sem a trava no `Button`, tirar a fusão dos footers reabriria o duplo envio.

Título de PR sugerido para as duas tarefas: `fix: open date pickers on the selected date and keep form
fields focused and named`.
