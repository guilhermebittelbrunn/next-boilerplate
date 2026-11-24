# Relatório de QA: foco escondido pela barra fixa

Branch `feat/delivery-security-hardening` (a da rodada, não protegida). Nenhum commit, nenhuma branch criada. O
`review` está `done` no `STATE.md`, então o gate anterior fechou.

Diff desta tarefa: duas classes no `<html>` de `apps/app/app/layout.tsx`, atributo `data-sticky-action-bar` em
`Footer` (só fixo), `Container` (barra de voltar) e `PageFormFooter`, atributo `data-panel-navbar` no `Navbar`, o
teste de componente `apps/app/__tests__/focusNotObscuredScrollPadding.test.tsx` e o E2E
`apps/e2e/tests/focusNotObscured.spec.ts`. Sem SDK, API, i18n ou env.

## Placar

| frente | resultado |
|--------|-----------|
| Vitest `app` + `e2e` | ✅ 1316/1316 (143 arquivos) e 38/38 (3 arquivos) |
| `pnpm test` da raiz | ✅ 15/15 tasks; 4384 testes Vitest + 274 do `test:emulator` |
| `focusNotObscured.spec.ts` repetido | ✅ 9/9 (`--repeat-each=3 --retries=0`), nenhum flaky |
| E2E vermelho sem a correção | ✅ 3/3 falham, com os mesmos números do handoff |
| T1 vermelho sem a correção | ✅ 5 falham, 2 passam (os negativos) |
| `pnpm e2e` inteiro (6 tarefas da rodada) | ✅ 45/45, 0 falha, 0 flaky, 2,7 min |
| Passada de `agent-browser` | ✅ 0 foco coberto em 16 percursos de Tab e Shift+Tab; barra com 69 px e uma linha em 18 medições a 375 px |
| Defeitos desta tarefa | nenhum |

## Critérios de aceite, item a item

| critério | status | meio | evidência |
|----------|--------|------|-----------|
| Rádio focado por seta fora da barra | ✅ | E2E + browser | E2E 3/3 repetido; editar entidade a 390×844: "Outro" começa em 764 px com a barra em 775 px, e a seta rola a página 177 px, deixando "Outro" em 587 a 603 px |
| Tab fora da barra nas 6 telas | ✅ | E2E + browser | 0 violação em todas as telas e viewports (tabela de medições) |
| Shift+Tab fora do `Navbar` | ✅ | E2E + browser | E2E "Shift+Tab brings a field out from under the navbar" verde; no browser, 0 violação; onboarding com `scrollPaddingTop` = `auto` |
| Sem folga onde não há barra | ✅ | browser | `scrollPaddingBottom` = `auto` em lista de entidades, lista de usuários, home do painel e nos 4 blocos da conta; `scrollPaddingTop` = `auto` em login e cadastro; volta a `auto` depois de sair do formulário pelo App Router, sem recarga |
| Barra sem mudança de aparência | ✅ | browser + E2E + unit | 69 px, 1 linha, `sticky`, fundo e borda iguais nos 3 idiomas em claro e escuro; salvar e voltar funcionam (`entityCrud` verde, "Voltar" clicado no browser); `sharedFooterPendingState.test.tsx` 7/7 cobre o `disabled` explícito e o envio pendente. As páginas passam `disabled={isImpersonating …}`. A impersonação não foi dirigida no navegador; o diff só acrescenta um atributo `data-*` e não toca no `disabled` |
| Renomear atributo quebra teste | ✅ | unit | T1 7/7; sem as classes, 5 falham (medido por mim) |
| E2E falha sem a correção | ✅ | E2E | 3/3 vermelhos sem as classes (medido por mim) |

## Cobertura automatizada

| comando | resultado |
|---------|-----------|
| `pnpm turbo run typecheck test --filter=app --filter=e2e` | 12/12 tasks (10 do cache); `app` 1316 testes, `e2e` 38 testes |
| `pnpm --filter app exec vitest run __tests__/focusNotObscuredScrollPadding.test.tsx` | 7/7 |
| `pnpm --filter app exec vitest run __tests__/sharedFooterPendingState.test.tsx` | 7/7 |
| o mesmo, com as duas classes removidas do `html` | 5 falham, 2 passam; arquivo restaurado e conferido com `cmp` |
| `pnpm test` (raiz, JDK 21 no `PATH`) | 15/15 tasks (13 do cache); `api:test:emulator` 274/274 |
| `pnpm turbo run test` (contagem por workspace) | api 1825, app 1316, web 315, email 209, auth 201, design-system 172, internationalization 67, security 65, shared 63, analytics 41, next-config 38, e2e 38, payments 19, sdk 15 |
| `pnpm exec playwright test tests/focusNotObscured.spec.ts --project=chromium --repeat-each=3 --retries=0` | 13 passed (4 de setup e 9 do spec), 1,0 min |
| o mesmo sem as classes, `--retries=0` | 3 falham: `birthdate ends at 812px, under the action bar that starts at 743px`; `… starts at 40px, under the navbar that ends at 64px`; `_r_n_-female ends at 748px, under the action bar that starts at 743px` |
| `pnpm e2e` | 45 passed (2,7 min): 4 setup, 32 `chromium`, 9 `mobile` |

Nenhum comando com `--force`. Não rodei `pnpm check` de novo: não alterei código nem teste, e o `/review` já o
mediu.

### Testes criados

Nenhum. A cobertura que a tarefa pede já existe nas duas faixas.

### Decisões de custo de teste

- Atributo e seletor: T1, faixa barata. Prova que o seletor do `html` e os atributos combinam e que o `Footer` com
  `sticky={false}` não publica nada.
- Rolagem real do navegador: o E2E existente, faixa cara, justificada porque o objeto do teste é o comportamento de
  rolagem do Chromium com `scroll-padding`. Nenhum mock prova isso.
- Admin e onboarding não ganharam E2E. Os formulários de usuário e os dois passos do onboarding cabem na viewport
  nos três tamanhos medidos (rolagem máxima 0 px em criar e editar usuário), então não reproduzem o defeito. Um teste
  ali passaria no vazio.
- Altura da barra: não criei asserção própria. Uma barra mais alta que 80 px faria as asserções de sobreposição do
  E2E falharem nas telas de entidade, as únicas longas o bastante para rolar.

## Verificar no `/test` (lista do `review.md`)

| item | veredito |
|------|----------|
| `focusNotObscured.spec.ts` com a pré-condição nova, esperado 3/3 | **confirmado**: 9/9 em 3 repetições, e a pré-condição passou em todas |
| Admin (criar e editar usuário) e onboarding (2 passos) a 390×844 e 1280×720, Tab e Shift+Tab | **confirmado**: 0 controle coberto. Os formulários cabem na tela; a correção não é exercitada ali, e também não atrapalha |
| `scroll-padding` padrão sem barra, inclusive depois de sair de um formulário pelo App Router | **confirmado**: `auto` nos casos sem barra; um marcador em `window` sobreviveu às navegações, então não houve recarga |
| Barra numa linha a 375 px, 3 idiomas, claro e escuro | **confirmado**: 69 px e 1 linha nas 18 medições. O espanhol ("Volver"/"Guardar", "Omitir"/"Finalizar") não quebra |
| Teclado virtual, Safari e Firefox | 🔒 não verificável aqui |

## Evidências no navegador

### Instrumento

Stack próprio com o ambiente do E2E (`buildStackEnv` de `apps/e2e/support/stackEnv.ts`, emulador com projeto
`demo-next-boilerplate`): `pnpm emulators`, seed por `node scripts/seed-emulator.mjs`, `next dev` da `api` (3002) e da
`app` (3000). `agent-browser` 0.27.0, comandos em sequência. Em cada parada do foco, um `eval` espera a rolagem
suave parar (3 frames com o mesmo `scrollY`) e compara `document.activeElement.getBoundingClientRect()` com
`[data-sticky-action-bar]` e `[data-panel-navbar]`. Controles dentro das barras não contam.

Antes de fechar, confirmei em `next build && next start` (mesmo ambiente): editar entidade a 375×812 com 0
violação, barra com 69 px, e `scrollPaddingBottom` voltando a `auto` na lista pelo App Router.

### Medições

| tela | viewport | idioma/tema | paradas (ida/volta) | violações | observação |
|------|----------|-------------|---------------------|-----------|------------|
| criar usuário (admin) | 390×844 | pt-br claro | 7/7 | 0 | página não rola; barra em 759 px, primeiro campo em 234 px |
| criar usuário (admin) | 1280×720 | pt-br claro | 7/7 | 0 | rolagem máxima 0 px |
| editar usuário (admin) | 1280×720 | pt-br claro | 3/3 | 0 | o e-mail desabilitado fica fora do Tab |
| editar usuário (admin) | 390×844 | pt-br claro | 3/3 | 0 | rolagem máxima 0 px |
| criar entidade | 390×844 | pt-br claro | 8/8 | 0 | |
| criar entidade | 1280×720 | pt-br claro | 8/8 | 0 | |
| editar entidade | 390×844 | pt-br claro | 9/9 | 0 | |
| editar entidade | 1280×720 | pt-br claro | 9/9 | 0 | rolagem máxima 301 px; o Tab rola até 301 px, o Shift+Tab volta e deixa a descrição em 69 px, abaixo do `Navbar` (64 px) |
| editar entidade | 375×812 | es escuro | 9/9 | 0 | |
| editar entidade (`next start`) | 375×812 | pt-br claro | 9/9 | 0 | |
| onboarding, perfil | 390×844 | pt-br claro | 1/1 | 0 | `scrollPaddingTop` `auto`, `scrollPaddingBottom` `80px` |
| onboarding, perfil | 1280×720 | pt-br claro | 1/1 | 0 | |
| onboarding, perfil | 375×812 | es escuro | 1/1 | 0 | |
| onboarding, preferências | 390×844 | pt-br claro | 2/2 | 0 | |
| onboarding, preferências | 1280×720 | pt-br claro | 2/2 | 0 | |
| onboarding, preferências | 375×812 | es escuro | 2/2 | 0 | |

Setas em editar entidade a 390×844: com a página no topo, "Outro" começa em 764 px e a barra em 775 px (o rádio de
16 px fica com a metade de baixo coberta). Seta para baixo a partir de "Prefiro não dizer": "Masculino" de 700 a 716
px, "Feminino" de 732 a 748 px, "Outro" de 587 a 603 px depois de a página rolar 177 px. Nenhuma parada coberta.

`scroll-padding` do `html` (`getComputedStyle`):

| página | `top` | `bottom` |
|--------|-------|----------|
| login, cadastro | `auto` | `auto` |
| onboarding (os 2 passos) | `auto` | `80px` |
| home do painel, logo depois de concluir o onboarding (App Router) | `80px` | `auto` |
| lista de entidades, inclusive depois de "Voltar" no criar (App Router) | `80px` | `auto` |
| lista de usuários, inclusive depois de "Voltar" no editar usuário | `80px` | `auto` |
| conta: perfil, preferências, segurança, privacidade (vindo de criar entidade pelo App Router) | `80px` | `auto` |
| criar e editar entidade, criar e editar usuário | `80px` | `80px` |

O bloco de senha para conta sem senha (`AccountPasswordSetForm`) não aparece para a conta do seed, que tem senha.
Ele usa o mesmo `Footer sticky={false}`, coberto pelo caso negativo do T1.

Barra de ações a 375×812 (altura, linhas de botões, rótulos):

| tela | claro | escuro |
|------|-------|--------|
| criar e editar entidade, pt-br | 69 px, 1 linha, "Voltar"/"Salvar" | 69 px, 1 linha |
| criar e editar entidade, en | 69 px, 1 linha, "Back"/"Save" | 69 px, 1 linha |
| criar e editar entidade, es | 69 px, 1 linha, "Volver"/"Guardar" | 69 px, 1 linha |
| criar usuário, pt-br/en/es | 69 px, 1 linha em todos | 69 px, 1 linha em todos |
| onboarding, es | não medido | 69 px, 1 linha, "Continuar" e depois "Omitir"/"Finalizar" |

Fundo da barra: `oklab(0.999998 … / 0.8)` no claro e `oklab(0.145 … / 0.8)` no escuro; borda superior
`lab(90.952 …)` e `lab(15.204 …)`. Posição `sticky` em todos.

### Visual (capturas descartadas pelo `.gitignore`)

- Editar entidade, es, escuro, 375×812, com o foco de volta no nome depois do Shift+Tab: o campo aparece logo abaixo
  do `Navbar`, com o anel de foco visível; o rótulo "Nombre" fica por baixo do `Navbar`. A barra mostra "Volver" e
  "Guardar" lado a lado numa linha.
- Onboarding, passo 2, es, escuro, 375×812: "Paso 2 de 2", select "Español", "Omitir" e "Finalizar" na mesma linha.

## Achados fora de escopo

- **SSR com `RangeError: Maximum call stack size exceeded` no `next dev`** em criar e editar usuário (admin) e em
  criar entidade, nas cargas completas. O stack aponta para `instantiateModule`/`commonJsRequire` do runtime do
  Turbopack em `.next/dev`, ou seja, recursão no carregamento de módulos em desenvolvimento. A página cai para
  render no cliente e funciona. Repro: com a stack de pé e o cookie `access-token` do admin, um `curl` em
  `http://localhost:3000/pt-br/admin/users/create` faz o log do `next dev` mostrar `[request] failed … digest=…`.
  Repete depois de reiniciar o `next dev`. Em `next build && next start` o mesmo `curl` devolve 200 sem erro, com
  as barras no HTML. Durante o `pnpm e2e` (também `next dev`) o erro não aparece no log. Não vem desta tarefa: o
  diff só acrescenta classes CSS e atributos `data-*`, que não mexem no grafo de módulos. Não investiguei a origem;
  a hipótese para o backlog é uma cadeia de `require` profunda que estoura a pilha conforme a ordem de compilação.
- O Next avisa no console: `Detected scroll-behavior: smooth on the <html> element. To disable smooth scrolling
  during route transitions, add data-scroll-behavior="smooth"`. O `scroll-smooth` já estava no `html` antes desta
  tarefa.
- A folga do Shift+Tab fica abaixo dos 80 px reservados: em editar entidade a 1280×720, a descrição parou em 69 px,
  5 px abaixo do `Navbar`. Não há sobreposição, mas o rótulo do campo fica por baixo da barra. Não reprova o SC
  2.4.11.

## Lacunas herdadas

| lacuna (handoff/review) | veredito |
|-------------------------|----------|
| E2E não cobre admin nem onboarding | **continua aberta, por decisão**: as telas não rolam e o teste passaria no vazio. Percorridas no browser |
| E2E não roda em `en` e `es` | **fechada no browser**: barra com 69 px e uma linha nos três idiomas; percurso de Tab em `es` sem violação |
| T1 não confere a altura da barra | **continua aberta**: a altura medida é 69 px em todos os casos; só o E2E pegaria uma barra acima de 80 px |
| `textarea` longo com cursor no fim (desvio 3) | **continua aberta, sem correção**: comportamento do Chromium, SC 2.4.11 mínimo atendido; não reproduzi |
| Teclado virtual, Safari, Firefox | **fora do alcance** |
| Botão desabilitado sob impersonação | **fechada no unit**: `sharedFooterPendingState.test.tsx` 7/7; a impersonação ponta a ponta não foi dirigida |

## Ambiente do e2e

- Portas 3000, 3001, 3002, 3003, 8080, 9099, 4001, 9199, 4400 e 4500 livres antes de começar. Nada do usuário para
  reutilizar.
- O Playwright subiu e derrubou o próprio stack nas três rodadas (`focusNotObscured` repetido, `pnpm e2e`, E2E
  vermelho).
- Para o browser, subi por um script em `/tmp`: emuladores (PGID 94372, derrubado com SIGINT), `api` (PGID 94904),
  `app` em `next dev` (PGID 94909, derrubado para reiniciar; depois PGID 18614) e `app` em `next start` (PGID
  20025). Matei cada grupo por PGID. Sobrou um `next-server` (PID 20030), que saiu depois de um `kill -KILL`.
- No fim: nenhuma porta escutando, nenhum `next-server`, Java ou `firebase.js` meu. Fechei as sessões do
  `agent-browser`. O processo `firebase-tools mcp` que segue rodando não é meu.
- Apaguei os `apps/{api,app,web}/AGENTS.md` não rastreados que o `next dev` gera.
- `apps/app/.next/`: ficou com o build de produção que gerei com o ambiente do E2E, apontando para o emulador
  (`demo-next-boilerplate`, API em `http://localhost:3002`). O build que estava lá antes (`BUILD_ID` das 03:33)
  também apontava para o emulador. Um `next build` com o `.env` local substitui. O `.next/dev` continua com o cache
  do `next dev`.
- O `layout.tsx` foi editado só durante a medição do vermelho e restaurado da cópia; `cmp` confirmou o arquivo
  idêntico, e o T1 voltou a 7/7.

## Estado de dev alterado e dados de QA

Tudo no emulador, que morre com o processo. Nada em projeto Firebase real.

- Contas criadas pelo cadastro da app: `qa-footer-focus@example.com` (onboarding concluído, nome "QA Footer
  Focus") e `qa-footer-focus-es@example.com` (onboarding concluído em espanhol, nome "QA ES"). A senha foi gerada na
  hora e ficou só num arquivo em `/tmp`, já apagado. As contas não vão para o `docs/PRE-PRODUCTION.md` porque não
  existem fora do emulador.
- Contas do seed usadas: `admin@example.com` e `user@example.com`.
- Um clique errado meu desligou o switch "Ativo" da entidade semeada "Acme Franchise"; religuei na hora e conferi
  no Firestore do emulador (`enabled: true`).

## Arquivos alterados nesta etapa

- `docs/features/app-footer-focus-not-obscured/test/criterios-aceite.md` (novo)
- `docs/features/app-footer-focus-not-obscured/test/report.md` (novo)
- `docs/features/app-footer-focus-not-obscured/STATE.md` (linha `test`)
