# Relatório de QA: o diálogo de exclusão de conta leva o foco para dentro ao abrir

Rodada autônoma do `/cycle`, em 2026-10-08, no checkout
`/Users/guilhermebittelbrunn/conductor/workspaces/next-boilerplate/bern`, branch
`guilhermebittelbrunn/cycle-command-v2` (não protegida). Não criei branch, não fiz `git add` nem commit.

Resultado: todos os critérios passam. Nenhum defeito de produção nesta mudança. Uma observação (foco depois da
recusa da senha) vai para o backlog.

Para encurtar, `<account>` é `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account`.

## 1. Testes executados

| Comando | Resultado |
|---------|-----------|
| `npx vitest run __tests__/accountPrivacyPanel.test.tsx` (em `apps/app`) | 16 passed (16) |
| `pnpm --filter app test` | Test Files 102 passed (102), Tests 832 passed (832) |
| `pnpm test` (raiz, com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | exit 0, `Tasks: 15 successful, 15 total`, `Cached: 13 cached`, 24,28 s |

Contagem por workspace no `pnpm test` da raiz: app 832, api 1205, api `test:emulator` 186, web 87, auth 127,
email 202, design-system 83, internationalization 67, security 45, shared 44, analytics 34, next-config 32,
payments 22, e2e 16, sdk 9. Rodei sem `--force`; não havia motivo para suspeitar do cache.

Não rodei de novo `pnpm check` nem `pnpm --filter app typecheck`: não editei arquivo de código, e o handoff já
mediu os dois (`Checked 861 files`, `No fixes applied`; typecheck com exit 0). A paridade de i18n não se aplica,
porque o diff não toca `@repo/internationalization`; ela rodou mesmo assim dentro do `pnpm test` (67 passed).

### Mutação

Troquei o `AccountPrivacyPanel.tsx` temporariamente e rodei o arquivo de teste. Restaurei a partir de uma cópia
depois de cada variante. O `shasum` do `git diff -- apps/app` saiu igual antes e depois
(`c5069111fb3618ecc8665d833e04326fc462fa6a`).

| Variante | Resultado | Casos que caem |
|----------|-----------|----------------|
| Arquivo de `HEAD` | 6 failed, 10 passed | os 6 do bloco de foco |
| Sem `onOpenAutoFocus={handleOpenAutoFocus}` | 6 failed, 10 passed | os 6 do bloco de foco |
| Sem `form.reset();` | 2 failed, 14 passed | "limpa a senha digitada ao cancelar" e "limpa a mensagem de validação ao fechar pelo Esc" |

No arquivo de `HEAD` os seis falham por tempo (cerca de 1 s cada, o `vi.waitFor` esperando o foco). Sem o
`form.reset()`, os dois falham em 58 ms e 60 ms, pela asserção final. Os números batem com o handoff.

### Testes criados

Nenhum. A única lacuna herdada que cabia em teste era a abertura por Enter e Espaço. No jsdom, um `keydown` de
Enter num `<button>` não gera `click`; quem faz isso é o navegador. O `@testing-library/user-event` simularia,
mas não é dependência do repo, e acrescentar uma dependência para provar um comportamento nativo do navegador
não compensa. Medi no navegador (seção 3).

## 2. Decisões de custo de teste

| Módulo tocado | Decisão |
|---------------|---------|
| `<account>/(components)/AccountPrivacyPanel.tsx` | O teste de componente no jsdom já cobria foco ao abrir, Esc, "Cancelar", volta do Tab e limpeza (6 casos novos, mutação confirmada). Não criei teste na faixa cara: nada aqui depende de Firestore, regra ou emulador. O que o jsdom não reproduz (teclado nativo, ordem real do Tab, anel de foco, layout) ficou com a passada de navegador |

## 3. Evidências da passada no navegador

Ambiente: app em `next build` + `next start` na porta 3000, API em `next dev` na 3002, emuladores de Auth,
Firestore e Storage com `pnpm seed`. O ambiente dos servidores saiu do mesmo `buildStackEnv` que a suíte
`apps/e2e` usa (projeto `demo-next-boilerplate`, nenhuma chave real). Conta `user@example.com` do seed para o
roteiro (senha publicada no script do seed, não repetida aqui) e `admin@example.com` para a personificação.

A leitura de foco foi feita com `document.activeElement` depois de cada tecla. "Campo" abaixo significa
`input[name="currentPassword"]` com `[role=alertdialog]` contendo o elemento.

| # | Passo | Observado |
|---|-------|-----------|
| 1 | pt-br, escuro, 1280 px. Foco em "Baixar meus dados", Tab, Enter | Antes do Enter: `BUTTON` "Excluir minha conta". Depois: campo, `inDialog: true` |
| 2 | A partir do campo, Tab 5 vezes | "Mostrar senha", "Cancelar", "Excluir para sempre", campo, "Mostrar senha". Todos dentro do diálogo |
| 3 | Shift+Tab 5 vezes | campo, "Excluir para sempre", "Cancelar", "Mostrar senha", campo. Todos dentro do diálogo |
| 4 | Esc | Diálogo fechado, foco no `BUTTON` "Excluir minha conta" |
| 5 | Enter no gatilho, Tab 2 vezes até "Cancelar", Enter | Foco no gatilho, diálogo fechado |
| 6 | Espaço no gatilho | Diálogo aberto, foco no campo |
| 7 | Tab 2 vezes até "Cancelar", Espaço | Foco no gatilho, diálogo fechado |
| 8 | Clique do mouse no gatilho | Foco no campo |
| 9 | Digitar 12 caracteres, clicar em "Mostrar senha" | Campo `type="text"`, botão passa a "Ocultar senha" |
| 10 | Clique no overlay (canto inferior esquerdo) | Diálogo continua aberto. Foco vai para `BODY`. Um Tab depois, foco no campo |
| 11 | Clique em "Cancelar", clique no gatilho | Campo vazio (`value.length` 0), `type="password"`, botão "Mostrar senha", foco no campo, nenhuma mensagem |
| 12 | Enter com o campo vazio | "Informe a senha." aparece, `aria-invalid="true"`, foco no campo. A API não recebeu `POST /account/deletion` (o log da API não tinha nenhuma linha dessa rota até o passo 14) |
| 13 | Esc, Enter no gatilho | Mensagem sumiu, `aria-invalid="false"`, campo vazio, foco no campo |
| 14 | Senha errada de 15 caracteres, Enter | API `POST /account/deletion 400`. Alerta "A senha atual está incorreta. (Código do erro: …)". Diálogo aberto. Foco no contêiner `[role=alertdialog]` (`tabindex="-1"`), não no campo; o campo mantém os 15 caracteres |
| 15 | Esc, troca para tema claro, Enter no gatilho | Campo vazio, foco no campo, `:focus-visible` verdadeiro |
| 16 | Anel de foco, claro e escuro | `box-shadow` com anel de 3 px nos dois temas (`oklab(0.708 … / 0.5)` no claro, `oklab(0.439 … / 0.5)` no escuro). No print, aparece como contorno cinza em volta do campo |
| 17 | 390 × 844, claro, clique no gatilho | Foco no campo. Diálogo de x=16 a x=374, y=275 a y=570. `scrollWidth` 390, sem rolagem horizontal. "Cancelar" e "Excluir para sempre" lado a lado (x 80 a 174 e 186 a 349) |
| 18 | 390 × 844, escuro, Espaço no gatilho, Tab 4 vezes | Foco no campo; o Tab percorre "Mostrar senha", "Cancelar", "Excluir para sempre", campo |
| 19 | es, escuro, 1280 px. Tab até "Eliminar mi cuenta", Enter | Título "¿Eliminar tu cuenta?", rótulo "Contraseña actual", botões "Mostrar contraseña", "Cancelar", "Eliminar para siempre". Foco no campo |
| 20 | es: Tab 2 vezes, Enter em "Cancelar" | Foco em "Eliminar mi cuenta" |
| 21 | es: senha errada | API 400. Alerta "La contraseña actual es incorrecta. (Código del error: …)" |
| 22 | en, claro, 1280 px. Clique em "Delete my account" | Título "Delete your account?", rótulo "Current password", botões "Show password", "Cancel", "Delete forever". Foco no campo |
| 23 | en: Esc | Foco em "Delete my account" |
| 24 | en: Enter no gatilho, Enter no campo vazio | "Enter the password.", `aria-invalid="true"`, foco no campo |
| 25 | en: senha errada | Alerta "The current password is wrong. (Error code: …)". Foco no contêiner do diálogo |
| 26 | Admin personificando `user@example.com` (seletor "Ambiente" → "Painel do usuário"), aba Privacidade | "Excluir minha conta" e "Baixar meus dados" com `disabled`. O clique não abre. `focus()` no gatilho não pega (`activeElement` continua outro elemento). Enter e Espaço não abrem |
| 27 | Conta de QA nova, Tab até o gatilho, Enter, senha certa, Enter | Foco no campo ao abrir. API `POST /account/deletion 200`, redirecionamento para `/pt-br/sign-in?redirect=%2Fpt-br`. A conta sumiu do Auth emulator (a consulta `accounts:query` lista só as três do seed) |

Prints de apoio em `docs/features/account-deletion-dialog-focus/test/e2e/` (descartados pelo `.gitignore`):
`01-ptbr-light-desktop-enter.png` (apesar do nome, saiu no tema escuro, que era o padrão do navegador),
`02-ptbr-light-desktop-ring.png` (também escuro), `03-ptbr-dark-required.png`, `04-ptbr-dark-wrong-password.png`,
`05-ptbr-light-desktop.png`, `06-ptbr-light-390.png`, `07-ptbr-dark-390.png`, `08-es-dark-desktop-error.png`,
`09-en-light-desktop.png`, `10-en-light-error.png`, `11-impersonation-disabled.png`. Nenhum mostra dado de
pessoa real: só contas `@example.com`.

## 4. Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| Abrir o diálogo leva o foco ao campo de senha | ✅ | navegador (passos 1, 6, 8, 19, 22, 27) e Vitest. Conta carregando: só Vitest |
| O Tab fica preso no diálogo | ✅ | navegador (passos 2, 3, 18) e Vitest (volta do último botão) |
| Esc e "Cancelar" devolvem o foco ao gatilho | ✅ | navegador (passos 4, 5, 7, 11, 20, 23) e Vitest |
| Fechar o diálogo limpa a senha e os erros | ✅ | navegador (passos 11, 13, 15) e Vitest |
| O fluxo de exclusão continua igual | ✅ | navegador (passos 12, 14, 21, 25, 27) e os 10 casos antigos do Vitest |
| Personificação e conta sem senha não mudam | ✅ personificação; 🔒 conta só Google no navegador | navegador (passo 26); conta só Google pelo Vitest |
| Teste que falha no código anterior | ✅ | mutação (seção 1) |
| Tema, idioma e largura | ✅ | navegador (passos 15 a 25) |
| Gates verdes em build de produção | ✅ com ressalva | app em `build && start`; API em `next dev` (seção 6) |
| Foco depois de recusa da API (observação) | não reprova | navegador (passos 14 e 25) |

## 5. Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|------|----------|
| 1 | Foco no campo ao abrir, no navegador | **Confirmado.** `activeElement` é `input[name="currentPassword"]` dentro de `[role=alertdialog]` em todos os modos de abertura, nos três idiomas e a 390 px |
| 2 | Abertura por Enter e Espaço | **Confirmado.** Passos 1, 6, 18, 19 e 27 |
| 3 | Ordem do Tab e do Shift+Tab | **Confirmado.** Campo, "Mostrar senha", "Cancelar", "Excluir para sempre", volta ao campo; o Shift+Tab inverte. Nada fora do diálogo recebe foco |
| 4 | "Cancelar" pelo teclado devolve o foco ao gatilho | **Confirmado** com Enter (pt-br e es) e com Espaço (pt-br) |
| 5 | Limpeza ao fechar no navegador, incluindo mostrar senha | **Confirmado.** Campo vazio, sem mensagem, `aria-invalid="false"`, `type="password"` e botão "Mostrar senha" ao reabrir |
| 6 | Mutação dos testes | **Confirmado.** `HEAD` 6 failed/10 passed; sem `onOpenAutoFocus` 6/10; sem `form.reset()` 2/14. Diff restaurado idêntico |
| 7 | Foco depois de `ACCOUNT_CURRENT_PASSWORD_INVALID` | **Medido.** O foco vai para o contêiner do diálogo (`[role=alertdialog]`, `tabindex="-1"`), não para o `body` nem para fora. Fica dentro do diálogo, mas fora do campo. A pista do review se confirma em parte: o campo perde o foco (fica `disabled` durante o envio), e o `FocusScope` o devolve ao contêiner, não ao campo. Observação para o backlog, não reprova |
| 8 | Anel de foco em claro e escuro; 390 px; três idiomas | **Confirmado.** Seção 3, passos 15 a 25 |

## 6. Ambiente do e2e

| Serviço | Porta | Situação antes | O que fiz |
|---------|-------|----------------|-----------|
| Emuladores (Auth, Firestore, Storage, UI, hub, logging) | 9099, 8080, 9199, 4001, 4400, 4500, 9150 | livres | subi com `pnpm emulators` (JDK 21 exportado), derrubei com SIGINT |
| API | 3002 | livre | `pnpm --filter api exec next dev -p 3002`, derrubei por PID |
| App | 3000 | livre | `pnpm --filter app build` e `next start -p 3000`, derrubei por PID |
| Web e e-mail | 3001, 3003 | livres | não subi |

O `kill` no PID do `pnpm` não derrubou o `next-server` filho nem o processo do `firebase-tools`; matei esses
filhos pelo PID que ouvia nas portas que eu tinha aberto. No fim, `lsof -ti tcp:<porta> -sTCP:LISTEN` saiu
vazio para 3000, 3002, 8080, 9099, 9199, 4000, 4001, 4400, 4500, 9150 e 8085. Nenhum serviço do usuário estava
de pé, então não reutilizei nada.

O build de produção da API falhou com `Invalid environment variables` em `FIREBASE_ADMIN_CLIENT_EMAIL` e
`FIREBASE_ADMIN_PRIVATE_KEY`. O `apps/api/env.ts` exige as duas fora do modo dev, e o
`docs/PRE-PRODUCTION.md` já registra que `pnpm --filter api build` falha sem elas. Por isso a API rodou em
`next dev`, como na suíte `apps/e2e`. O diff desta tarefa não toca a API.

## 7. Lacunas

| Lacuna (de onde veio) | Veredito |
|-----------------------|-----------|
| Nenhum caso cobre a abertura por Enter ou Espaço (handoff e review) | **Fechada no navegador.** Continua sem teste Vitest, pelo motivo da seção 1 |
| Nenhum caso cobre a limpeza depois de uma exclusão bem-sucedida (handoff e review) | **Fora de escopo.** Confirmado no passo 27: depois do `200` a sessão termina e o app vai para o login, então o diálogo não reabre |
| Clique no overlay sem teste (handoff, "A verificar no `/test`") | **Fechada no navegador.** O diálogo não fecha |
| Conta só Google no navegador (plano §9, item 9) | **Continua aberta no navegador (🔒).** O emulador não tinha conta assim; o Vitest cobre a renderização do bloco do canal de privacidade |
| Anúncio do leitor de tela (plano §9) | **Continua aberta (🔒).** Precisa de leitor de tela de verdade |

## 8. Achados para o backlog

- **Foco depois de uma recusa da API.** Com senha errada, o campo fica `disabled` durante o envio, perde o foco,
  e o `FocusScope` do Radix o devolve ao contêiner do diálogo. O usuário de teclado precisa de um Tab para
  voltar ao campo, e a senha errada continua lá. Hipótese de correção: chamar `form.setFocus("currentPassword")`
  no `onError` da mutation, ou `form.setError` no campo, que o RHF foca. O mesmo deve valer para o diálogo de
  troca de e-mail, que usa o `HookFormInputPassword` com o mesmo `disabled` (não medido nesta rodada).
- **Clique no overlay manda o foco para o `body`.** O `FocusScope` ignora `focusout` com `relatedTarget` nulo
  (`@radix-ui/react-focus-scope/dist/index.mjs:49-50`). O próximo Tab volta ao diálogo. É comportamento do
  Radix em todo `AlertDialog`, anterior a esta mudança; fica registrado para quem auditar acessibilidade.

## 9. Estado de dev alterado

- Conta criada e excluída no Auth emulator: `qa-account-deletion-focus@example.com`, pelo cadastro e pelo
  onboarding, depois apagada pelo próprio fluxo de exclusão. Os dados do emulador somem quando o processo
  termina; nada foi criado em projeto Firebase real. Não há conta a limpar nem entrada nova no
  `docs/PRE-PRODUCTION.md`.
- `apps/app/.next` agora tem um build de produção apontado para o emulador (`NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  `demo-next-boilerplate`, API em `http://localhost:3002`). Um `pnpm --filter app start` sem build novo usaria
  esse bundle. `apps/api/.next` ficou com um build parcial que falhou. As duas pastas são ignoradas pelo git, e
  o `pnpm dev` não usa esse bundle.
- Nenhuma credencial foi gravada em arquivo. A senha da conta de QA não aparece neste relatório, e a do seed
  está só no script do seed.
- Os arquivos temporários desta rodada ficaram fora do repo, em `/tmp/adf/`. Não criei página nem rota de sonda.

## 10. Cross-check

| Eixo | Situação |
|------|----------|
| `apps/app` × `apps/web` | Só `apps/app`. `apps/web` não usa `AlertDialogContent` |
| Comum × admin × personificação | Comum: roteiro completo. Admin personificando: gatilho bloqueado. O painel admin não tem esta aba |
| `subscription` × `simple` | Não muda: o diálogo não depende de plano |
| Mobile × desktop | 390 px e 1280 px medidos |
| Claro × escuro | Os dois medidos |
| Idiomas | pt-br, en e es medidos |
