# Revisão: campos de formulário mantêm o foco, têm nome e travam no carregamento

Revisão por leitura do diff desta tarefa em `packages/design-system`, `apps/app` e `AGENTS.md`, contra
`docs/review-checklist.md`, mais os gates estáticos. Rodada autônoma do `/cycle`, segunda tarefa da mesma PR que
`date-input-navigation`. Nenhuma branch foi criada ou renomeada e nada foi adicionado ao índice.

## Branch

| Item | Valor |
|------|-------|
| Atual | `guilhermebittelbrunn/cycle-command-v4` (criada pelo Conductor, não protegida) |
| Regex do padrão sobre a atual | `BRANCH INVALIDA: guilhermebittelbrunn/cycle-command-v4` |
| Recomendada para a PR das duas tarefas | `fix/date-pickers-and-form-fields` |
| Regex do padrão sobre a recomendada | `branch OK: fix/date-pickers-and-form-fields` |
| Estado | a atual não tem upstream nem commit acima de `origin/main`; a recomendada não existe no remoto |

A PR soma `date-input-navigation` e esta tarefa e toca `packages/design-system`, `apps/app` e `apps/web`, então o
nome omite o `<project>`, na forma que o regex aceita para vários apps (contexto do achado E11). Substitui o
`fix/date-input-navigation` recomendado na primeira revisão, que só descrevia a primeira tarefa. Como a branch atual
não tem upstream nem commit próprio, o caminho da regra é `git branch -m fix/date-pickers-and-form-fields` antes do
primeiro commit; a política do `/cycle` deixa essa decisão para o usuário.

A PR passou a cobrir também `web-header-reflow-and-menu-name`. A recomendação foi trocada por
`fix/date-pickers-form-fields-and-header` (`branch OK: fix/date-pickers-form-fields-and-header`), registrada no
`review.md` daquela tarefa. O nome acima fica como histórico desta revisão.

## Revisão: form-field-focus-and-names

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

Nenhum que peça edição. O único risco aberto é o R1 do plano (Enter repetido durante o envio), que vai para o
`/test` como item 2 abaixo.

### ✅ OK

Os quatro pontos pedidos pelo orquestrador:

1. **`Button` é global.** O `Button` não tem `asChild` nem `Slot` (`button.tsx:42-92`), e nenhum consumidor passa
   `asChild` a ele: o único `asChild` com `buttonVariants` está no `NavigationMenuLink` do header da web, que não
   usa o componente. Nenhum consumidor com `loading` usa `size="icon"`; os que existem usam `size="sm"`
   (`EmailNotVerifiedNotice.tsx:45`, `AccountSessionsPanel.tsx`) ou `className="w-full"`/`"self-start"`. O grid de
   uma célula vive dentro do `<button>` e não interage com o `className` do chamador. O `has-[>svg]:px-3`
   (`button.tsx:24`) não casava com o botão parado, porque o conteúdo já vinha num `div`; em carregamento casava,
   porque o `Spinner` era filho direto. Agora não casa em nenhum dos dois estados, e o padding fica igual. O
   `Spinner` mantém `aria-hidden` sobre o `role="status"` (`spinner.tsx:11-14`), como antes.
2. **`readOnly` em vez de `disabled` no envio.** Nenhum formulário depende do campo desabilitado para impedir
   edição ou duplo envio. Os 13 arquivos que usam `HookFormInput`/`HookFormInputPassword` chamam `mutate` dentro do
   `onSubmit`, sem aguardar, então `formState.isSubmitting` só fica `true` durante o resolver; a trava que vale
   durante o pedido é o botão de enviar, ligado ao `isPending` da mutação em todos eles (`Footer` com `isLoading`
   em entity, usuários, conta e onboarding; `disabled`/`loading` com `isPending` em login, cadastro, esqueci e
   redefinir senha). A personificação trava pelo `disabled` explícito do chamador (`AccountProfileForm.tsx:118`),
   que continua vencendo porque o `{...rest}` vem depois do `readOnly` (`hookformInput.tsx:75-77`,
   `hookformInputPassword.tsx:81-83`).
3. **Comentário JSX em `button.tsx:76`.** Cumpre a exceção 2 de `.claude/rules/code-comments.md`: uma linha,
   explica o porquê de uma escolha que alguém trocaria sem perceber o efeito (`invisible` tira o texto do nome
   acessível) e não cita o fluxo.
4. **Fusão `isBlocked` removida dos footers.** A trava continua: `Footer.tsx:58` e `:66` e `PageFormFooter.tsx:37-39`
   passam `disabled` e `loading` separados, e o `Button` aplica `disabled={loading || disabled}` depois do spread
   (`button.tsx:72`). Sob personificação os chamadores passam `disabled={isImpersonating}` (`AccountSecurityForm.tsx:98`,
   `AccountEmailChangeDialog.tsx:157`, `AccountPrivacyPanel.tsx:185`, `EditEntityClient.tsx:126-131`,
   `entities/create/page.tsx:81`), então o botão fica travado com ou sem carregamento. O handoff mediu a mutação: com
   a ordem antiga no `Button`, 2 dos 5 casos de `sharedFooterPendingState.test.tsx` reprovam.

Demais conferências:

- Consumidores que passam `disabled={false}` explícito com `loading` (`AccountBillingPanel.tsx:154`, `:201`,
  `BillingPlanCard.tsx:66`) passam a ficar travados durante o carregamento. Antes não ficavam; é a correção que o
  plano pede.
- `radio-group-input.tsx:39-49`: o segundo `useId()` evita colisão com os `id` das opções, e o `aria-labelledby`
  vem antes do spread, então o do chamador vence. O `FormControl` do `HookFormRadioGroup` repassa `id`,
  `aria-describedby` e `aria-invalid`, não `aria-labelledby` (`form.tsx`), então não apaga o novo atributo. O
  `Label` repassa o `id` pelo `...props` (`label.tsx:25`).
- Placeholder da senha: todo chamador que passa `placeholder` usa `passwordPlaceholder`, que vale `"••••••••"` nos
  três idiomas em todos os dicionários; os diálogos de conta e o formulário de usuário não passam nada e caem no
  padrão. O que o usuário vê não muda.
- Nenhuma string de UI, chave de i18n, `error.code`, SDK ou API novos. O docstring de
  `sharedFooterPendingState.test.tsx:37` e a linha do `AGENTS.md:73` descrevem o código atual.
- Testes em `__tests__/`, imports explícitos de `vitest`, sem `toBeInTheDocument`, em jsdom.

### 👁 Verificar no `/test`

Veredito para os 8 itens do handoff, em ordem de risco.

1. **Enter duplo (R1)** sustenta a troca por `readOnly`. Por leitura, o botão de enviar trava pelo `isPending`,
   mas o React Query avisa os observadores por `setTimeout(0)` (`@tanstack/query-core` 5.90.20,
   `notifyManager.js:3`), então existe ao menos uma volta do event loop entre o primeiro `mutate()` e o botão
   travado, e nela o campo ainda está focado. Segue para o `/test`. Repro: login da app e da web, senha errada,
   dois Enter seguidos o mais rápido possível no campo de senha; contar os pedidos `accounts:signInWithPassword` na
   aba de rede. Mais de um reprova.
2. **Foco depois de Enter no login (app e web).** Por leitura, o campo deixa de ficar `disabled` no envio. A perda
   de foco vem do "focus fixup" do navegador, que o jsdom não aplica. Segue para o `/test`. Repro: o do handoff,
   com `document.activeElement` e o log de `focusout`; repetir com Enter no e-mail.
3. **Diálogos de conta.** Segue para o `/test`, pelo mesmo motivo. Repro do handoff (exclusão com senha errada;
   troca de e-mail com `EMAIL_NOT_CONFIGURED`).
4. **Largura do botão em carregamento.** Por leitura, o grid de uma célula com o conteúdo em `opacity-0` mantém a
   largura e o padding não muda (ponto 1 acima). O número em px só sai no navegador. Repro do handoff, no "Salvar"
   de `/entities/edit/<id>`, no "Atualizar" da tabela de `/entities` e em "Baixar meus dados", claro, escuro e
   390 px.
5. **Nome dos grupos de rádio nos 3 idiomas.** Confirmado por leitura para a ligação (`aria-labelledby` para o `id`
   do `Label`). Nenhum dos dois grupos é obrigatório, então o `*` do `Label` não entra no nome. Fica para o `/test`
   a leitura da árvore de acessibilidade nos três idiomas e a escolha por setas salvando.
6. **Placeholder `••••••••` no login.** Confirmado por leitura (ver ✅). Não precisa de medição própria; basta
   anotar se aparecer durante o item 2.
7. **Personificação.** Confirmado por leitura (ponto 4 acima). Prioridade baixa: conferir uma vez em
   `/entities/edit/<id>` personificando.
8. **axe.** Segue para o `/test`/CI: `pnpm e2e` sem regra nova, com a `A11Y_ALLOWLIST` vazia.

## Correções aplicadas

Nenhuma na primeira rodada. A correção do R1 está na seção "Rodada 2: R1".

## Raio de impacto

- `Button`: todo consumidor com `loading` (lista no §5.4 do plano, conferida aqui) muda o conteúdo em carregamento
  e passa a travar mesmo com `disabled={false}`. Sem `loading`, o DOM é o mesmo (caso "renders the idle content
  unchanged" de `button.test.tsx`).
- `HookFormInput` e `HookFormInputPassword`: os 13 arquivos que os usam em `apps/app` e `apps/web`. A janela do
  `readOnly` dura o resolver.
- `RadioGroupInput`: `EntityFormFields.tsx` e `AccountPreferencesForm.tsx`, via `HookFormRadioGroup`.
- `Footer`/`PageFormFooter`: todo formulário da `apps/app` com rodapé, sem mudança de comportamento.

## Lacunas de teste

| Lacuna | Veredito |
|--------|----------|
| O foco no navegador real não aparece nos testes de `readOnly` | continua aberta; itens 2 e 3 acima |
| B3 confere a classe `opacity-0`, não a largura | continua aberta; item 4 acima |
| Nome dos grupos de rádio nos 3 idiomas sem teste de unidade (D8 do plano) | continua aberta; item 5 acima |

## Decisões em aberto

- Branch: renomear para `fix/date-pickers-form-fields-and-header` (antes `fix/date-pickers-and-form-fields`) antes do
  primeiro commit. Recomendação: renomear.
- As perguntas P1 a P4 do plano seguem com a opção adotada lá.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Typecheck | `corepack pnpm turbo run typecheck --filter=@repo/design-system --filter=app --filter=web` | 3 de 3 ok (1 em cache), 9,7 s |
| Lint | `corepack pnpm check` | 881 arquivos, nenhum erro |
| Paridade de i18n | não rodada | nenhum arquivo de `packages/internationalization` mudou |
| Índice | `git diff --cached --stat` | vazio |
| Segredo nos artefatos | `rg` por e-mail, senha atribuída e prefixos de chave (`sk_`, `AIza`, `whsec_`, `re_`, `-----BEGIN`) em `docs/features/form-field-focus-and-names/` e `docs/features/date-input-navigation/` | nenhum segredo. Os únicos e-mails são `user@example.com` e `admin@example.com` do seed, em `date-input-navigation/test/report.md:134` |

Não rodei a suíte; nenhuma linha de código desta tarefa foi alterada na revisão.

## Rodada 2: R1

O `/test` reprovou o critério 4 (`test/report.md`, item 1 da lista): no login da app e da web, dois Enter com 2 a 5 ms
de intervalo geravam dois pedidos `signInWithPassword` (app 3 de 8 rodadas, web 7 de 8; oito Enter a cada 2 a 3 ms
geravam 6 a 8 pedidos). O defeito entrou com este diff. Esta rodada corrigiu no design system e mediu em jsdom.

### Causa raiz

A submissão implícita por Enter só para quando o botão padrão do formulário está desabilitado. Com `readOnly`, o
campo continua focado, e o Enter seguinte submete de novo enquanto o botão não trava. O botão trava pelo `isPending`
da mutação, e esse estado chega ao React por `setTimeout(0)` (`notifyManager.js:3` do `@tanstack/query-core`
5.90.20).

A leitura e o primeiro teste mostraram um detalhe que o relatório não tinha: a janela só existe quando a mutação mora
num componente acima do formulário. O `useSyncExternalStore` do `useMutation` relê o estado atual em qualquer
re-render do componente que o chama. Se o `useMutation` está no mesmo componente do `useForm`, o re-render do fim do
envio (`isSubmitting` volta a `false`) já traz `isPending` verdadeiro e o botão trava nesse mesmo render. Medido: com
o mock do `useAuth` chamando `useMutation` dentro do próprio `SignInForm`, o botão já saía desabilitado depois do
primeiro Enter. No código real o `signIn` vem do contexto do `AuthProvider` (`packages/auth/provider.tsx:398`), que
só re-renderiza quando o React Query avisa. É o caso dos dois logins.

### Correção escolhida

Um hook novo no design system, `useSubmitEnterGuard`
(`packages/design-system/components/form/hookform/useSubmitEnterGuard.ts`), usado pelo `HookFormInput` e pelo
`HookFormInputPassword` num `onKeyDown` composto com o do chamador. Ele chama `preventDefault()` no Enter (fora de
composição de IME) enquanto `formState.isSubmitting` está verdadeiro e por mais uma volta de timer depois que o envio
termina. Essa volta é um `setTimeout(0)` armado num `useLayoutEffect` quando o `submitCount` muda. Como o timer do
React Query foi agendado dentro do `onSubmit`, antes de o envio terminar, ele dispara primeiro, e o botão já está
desabilitado quando o bloqueio sai. Daí em diante quem bloqueia é o botão. O `readOnly` e o foco no campo continuam.

Fica em dois componentes de um pacote, cobre os 13 formulários que usam esses campos e não muda nenhum call site. O
hook tem um comentário de três linhas com o porquê do timer, pela exceção 2 de `.claude/rules/code-comments.md`
(condição de corrida tratada de propósito).

### Alternativas descartadas

| Alternativa | Por que não |
|-------------|-------------|
| Voltar a `disabled` nos campos | desfaz o critério 1 desta tarefa (foco preservado), e o código antigo também tinha janela entre o `submit` e o render que desabilitava o campo; o "fechava em ~3 ms" do relatório é hipótese não medida |
| `mutateAsync` no `onSubmit` e `isSubmitting` no botão | 13 call sites; cada um precisaria de `catch`, porque o `handleSubmit` do react-hook-form 7.65 relança o erro do `onValid` |
| `ref` síncrono antes do `mutate` em cada formulário | os mesmos 13 call sites, e o próximo formulário do fork nasce sem a trava |
| `notifyManager.setScheduler(queueMicrotask)` nos `QueryProvider` da app e da web | dois arquivos, mas muda o momento de toda notificação de query e mutation das duas apps (troca de sujeito com `resetQueries`, sessão, painel) para resolver uma corrida de milissegundos |
| Trava no `Button` ouvindo o `submit` do formulário | o `Button` é global; precisaria de uma regra de liberação para envio sem mutação (validação reprovada) e piscaria o `disabled:opacity-50` nesses casos |

### Medição

| Teste | Antes da correção | Depois |
|-------|-------------------|--------|
| `packages/design-system/__tests__/hookformEnterResubmit.test.tsx` (novo, 2 casos × 2 campos; o pendente chega por `setTimeout(0)`, como no React Query) | 2 de 4 reprovam: "expected to be called 1 times, but got 2 times" | 4 de 4 |
| `apps/app/__tests__/signInEnterResubmit.test.tsx` (novo; `SignInForm` real, `useMutation` real num provider acima, Enter na senha, Enter na senha, Enter no e-mail antes de o botão travar) | reprova: 3 chamadas ao `signIn` em vez de 1 | passa; o botão trava depois do timer e o foco fica na senha |

Os dois testes simulam a submissão implícita como o navegador faz: `keyDown` de Enter e, se ele não foi cancelado e o
botão padrão não está desabilitado, `submit`. O "antes" foi medido com o `preventDefault()` do hook trocado por
`return` e o arquivo restaurado em seguida (`grep` confirma a linha de volta). O caso "submits again with Enter once
the request settles" prova que o bloqueio não fica preso.

### Gates da rodada 2

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `corepack pnpm check` | 884 arquivos, nenhum erro |
| Typecheck | `corepack pnpm turbo run typecheck --filter=@repo/design-system --filter=app --filter=web` | 3 de 3 ok (1 em cache) |
| Suítes | `corepack pnpm turbo run test --filter=@repo/design-system --filter=app --filter=web` | 11 de 11 tarefas. Design system 171 testes em 14 arquivos (eram 167), app 846 em 106 (eram 845), web 95 em 16 |
| Segredo | `rg` por e-mail e prefixos de chave em `docs/features/form-field-focus-and-names/` | só `user@example.com`, `admin@example.com` (seed) e `qa-form-field-focus@example.com`, todos em `example.com` |

### 👁 Verificar no `/test` (só o R1)

1. **Enter duplo e óctuplo no login.** App (`/pt-br/sign-in`) e web (`/pt-br/sign-in`), build de produção, e-mail do
   seed e senha errada, foco na senha. Com o wrapper de `fetch` do relatório: dois Enter com 2 a 3 ms de intervalo, 8
   rodadas em cada app, e oito Enter a cada 2 a 3 ms, 3 rodadas em cada app. Aprovado: exatamente um
   `signInWithPassword` por rodada.
2. **Foco depois da recusa.** Nas mesmas rodadas, depois do "Senha incorreta.", `activeElement` continua sendo
   `input[name="password"]`, com o valor, e o log de `focusout` vazio. Repetir uma rodada com Enter no e-mail.
3. **Enter volta a funcionar.** Depois da recusa, corrigir a senha e apertar Enter uma vez: o login acontece.

A ordem entre o timer do React Query e o do hook vem da especificação de timers (mesmo atraso, ordem de
agendamento) e foi provada em jsdom com timers falsos; o navegador real é o que o `/test` confere.

## Plano de commits

Substituído pelo plano consolidado da PR das três tarefas, em
`docs/features/web-header-reflow-and-menu-name/review/review.md`, seção "Plano de commits". Os 13 commits que
estavam aqui continuam lá, com as mesmas mensagens e arquivos, nas posições 1 a 9 e 12 a 15; a terceira tarefa
ocupa o 10 (i18n), o 11 (header da web) e o 16 (artefatos).

### Commits realizados

(preenchido pelo `/review` depois de commitar)
