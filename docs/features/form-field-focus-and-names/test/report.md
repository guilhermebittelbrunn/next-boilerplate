# Relatório do `/test`: campos de formulário mantêm o foco, têm nome e travam no carregamento

Rodada autônoma do `/cycle`, segunda tarefa da mesma PR que `date-input-navigation`, em
`guilhermebittelbrunn/cycle-command-v4` (não protegida). Nenhum commit, nenhuma branch e nenhum `git add`. Esta
etapa não criou nem alterou teste; os dois testes do R1 são do `/review`.

Resultado final, depois da remedição: 10 critérios verificados e corretos, nenhuma falha, nenhum não verificado. Na
primeira medição o critério 4 (R1) reprovou: quando o segundo Enter chegava antes de o botão de enviar ficar
desabilitado (1,9 a 5,9 ms de intervalo), a app e a web enviavam dois pedidos de login simultâneos. O `/review`
corrigiu com o `useSubmitEnterGuard`, e a seção "Remedição do R1", no fim, mede a correção. As seções intermediárias
registram a primeira medição como ela aconteceu.

## Cobertura

| Comando | Resultado |
|---------|-----------|
| `corepack pnpm test` (raiz, `turbo test test:emulator`, JDK 21 no `PATH`, sem `--force`) | 15 de 15 tarefas, 9 do cache. design system 167 (13 arquivos), app 845 (105), web 95 (16), api 1205 (93), `api:test:emulator` 186 (4) |
| `corepack pnpm e2e` (Playwright, emuladores e `next dev` de api, app e web) | 22 de 22 em 2,3 min, incluindo os 9 casos de `a11yDark.spec.ts` e os `expectAccessible` de `panelSwitch.spec.ts`. `A11Y_ALLOWLIST` vazia |
| axe-core 4.13.0 injetado pelo `agent-browser` (impacto sério ou crítico) | zero em `/pt-br/entities/edit/<id>` (claro), `/pt-br/account?tab=preferences` (claro e escuro) e `/pt-br/account?tab=privacy` (claro) |

Não remedi `pnpm check` nem os `typecheck`: esta etapa não mexeu em arquivo, e o `/review` mediu 881 arquivos e
3 de 3. A paridade de i18n veio do cache; nenhum arquivo de `packages/internationalization` mudou.

O `pnpm e2e` rodou porque a infra local permite: JDK 21, Chromium do Playwright instalado e todas as portas livres.
Ele sobe e derruba os próprios servidores.

## Decisões de custo de teste

Nenhum teste novo. Os pontos que faltavam (foco no navegador real, largura em px, nome dos grupos nos três
idiomas) dependem de "focus fixup" e de layout, que o jsdom não tem; foram medidos de ponta a ponta. O defeito do
R1 não virou teste: um teste que reprova quebraria o `turbo build`, e a correção é do `/develop`.

| Módulo tocado | Decisão |
|---------------|---------|
| `hookformInput.tsx`, `hookformInputPassword.tsx` | `hookformSubmitReadOnly.test.tsx` e `hookformInputPassword.test.tsx` (jsdom) já cobrem `readOnly`, `disabled` do chamador e placeholder |
| `radio-group-input.tsx` | `radioGroupInput.test.tsx` (jsdom) cobre a ligação; os nomes traduzidos foram lidos na árvore de acessibilidade |
| `button.tsx` | `button.test.tsx` (jsdom) cobre trava, nome e classes; a largura foi medida no navegador |
| `Footer.tsx`, `PageFormFooter.tsx` | `sharedFooterPendingState.test.tsx` já cobria |

## Critérios de aceite

| # | Critério | Status | Meio | Evidência |
|---|----------|--------|------|-----------|
| 1 | Enter no campo de senha não perde o foco | ✅ | e2e | ver itens 2 e 3 da lista do review |
| 2 | Enter num campo de texto comum não perde o foco | ✅ | e2e + unit | Enter no e-mail da app e da web: `activeElement` = `email`, nenhum `focusout`. `disabled` do chamador: caso "stays disabled when the caller disables it" |
| 3 | O campo não aceita digitação durante o envio | ✅ | e2e + unit | `MutationObserver` no login da app: `readonly` liga em e-mail e senha 1,8 ms depois do `submit` e sai 1 ms depois; `disabled` nunca aparece nos campos |
| 4 | Enter repetido não duplica o pedido | ✅ | e2e + unit | reprovou na primeira medição (item 1 da lista do review); aprovado na remedição, ver "Remedição do R1" |
| 5 | Placeholder do chamador vence | ✅ | e2e + unit | `placeholder` = `••••••••` no login da app e da web; precedência pelos casos novos de `hookformInputPassword.test.tsx` |
| 6 | Grupo de rádio com nome | ✅ | e2e + unit | ver item 5 da lista do review |
| 7 | Botão mantém a largura em carregamento | ✅ | e2e | ver item 4 da lista do review |
| 8 | `loading` sempre trava o botão | ✅ | e2e + unit | em todas as medições do item 4, `disabled` = `true` com `aria-busy` |
| 9 | Personificação continua travando | ✅ | e2e | ver item 7 da lista do review |
| 10 | Testes e gates | ✅ | suíte + e2e | tabela de comandos acima |

## Verificar no `/test`

| # | Item do `review.md` | Veredito |
|---|---------------------|----------|
| 1 | Enter duplo (R1) | **derrubado**. Login com `user@example.com` e senha errada, contando chamadas a `signInWithPassword` por um wrapper de `fetch` instalado antes da navegação e marcando os tempos com `performance.now()`. Com dois `press Enter` em `batch` (6,4 ms de intervalo) e com `keyboard type` de dois `\n` em que o segundo veio a 7 ms ou mais, saiu um pedido. Com dois `\n` seguidos: na app, 3 de 8 rodadas geraram 2 pedidos (segundo Enter a 2,8, 4,1 e 4,5 ms, antes de o botão ficar desabilitado); nas outras 5 o botão já estava desabilitado quando o segundo Enter chegou (a 2,3, 5, 5,2, 9,1 e 14,5 ms). Na web, 7 de 8 geraram 2 pedidos (segundo Enter de 1,9 a 5,9 ms); a que saiu com um teve o segundo Enter a 8 ms. Oito Enter a cada 2 a 3 ms geraram de 6 a 8 pedidos. Linha do tempo de um envio na app: Enter 0, `submit` 1, `readonly` liga 2,8 e desliga 3,8, `fetch` 4,6, botão desabilitado 6,5, resposta 12,7. Na web: `submit` 1, `fetch` 6,5, botão desabilitado 9,4. Entre o `submit` e o botão desabilitado (de 2,2 a 16 ms nas rodadas medidas) nada impede a submissão implícita: o campo continua focado e `readOnly` não bloqueia Enter |
| 2 | Foco depois de Enter no login (app e web) | **confirmado**. App e web em build de produção, pt-br, claro, 1280. Enter na senha: mensagem "Senha incorreta.", `activeElement` = `password`, valor com os 12 caracteres, log de `focusout` vazio. Enter no e-mail: `activeElement` = `email`, `focusout` vazio |
| 3 | Diálogos de conta | **confirmado**. Exclusão, senha errada, Enter: `POST /account/deletion` 400, alerta "A senha atual está incorreta.", foco em `currentPassword` com o texto selecionado (0 a 12), nenhum `focusout`. Troca de e-mail para `qa-form-field-focus@example.com`, Enter na senha: `POST /account/email` 503, alerta "O envio de e-mails não está configurado. Fale com o suporte.", foco em `currentPassword` com o texto selecionado, nenhum `focusout`. Nos dois, `readonly` liga e desliga em 2 a 4 ms e o botão de enviar fica `disabled` com `aria-busy` até a resposta |
| 4 | Largura do botão em carregamento | **confirmado**. `MutationObserver` em `aria-busy` lendo `getBoundingClientRect()` quando o atributo liga, comparado com a largura parado. Diferença de 0,000 px em todas: "Salvar" de `/entities/edit` 74,27 px (claro e escuro, 1280) e "Save" 64,61 px (escuro, 390); "Atualizar" da tabela 94,19 px (escuro, 1280) e 326 px em 390 px ("Refresh" escuro, "Atualizar" claro); "Baixar meus dados" 160,61 px (claro, 1280 e 390); "Excluir para sempre" 163,39 px; "Salvar preferências" 160,72 px; "Guardar preferencias" 172,16 px (390). Altura 36 px e `padding-left` 16 px nos dois estados. Centro do spinner a 0 px do centro do botão nos dois eixos. Conteúdo com `opacity: 0` e `textContent` igual ao rótulo. Contraste do spinner: no escuro, "Salvar" com spinner `lab(7.8)` sobre fundo `oklab(0.985)`; "Atualizar" com spinner `lab(98.3)` sobre fundo escuro translúcido |
| 5 | Nome dos grupos de rádio nos 3 idiomas | **confirmado**. Árvore de acessibilidade: `radiogroup "Gênero"` / `"Gender"` / `"Género"` em `/entities/create`, e `radiogroup "Tema"` / `"Theme"` / `"Tema"` em `/account`, preferências. Sem `*` no nome. Escolha por seta: em Joana, de `female` para `other`, "Salvar", e o `GET /entities/<Joana>` devolveu `"genre":"other"`; no tema, de "Sistema" para "Escuro", "Salvar preferências" (`PUT /account` 200), e depois do reload a página veio escura com "Escuro" marcado. Ressalva de método: o `press ArrowUp` do agent-browser solta a tecla no mesmo instante, e o Radix move o foco sem marcar a opção, porque marca no `focus` só enquanto a seta está pressionada. Com `keydown`, 150 ms e `keyup`, a opção é marcada. É comportamento do Radix, igual antes desta entrega |
| 6 | Placeholder `••••••••` no login | **confirmado**: `placeholder` = `••••••••` no campo de senha da app e da web |
| 7 | Personificação | **confirmado**. Admin, ambiente "Painel do usuário", personificando `user@example.com`. `/pt-br/entities/edit/<Joana>`: "Salvar" com `disabled`, "Voltar" habilitado, aviso "Modo somente leitura"; Enter no campo de nome não gerou `PUT` nem `POST`. `/account`: "Salvar" e "Trocar e-mail" com `disabled`; privacidade: "Baixar meus dados" e "Excluir minha conta" com `disabled` |
| 8 | axe | **confirmado**. `pnpm e2e` 22/22 com a allowlist vazia; o axe à mão nas telas de conta e de edição não apontou nada sério ou crítico |

## Defeito de produção (corrigido na rodada 2)

O texto abaixo é o da primeira medição. A correção do `/review` e a remedição estão na última seção.

**Enter repetido antes de o botão travar envia o login duas vezes** (critério 4).

- Onde: `packages/design-system/components/form/hookform/hookformInput.tsx` e `hookformInputPassword.tsx` (o campo
  continua focado durante o envio), com a trava do botão em `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx`
  e no formulário de login da web, que dependem do `isPending` da mutação.
- Repro: app ou web em `next start` com o emulador; `/pt-br/sign-in`; e-mail do seed e senha errada; foco no campo
  de senha; dois Enter com 2 a 5 ms de intervalo, antes de o botão ficar desabilitado (`agent-browser keyboard type` com dois `\n` chega a isso). Contar
  `signInWithPassword` na aba de rede: saem dois pedidos.
- Impacto: baixo. A janela vai do `submit` até o React desenhar o botão desabilitado (2 a 16 ms nas medições
  locais). A repetição automática do teclado começa depois de centenas de milissegundos, e um toque duplo humano leva
  dezenas. O pedido duplicado também é o mesmo login com a mesma senha.
- Hipótese, não medida: no código anterior o campo ficava `disabled` a partir do primeiro render do envio (~3 ms),
  e o Chrome deixa de entregar teclas a campo desabilitado, então a janela era menor. Não rodei o código anterior
  para confirmar.
- Hipótese de correção, não testada: barrar a reentrada de forma síncrona no próprio formulário, por exemplo com
  um `ref` ligado antes do `mutate` e desligado no `onSettled`, ou usar `mutateAsync` dentro do `handleSubmit` e
  desabilitar o botão também por `formState.isSubmitting`, que liga já no primeiro render do envio.

## Evidências e2e

App (3000) e web (3001) em build de produção (`next build` e `next start`), refeito nesta rodada com o env da
`apps/e2e` (`buildStackEnv`, projeto `demo-next-boilerplate`, emuladores em `127.0.0.1`). API em `next dev`
(3002), porque o build dela exige credenciais do Admin que o env do emulador zera; a API não está no diff.

| Tela | Idioma | Tema/viewport | Observado |
|------|--------|---------------|-----------|
| `/sign-in` da app | pt-br | claro, 1280 | foco preservado na senha e no e-mail; R1 reprovado |
| `/sign-in` da web | pt-br | claro, 1280 | foco preservado na senha e no e-mail; R1 reprovado |
| `/account`, perfil e privacidade | pt-br | claro, 1280 | diálogos com foco preservado; larguras de "Baixar meus dados" e "Excluir para sempre" |
| `/account`, preferências | pt-br, en, es | claro e escuro | nome "Tema"/"Theme"/"Tema"; tema salvo por seta |
| `/account`, preferências | es | claro, 390 | "Guardar preferencias" com a mesma largura |
| `/entities/create` | pt-br, en, es | escuro, 1280 | nome "Gênero"/"Gender"/"Género" |
| `/entities/edit/<Joana>` | pt-br, en | claro e escuro, 1280 e 390 | gênero salvo por seta; "Salvar"/"Save" com a mesma largura |
| `/entities` | pt-br, en | claro e escuro, 1280 e 390 | "Atualizar"/"Refresh" com a mesma largura; `scrollWidth` 390 em 390 px |
| `/entities/edit/<Joana>` e `/account`, personificando | pt-br | claro, 1280 | botões de envio desabilitados |

Nenhum erro em `window.onerror`, `unhandledrejection` ou `console.error` nas páginas medidas.

Screenshots de apoio em `docs/features/form-field-focus-and-names/test/e2e/` (`01-app-signin-ptbr-light-wrong-password.png`
a `08-app-impersonation-edit-ptbr-light.png`). O `.gitignore` descarta a pasta; a prova é o texto acima. Os prints
só mostram contas e entidades do seed do emulador.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199, 4400, 4500, 9150). Não
reutilizei nada do usuário.

- `pnpm e2e` subiu e derrubou os próprios emuladores e servidores; as portas voltaram livres.
- Depois subi: `pnpm emulators` (JDK 21 no `PATH`), o seed, `next dev -p 3002` na API e `next start` na app e na
  web.
- Derrubei por PID: `SIGTERM` nos filhos do `pnpm` dos três servidores e `SIGINT` no `firebase-tools`. Conferência
  final: nenhuma das portas acima com processo e nenhum `next start`, `next dev` ou emulador Java vivo.
- Fechei as sessões `qa-ffn` e `qa-ffn-admin` do agent-browser. Env, sondas e a cópia do axe ficaram em
  `/tmp/qa-ffn/`, apagado no fim. Apaguei o `firestore-debug.log` da raiz. O `pnpm e2e` deixou
  `apps/e2e/playwright-report/`, `apps/e2e/test-results/` e `apps/e2e/.auth/`, que são saídas normais da suíte e
  ignoradas pelo git.
- Efeito colateral: `apps/app/.next` e `apps/web/.next` têm build de produção com a config do emulador embutida
  (ignorados pelo git). `pnpm dev` não é afetado.

## Dados de QA

Tudo no emulador, que morreu com o processo. Nada em projeto real.

- Contas usadas: `user@example.com` e `admin@example.com`, do seed. A senha do seed é pública no repositório e não
  foi copiada para cá.
- O `signUp.spec.ts` do `pnpm e2e` criou a conta que ele mesmo cria, no emulador daquela execução.
- Alterados: o gênero de Joana Ribeiro (`female` para `other`), e o tema de `user@example.com` (de "Sistema" para
  "Escuro" e de volta a "Sistema").
- O e-mail `qa-form-field-focus@example.com` só foi digitado no diálogo de troca, que a API recusou com 503; nada
  gravado.
- Um `GET /account/export` baixou o JSON da conta do seed no navegador headless; nenhum arquivo ficou no
  repositório.
- Nada a acrescentar ao `docs/PRE-PRODUCTION.md`.

## Lacunas

| Lacuna | Origem | Veredito |
|--------|--------|----------|
| O foco no navegador real não aparece nos testes de `readOnly` | handoff e review | **fechada** pelos itens 2 e 3 (medição no navegador; continua sem teste automatizado, porque o jsdom não aplica "focus fixup") |
| B3 confere a classe `opacity-0`, não a largura | handoff e review | **fechada** pelo item 4 |
| Nome dos grupos de rádio nos 3 idiomas sem teste de unidade | handoff e review | **fechada** pelo item 5 no navegador; segue sem teste de unidade, pela decisão D8 do plano |
| Recusa por senha errada no diálogo de troca de e-mail | plano §9 | **continua aberta** (🔒): depende de Resend configurado |

## Achados fora do diff

1. Os alertas dos diálogos de conta terminam com "(Código do erro: <uuid>)" mesmo numa recusa esperada, como senha
   errada. Não é desta entrega; registro para quem revisar a copy.
2. Salvar as preferências em `/es/account` redireciona para `/pt-br/account`, porque o idioma da conta do seed é
   português. É o comportamento da preferência de idioma, não desta entrega.

## Remedição do R1

Correção do `/review` (rodada 2): o hook `useSubmitEnterGuard`
(`packages/design-system/components/form/hookform/useSubmitEnterGuard.ts`), ligado ao `onKeyDown` do
`HookFormInput` e do `HookFormInputPassword`. Ele cancela o Enter enquanto `isSubmitting` está ligado e por um
`setTimeout(0)` depois que o `submitCount` muda. Medi com o mesmo método da primeira vez: app e web em build de
produção refeito com esse código, emulador com o seed, wrapper de `fetch` instalado antes da navegação contando
`signInWithPassword`, tempos com `performance.now()`, e um `MutationObserver` marcando quando o botão de enviar
fica desabilitado.

### Enter repetido no login

Senha errada, foco no campo de senha, Enter por `agent-browser keyboard type` (2 a 3 ms entre teclas depois da
primeira). "Na janela" quer dizer que o segundo Enter chegou antes de o botão ficar desabilitado, que é o caso que
reprovava antes.

| App | Rodadas | Na janela | `signInWithPassword` por rodada |
|-----|---------|-----------|---------------------------------|
| app, 2 Enter | 16 | 12 (segundo Enter de 2,9 a 9,7 ms, botão desabilitado de 5,8 a 16,6 ms) | 1 em todas |
| app, 8 Enter | 3 | 2 (7 Enter dentro da janela em cada uma) | 1 em todas |
| web, 2 Enter | 8 | 7 (segundo Enter de 2,1 a 8,5 ms) | 1 em todas |
| web, 8 Enter | 3 | 2 (7 Enter dentro da janela em cada uma) | 1 em todas |

Na primeira medição, as mesmas condições deram 2 pedidos em 3 de 8 rodadas da app e em 7 de 8 da web, e de 6 a 8
pedidos com 8 Enter.

### Foco e recusa

Em todas as rodadas acima, depois de "Senha incorreta.", `activeElement` = `password`, com os 12 caracteres, log de
`focusout` vazio e nenhum erro de console. Uma rodada com dois Enter no campo de e-mail, em cada app: 1 pedido,
foco no `email` com os 16 caracteres, nenhum `focusout`.

### Enter volta a funcionar

- Login da app: depois das recusas, troquei a senha pela do seed e apertei Enter uma vez. A página foi para
  `/pt-br` (painel do usuário).
- Login da web: o mesmo, com `POST /api/auth/session` 200, a página em `/pt-br` e o botão "Sair" no header.
- Diálogo de exclusão (`/account`, privacidade), senha errada: Enter deu `POST /account/deletion` 400 e "A senha
  atual está incorreta."; um segundo Enter depois da resposta mandou outro `POST /account/deletion` 400. Foco em
  `currentPassword` o tempo todo, nenhum `focusout`. Com 4 Enter seguidos, 3 rodadas, saiu 1 pedido por rodada.
- Diálogo de troca de e-mail, para `qa-form-field-focus@example.com`: Enter deu `POST /account/email` 503 ("O
  envio de e-mails não está configurado."); um segundo Enter depois da resposta mandou outro 503. Foco em
  `currentPassword`, nenhum `focusout`.

### Suítes

| Comando | Resultado |
|---------|-----------|
| `corepack pnpm test` (raiz, sem `--force`, JDK 21 no `PATH`) | 15 de 15 tarefas, 13 do cache. Design system 171 (14 arquivos), app 846 (106), web 95 (16), api 1205 (93), `api:test:emulator` 186 (4). Os números do design system, da app e da web batem com os do `/review` e vieram do cache dele |

Não repeti o `pnpm e2e`: ele não cobre login com senha errada repetida, e a correção não toca em tela que a suíte
percorre de outro jeito. A rodada anterior deu 22 de 22.

### Ambiente e dados

Portas livres no início. Subi o emulador (com o seed), `next dev -p 3002` na API e `next start` na app e na web,
depois de refazer o `next build` dos dois com o env do emulador. Derrubei por PID (`SIGTERM` nos filhos do `pnpm`,
`SIGINT` no `firebase-tools`); no fim, nenhuma porta de 3000 a 3003, 9099, 8080, 4001, 9199, 4400, 4500 e 9150 com
processo. Fechei as sessões `qa-r1` e `qa-r1w` do agent-browser, apaguei `/tmp/qa-r1` e o `firestore-debug.log` da
raiz. Dados só no emulador, que morreu com o processo: contas do seed, nenhuma conta nova, nenhum dado gravado (as
duas recusas de conta não mudam nada).

### Veredito

R1 fechado: ✅. A lacuna da recusa por senha errada no diálogo de troca de e-mail continua 🔒, porque depende de
Resend.
