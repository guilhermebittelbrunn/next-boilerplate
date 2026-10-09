# Relatório de QA: rótulos de UI traduzidos, antd no idioma ativo e foco na senha depois de uma recusa

Rodada autônoma do `/cycle`, em 2026-10-09, no checkout
`/Users/guilhermebittelbrunn/conductor/workspaces/next-boilerplate/bern`, branch
`guilhermebittelbrunn/cycle-command-v2` (não protegida, mas inválida no regex do `/review`; a proposta
`fix/ui-labels-and-account-dialog-focus` está no `review.md`). Não criei branch, não fiz `git add` nem commit.

Resultado: todos os critérios passam onde dá para medir neste ambiente. Nenhum defeito de produção. O R1
(troca de idioma sem recarregar nos componentes que usam `getDictionary()`) foi medido no navegador e não
reproduz: todos os rótulos acompanham a troca.

`<account>` abrevia `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)`.

## 1. Testes executados

| Comando | Resultado |
|---------|-----------|
| `pnpm test` (raiz, `JAVA_HOME=/opt/homebrew/opt/openjdk@21`, sem `--force`) | exit 0, `Tasks: 15 successful, 15 total`, `Cached: 12 cached`, 15,0 s |
| `pnpm turbo run typecheck --filter=@repo/design-system --filter=app --filter=web --filter=@repo/internationalization` | 4/4 ok (cache) |
| `next build` da `apps/app` (pasta `.next` apagada antes) | exit 0, todas as rotas compiladas |
| `next build` da `apps/web` | exit 0 |

Contagem por workspace no `pnpm test` da raiz: app 103 arquivos/841, design-system 9/116, web 15/90,
internationalization 7/67 (inclui `parity.test.ts`, 2/2), api 93/1205, api `test:emulator` 4/186, auth 127,
email 202, security 45, shared 44, analytics 34, next-config 32, payments 22, e2e 16, sdk 9. Os números de
design-system, app, web e internationalization batem com os do handoff. Vieram do cache do turbo, e não havia
motivo para suspeitar dele: os hashes cobrem os arquivos do working tree, e `api:test` e `e2e:test` rodaram de
novo e passaram.

Não refiz `pnpm check` nem as mutações. Não editei código, e as mutações do handoff são coerentes com o que os
testes afirmam (por exemplo, os casos em en que passam sem a correção são exatamente os de literal igual à copy
nova). Nada no navegador contradisse esses números.

### Testes criados

Nenhum. A lacuna que sobrava sem teste era a troca de idioma sem recarregar para os componentes com
`getDictionary()`, e ela depende da troca de rota do App Router, que o jsdom não reproduz. Fechei no navegador
(seção 3). As demais lacunas não pedem teste novo (seção 7).

## 2. Decisões de custo de teste

| Módulo tocado | Decisão |
|---------------|---------|
| 8 componentes de `packages/design-system/components/ui` | `componentCopy.test.tsx` (28 casos, 3 idiomas) já prova o texto de cada um. Nada aqui depende de infra; não criei teste caro |
| `providers/antd-app.tsx` | `antdLocale.test.tsx` (5 casos, incluindo troca sem remontar). O import CommonJS no build do Next, que o Vitest não prova, foi medido no `next build` + navegador |
| `LanguageSwitcher.tsx`, `PageBreadcrumb.tsx` (app) e `language-switcher.tsx` (web) | `sharedComponentCopy.test.tsx` e `languageSwitcher.test.tsx` cobrem rótulo e `href`. A navegação real do link ficou no navegador |
| `<account>/AccountPrivacyPanel.tsx`, `<account>/AccountEmailChangeDialog.tsx` | T4, T5 e T6 no jsdom cobrem o `onError`, o `autoComplete` e o `required`. Foco e seleção reais medidos no navegador. Nenhuma rota de API mudou, então nenhum teste com emulador |
| 8 folhas de i18n | `parity.test.ts` |

## 3. Evidências da passada no navegador

Ambiente na seção 6. Contas do seed `user@example.com` e `admin@example.com` (senha publicada no script do
seed, não repetida aqui). As leituras usaram `document.activeElement`, `selectionStart`/`selectionEnd`,
`aria-label`, o texto dos `.sr-only` e a árvore de acessibilidade do `agent-browser`.

### 3.1 Cabeçalho e troca de idioma sem recarregar (R1)

Antes de cada troca gravei uma marca em `window`; depois da troca a marca continuava lá, o que prova que a
página não recarregou.

| Tela | Idioma | Observado |
|------|--------|-----------|
| `/sign-in`, claro, 1280 px | pt-br / en / es | Gatilho "Alternar tema" / "Toggle theme" / "Cambiar tema". Itens "Claro, Escuro, Sistema" / "Light, Dark, System" / "Claro, Oscuro, Sistema" |
| `/entities` (comum), claro, 1280 px | pt-br | `.sr-only`: "Alternar barra lateral", "Trocar idioma", "Alternar tema". Botão do seletor: "🇧🇷 Trocar idioma". `nav` "Trilha de navegação" com link "Início". Menu de idiomas: "🇧🇷 Português", "🇬🇧 English", "🇪🇸 Español" |
| mesma página, troca pelo seletor | pt-br → en | URL `/en/entities`, marca intacta. "Toggle sidebar", "Switch language", "Toggle theme", `nav` "Breadcrumb", link "Home", itens "Light, Dark, System" |
| idem | en → es | URL `/es/entities`, marca intacta. "Alternar barra lateral", "Cambiar idioma", "Cambiar tema", `nav` "Ruta de navegación", itens "Claro, Oscuro, Sistema" |
| idem | es → pt-br | URL `/pt-br/entities`, marca intacta, rótulos de volta ao pt-br |
| `/admin/users` (admin), escuro, 1280 px | pt-br → en → es | Os três `.sr-only` e o `nav` acompanharam cada troca, marca intacta |
| landing `apps/web`, escuro, 1280 px | es / en / pt-br | `.sr-only` "Cambiar idioma", "Cambiar tema" / "Switch language", "Toggle theme" / "Trocar idioma", "Alternar tema" |
| landing, troca pelo seletor | es → en | URL `/en`, marca intacta, "Switch language" e "Toggle theme", itens "Light, Dark, System" |

Nenhum rótulo ficou no idioma anterior. O motivo, lido em `packages/internationalization/client.ts`: no
navegador o `getDictionary()` lê o idioma que o `LocaleProvider` gravou no último render, e os componentes do
cabeçalho ficam abaixo do segmento `[locale]`, que remonta a cada troca.

### 3.2 Barra lateral mobile, spinner e breadcrumb

| Passo | Observado |
|-------|-----------|
| 390 px, `/es/account`, escuro, abrir a barra lateral | `[role=dialog]` com nome "Barra lateral", descrição "Muestra la navegación lateral.", botão "Cerrar", 288 px de largura |
| idem em `/pt-br/entities` e `/en/entities` | "Barra lateral" / "Mostra a navegação lateral." / "Fechar"; "Sidebar" / "Shows the side navigation." / "Close" |
| `/playground` em pt-br, en, es | Os 5 `role="status"` com `aria-label` "Carregando" / "Loading" / "Cargando". Os dois `PageBreadcrumb` da página com link "Início" `/pt-br`, "Home" `/en`, "Inicio" `/es` |
| Clique no "Início" do `PageBreadcrumb` (pt-br) | Navegou para `/pt-br`, título "Painel do usuário", cabeçalho "Olá". Sem 404 |
| `/es/playground`, escuro, 390 px | `scrollWidth` 375 com `innerWidth` 390, sem rolagem horizontal |

Fora desta mudança: o `/playground` tem um botão de demonstração com o texto fixo "Loading"
(`playground/page.tsx:717`, `<Button loading>Loading</Button>`), que vira o `.sr-only` do botão. É a copy de
exemplo da página, não do `Spinner`.

### 3.3 Paginação do antd na `/admin/users` (R4)

O seed tem 3 usuários e a tabela usa `hideOnSinglePage`, então criei 9 contas de QA no emulador (seção 8) para
ter duas páginas. Com 12 usuários:

| Estado | Seletor de tamanho | `title` anterior / próxima |
|--------|--------------------|----------------------------|
| pt-br, escuro, 1280 px | "10 / página" | "Página anterior" / "Próxima página" |
| en (troca sem recarregar) | "10 / page" | "Previous Page" / "Next Page" |
| es (troca sem recarregar) | "10 / página" | "Página anterior" / "Página siguiente" |
| es, claro, 390 px | oculto pelo antd nessa largura | "Página anterior" / "Página siguiente" |

A 390 px a paginação ocupa x 32 a 343, dentro da tela; `scrollWidth` igual a 390. O import `antd/locale/*`
funciona no bundle de produção do Next.

### 3.4 Foco e seleção depois de uma recusa

`len` é o tamanho do valor digitado; `ss`/`se` são `selectionStart`/`selectionEnd`.

| # | Diálogo | Idioma, tema, largura | Envio | API | Foco depois |
|---|---------|-----------------------|-------|-----|-------------|
| 1 | Troca de e-mail | pt-br, claro, 1280 | Enter no campo | `POST /account/email 503` | `currentPassword`, ss 0, se 15, len 15, campo habilitado. Toast "O envio de e-mails não está configurado. Fale com o suporte." |
| 2 | Troca de e-mail | pt-br, claro, 1280 | botão "Enviar link" | 503 | ss 0, se 16, len 16 |
| 3 | Exclusão | pt-br, claro, 1280 | Enter no campo | `POST /account/deletion 400` | ss 0, se 17, len 17. Toast "A senha atual está incorreta." |
| 4 | Exclusão | pt-br, claro, 1280 | botão "Excluir para sempre" | 400 | ss 0, se 18, len 18 |
| 5 | Exclusão | es, escuro, 390 | Enter | 400 | ss 0, se 16, len 16. Toast "La contraseña actual es incorrecta." Diálogo de x 16 a 374 |
| 6 | Troca de e-mail | es, escuro, 390 | botão "Enviar enlace" | 503 | ss 0, se 17, len 17. Toast "El envío de correos no está configurado. Contacta al soporte." |
| 7 | Troca de e-mail | en, claro, 1280 | Enter | 503 | ss 0, se 16, len 16. Toast "Email delivery is not configured. Contact support." |
| 8 | Exclusão | en, claro, 1280 | botão "Delete forever" | 400 | ss 0, se 17, len 17. Toast "The current password is wrong." |
| 9 | Exclusão | pt-br, escuro, 390 | Enter | 400 | ss 0, se 20, len 20 |

Depois dos casos 1 e 3, uma tecla digitada deixou o valor com 1 caractere: a seleção é substituída. No print
do caso 5 a senha aparece com o realce de seleção e o rótulo "Contraseña actual *".

Omiti os códigos dos toasts; cada um trazia "(Código do erro: <uuid>)" no idioma da página.

### 3.5 Campo de senha, personificação e regressão da tarefa 1

| Passo | Observado |
|-------|-----------|
| Atributos do campo da exclusão | `autocomplete="current-password"`, `aria-required="true"`, rótulo "Senha atual *" |
| Enviar vazio (pt-br, escuro, 390) | "Informe a senha.", `aria-invalid="true"`, foco no campo. Nenhum `POST /account/deletion` novo no log da API |
| Admin personificando `qa-ui-strings-02@example.com` (seletor "Ambiente" → "Painel do usuário") | "Trocar e-mail", "Excluir minha conta" e "Baixar meus dados" com `disabled`; o clique não abre diálogo |
| Abrir a exclusão por Enter e por Espaço | Foco no campo, valor vazio |
| Tab 4 vezes a partir do campo | "Mostrar senha", "Cancelar", "Excluir para sempre", campo; todos dentro de `[role=alertdialog]` |
| Tab até "Cancelar" e Enter | Diálogo fechado, foco em "Excluir minha conta" |
| Digitar, Esc | Diálogo fechado, foco em "Excluir minha conta". Reaberto, o campo está vazio |

### 3.6 Hidratação

Li console e erros de página depois de cada carga com `agent-browser console`/`errors` (antes conferi que a
captura funciona emitindo um `console.error` de sonda). Nenhuma mensagem em `/pt-br/sign-in`, `/en/sign-in`,
`/es/sign-in`, `/pt-br/entities`, `/en/playground`, `/es/playground`, `/es/admin/users` e na landing em `/es`,
`/en` e `/pt-br`. Em build de produção o React registra hidratação divergente como erro minificado no console,
então a ausência de mensagem vale como ausência do aviso.

Prints de apoio em `docs/features/ui-strings-and-password-focus/test/e2e/` (descartados pelo `.gitignore`):
`01-ptbr-signin-theme-menu-light.png`, `02-ptbr-email-503-focus-light.png`,
`03-ptbr-deletion-400-focus-light.png`, `04-es-sheet-dark-390.png`, `05-es-deletion-400-dark-390.png`,
`06-en-deletion-400-light-desktop.png`, `07-es-playground-breadcrumb-dark-390.png`,
`08-ptbr-admin-users-pagination-dark.png`, `09-es-admin-users-pagination-light-390.png`,
`10-web-es-light-390.png`, `11-ptbr-deletion-400-dark-390.png`. Só aparecem contas `@example.com`.

## 4. Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| Controles do cabeçalho falam o idioma da página | ✅ | navegador (3.1), Vitest |
| Diálogos, carregamento e navegação sem inglês solto | ✅; diálogo de cookies, `Pagination` e carrossel 🔒 no navegador | navegador (3.2) para `Sheet`, `Spinner` e breadcrumb; Vitest para o resto |
| Breadcrumb de página leva para a home do idioma atual | ✅ | navegador (3.2), Vitest |
| Paginação do antd no idioma da página | ✅ | navegador em build de produção (3.3), Vitest |
| Foco volta à senha depois de uma recusa na exclusão | ✅ | navegador (3.4, casos 3, 4, 5, 8, 9), Vitest T4. Sucesso só no Vitest nesta rodada |
| Foco volta à senha depois de uma recusa na troca de e-mail | ✅ para 503; 🔒 para os outros códigos e para o sucesso | navegador (3.4, casos 1, 2, 6, 7), Vitest T6 |
| Campo de senha da exclusão completo | ✅ | navegador (3.5), Vitest T5 |
| Personificação continua bloqueando os dois diálogos | ✅ | navegador (3.5) |
| Regressão do foco ao abrir o diálogo de exclusão | ✅ | navegador (3.5), 6 casos Vitest |
| Paridade e regressão | ✅ | `pnpm test` da raiz |

Placar: 10 ✅, 0 ❌. Ficam 🔒 dentro de critérios aprovados: diálogo de cookies, `Pagination`, carrossel,
recusas do diálogo de e-mail além do 503 e sucesso da troca de e-mail.

## 5. Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|------|----------|
| 1 | Foco e seleção depois da recusa, nos dois diálogos, por Enter e por clique | **Confirmado.** 9 medições (3.4), 3 idiomas, claro e escuro, 1280 e 390 px. O campo já está habilitado quando o `onError` roda, como o review previa para resposta de rede |
| 2 | Troca de idioma sem recarregar (R1) | **Confirmado, sem defeito.** Painel comum, admin e landing; pt-br → en → es → pt-br (3.1) |
| 3 | antd no build do Next (R4) | **Confirmado.** `next build` limpo; "10 / página", "10 / page", títulos traduzidos, troca sem recarregar; escuro 1280 e claro 390 (3.3) |
| 4 | Hidratação | **Confirmado.** Console vazio nas três páginas pedidas e em mais sete (3.6) |
| 5 | `PageBreadcrumb` no `/playground` | **Confirmado.** `href` `/<locale>` nos 3 idiomas e navegação para a home sem 404, logado como usuário comum. Como admin não medi o clique; o `href` é o mesmo e o proxy decide o destino |
| 6 | `Sheet` mobile a 390 px | **Confirmado.** Nome, descrição e "Fechar" nos 3 idiomas (3.2) |
| 7 | Layout da `Pagination` do design system | **🔒 não verificável no navegador.** O componente não tem consumidor: o `/playground` não o usa (`git grep` confirma). O texto fica coberto pelo `componentCopy.test.tsx`. As telas que mudaram de texto (`/playground`, `/admin/users`, `Sheet`) não estouraram a largura a 390 px |
| 8 | Regressão de `account-deletion-dialog-focus` | **Confirmado.** Foco ao abrir, Tab preso, Esc e "Cancelar" devolvendo o foco, limpeza ao fechar (3.5) |

## 6. Ambiente do e2e

| Serviço | Porta | Antes | O que fiz |
|---------|-------|-------|-----------|
| Emuladores (Auth, Firestore, Storage, UI, hub, logging) | 9099, 8080, 9199, 4000/4001, 4400, 4500, 9150 | livres | `pnpm emulators` com JDK 21 de `/opt/homebrew/opt/openjdk@21`, depois `pnpm seed` |
| App | 3000 | livre | `.next` apagado, `next build` e `next start -p 3000` |
| Web | 3001 | livre | `next build` e `next start -p 3001` |
| API | 3002 | livre | `next dev -p 3002` |
| E-mail | 3003 | livre | não subi |

O ambiente dos servidores saiu do `buildStackEnv` da `apps/e2e` (projeto `demo-next-boilerplate`, nenhuma chave
real). A API rodou em `next dev` porque o build de produção dela exige `FIREBASE_ADMIN_CLIENT_EMAIL` e
`FIREBASE_ADMIN_PRIVATE_KEY`, pendência já registrada no `docs/PRE-PRODUCTION.md`. O diff não toca a API.

Nenhum serviço do usuário estava de pé, então não reutilizei nada. No fim matei os quatro PIDs que guardei. O
`kill` no processo do `pnpm emulators` deixou vivos o `firebase-tools` e o Java do Firestore; matei os dois
pelo PID que ouvia nas portas que eu tinha aberto. Depois disso, `lsof -ti tcp:<porta> -sTCP:LISTEN` saiu vazio
para 3000, 3001, 3002, 3003, 8080, 9099, 9199, 4000, 4001, 4400, 4500, 9150 e 8085, e não sobrou processo
`next start`, `next dev` nem emulador.

## 7. Lacunas

| Lacuna (de onde veio) | Veredito |
|-----------------------|----------|
| T1 não cobre o `SidebarRail` no celular (handoff, review) | **Continua aberta.** No celular a barra vira `Sheet` e o rail não aparece; o rótulo é o mesmo `sidebarCopy.toggle` do caso de desktop. Baixo risco |
| `CommandDialog` e `DateInput` sem teste (handoff) | **Fora de escopo** (fora do corte, §1.2 do plano) |
| Nenhum teste prova a troca de idioma sem recarregar com `getDictionary()` (handoff, review) | **Fechada no navegador** (3.1). Continua sem Vitest, porque o jsdom não reproduz a troca de rota do App Router |
| T6 cobre um código de recusa só (handoff, review) | **Continua aberta e aceitável.** No navegador, o 503 percorre a mesma linha; o `onError` não lê o código |
| Rejeição que chega antes de o campo voltar a habilitado (review, nit 1) | **Continua aberta.** Não acontece com resposta de rede (nenhuma das 9 medições caiu nesse caso). Só vale cobrir se a D7 (`readOnly` no lugar de `disabled`) for adotada |
| Recusa `ACCOUNT_CURRENT_PASSWORD_INVALID` e sucesso no diálogo de e-mail (plano §9, item 10) | **🔒** Exige Resend configurado |
| Diálogo de preferências de cookies (plano §9, item 4) | **🔒** O consentimento só fica disponível com um ID do Google Analytics, vazio no ambiente do emulador. Rebuildar as duas apps com um ID falso só para isso não compensou; o rótulo "Fechar" do `Dialog` está no `componentCopy.test.tsx` |
| Seletores de idioma e de tema da `apps/web` a 390 px (plano §9, item 8) | **Não medível no celular.** O cabeçalho esconde os dois nessa largura e o menu mobile só tem links. Já era assim antes; os nomes traduzidos estão no DOM. O menu mobile sem nome já está entre os achados de backlog (§13.3 do plano) |

## 8. Estado de dev alterado

- Criei 9 contas no Auth emulator, `qa-ui-strings-01@example.com` a `qa-ui-strings-09@example.com`, com perfil
  `common` no Firestore emulator, para a paginação da `/admin/users` aparecer. A senha de cada uma foi
  aleatória e não ficou guardada. Usei `qa-ui-strings-02` na personificação. Tudo sumiu com o processo do
  emulador; nada foi criado em projeto Firebase real. Não há conta a limpar nem entrada nova no
  `docs/PRE-PRODUCTION.md`.
- Na `/admin/users`, um clique meu caiu por engano no switch "Usuário ativo" de `user@example.com` e o desativou
  (`PUT /users/<id> 200`). Reativei na hora (segundo `PUT 200`, switch `aria-checked="true"`). Também só no
  emulador.
- `apps/app/.next` e `apps/web/.next` agora têm builds de produção apontados para o emulador
  (`NEXT_PUBLIC_FIREBASE_PROJECT_ID` `demo-next-boilerplate`, API em `http://localhost:3002`). Um `next start`
  sem build novo usaria esses bundles. As pastas são ignoradas pelo git, e o `pnpm dev` não as usa.
- Nenhuma credencial foi gravada em arquivo versionado. Os arquivos temporários ficaram fora do repo, em
  `/tmp/uisf/`. O working tree tem os mesmos arquivos modificados e novos do início desta etapa, mais estes dois
  artefatos e a pasta `test/e2e/` (ignorada).

## 9. Cross-check

| Eixo | Situação |
|------|----------|
| `apps/app` × `apps/web` | As duas medidas: cabeçalho, seletor de idioma e troca sem recarregar nas duas |
| Comum × admin × personificação | Comum: cabeçalho, diálogos, `/playground`. Admin: cabeçalho e `/admin/users`. Personificação: diálogos bloqueados |
| `subscription` × `simple` | Não muda; nenhum dos componentes depende do modo. Rodei em `subscription` |
| Mobile × desktop | 390 px e 1280 px |
| Claro × escuro | Os dois, trocados pelo próprio menu de tema |
| Idiomas | pt-br, en e es |
