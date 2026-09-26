# Relatório de QA: i18n-hydration-admin-delete-billing

Rodada autônoma do `/cycle`, em 2026-09-25. Branch atual: `sync-spec-backlog-audit` (não protegida; o
`/review` propôs renomear para `fix/i18n-hydration-admin-delete-billing`, e o rename ainda não foi feito).
O `/review` está `done` no `STATE.md` e nenhum commit da feature existe ainda, então o gate anterior está
coerente.

Resultado depois da [Rodada 1](#rodada-1-volta-do-review-d1): **aprovado**, todos os critérios ✅ ou 🔒. A
H1 funciona na `apps/app` e no header da `apps/web`, a A2 funciona nos 3 idiomas, e o D-dev1 foi confirmado
no navegador e agora tem teste que falha sem ele. Na passada inicial, o critério 3 reprovou: a landing
falhava a hidratação em `/en`, `/es` e `/pt-br` por um `<a>` dentro de outro `<a>` no header (D1). O
`/review` corrigiu o header, e a Rodada 1 mediu a landing limpa em dev e em produção. A Rodada 1 também
encontrou o D2, um `<button>` dentro de outro `<button>` no formulário de contato. Ele existia antes, fica
fora do diff e das URLs do critério 3, e vai para o backlog.

## Cobertura automatizada

| Comando | Resultado |
|---------|-----------|
| `pnpm turbo run test typecheck --filter=api --filter=app --filter=web --filter=@repo/internationalization --filter=@repo/auth` | 15/15 tarefas, 7 do cache |
| `pnpm --filter app exec vitest run __tests__/authProviderLanguageSwitch.test.tsx` | 2/2 (teste novo) |
| `pnpm turbo run typecheck test --filter=app` (depois do teste novo) | 7/7; app 78 arquivos, 608 testes |
| `pnpm --filter app typecheck` | exit 0 |
| `npx biome check apps/app/__tests__/authProviderLanguageSwitch.test.tsx` | sem erro |
| `pnpm test` (raiz, rodada final) | 11/11 tarefas, 10 do cache, exit 0 |

Contagem por workspace na rodada final do `pnpm test`: api 73 arquivos / 894 testes · app 78 / 608 · web
8 / 41 · `@repo/internationalization` 6 / 59 (inclui `parity.test.ts` e `localeProvider.test.ts`) ·
`@repo/auth` 8 / 101 · `@repo/email` 7 / 137 · `@repo/analytics` 2 / 34 · `@repo/security` 3 / 31 ·
`@repo/payments` 4 / 22 · `@repo/shared` 4 / 44 · e2e (Vitest) 2 / 16. Nenhuma falha. Rodei com cache e sem
`--force`; não tive motivo para desconfiar do cache. `pnpm check` completo não foi remedido: só acrescentei
um arquivo de teste, e ele passa no Biome isolado. Vale o número do `/review` (753 arquivos).

### Teste criado

`apps/app/__tests__/authProviderLanguageSwitch.test.tsx`, faixa barata (jsdom, cerca de 20 ms):

1. "mostra o toast de login no idioma novo mesmo sem outra atualização de estado entre a troca e o login":
   monta `LocaleProvider > QueryClientProvider > AuthProvider` com a subárvore estável, troca o
   `useParams` de `en` para `es` e re-renderiza só o provider, depois chama `signIn.mutateAsync`. Espera o
   toast `Inicio de sesión exitoso!` e o redirect para `/es`.
2. "usa o idioma novo no aviso de sessão expirada e no redirect para o login": mesma troca, depois a
   renovação responde 401 `AUTH_SESSION_EXPIRED`. Espera o aviso em espanhol e
   `/es/sign-in?redirect=%2Fes%2Fentities`.

Conferi que o teste 1 mede o D-dev1: troquei temporariamente `useDictionary()` por `getDictionary()` em
`packages/auth/provider.tsx`, e ele falhou com `Received: "Login successful!"`. Restaurei o arquivo e
confirmei com `cmp` que ficou idêntico ao anterior. O teste 2 passa nos dois casos, porque o evento do
token já provoca um re-render do provider antes do aviso; ele fica como cobertura do comportamento, não
como guarda do D-dev1.

## Decisões de custo de teste

| Módulo tocado | Decisão |
|---------------|---------|
| `packages/internationalization/client.ts` | Nenhum teste novo. `localeProvider.test.ts` (12 casos, `renderToString`/`renderToReadableStream` em `node`) já cobre SSR por segmento, isolamento entre requisições e o ramo do navegador. |
| `packages/auth/provider.tsx` (D-dev1) | Teste novo na faixa barata, em `apps/app` porque é o workspace com jsdom e `@testing-library/react`; o pacote de i18n roda em `node` e ganhar jsdom seria dependência nova. |
| `apps/api/app/(routes)/users/[id]/route.ts` | Nenhum teste novo. `usersAdminDeleteBilling.test.ts` (12 casos, repositório, Stripe e guard mockados) cobre os status vivos e terminais, Stripe desligada, falha da Stripe, `resource_missing` e 404. O guard é coberto por `adminGuard.test.ts`. Nada aqui depende de infra real, então a faixa cara não se justifica. |
| `apps/app/app/layout.tsx`, `apps/web/app/[locale]/layout.tsx` | Sem teste unitário; o objeto é a hidratação no navegador, medida no e2e abaixo. |
| Traduções | `parity.test.ts` cobre a paridade; o texto foi lido no diálogo e nos toasts. |

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|------|----------|
| 1 | Sem "Hydration failed"/"did not match" na `apps/app` | **Confirmado.** Em produção (`next build && next start`), zero erros de página e zero #418 em `/en`, `/es`, `/pt-br`, `/en/entities`, `/es/entities`, `/en/account`, `/en/admin`, `/es/admin`, `/en/admin/users`, `/es/admin/users` e `/pt-br/admin`. Em dev, `/en/sign-in` sem e com `x-locale=pt-br`, `/es/admin`, `/en/admin/users`, `/en/entities` e `/en/account` também limpos. Uma única vez, no primeiro acesso a `/en` em dev, logo depois do login e com o Fast Refresh recompilando, apareceu divergência de `id` do Radix (`radix-_R_1qj5r...` contra `radix-_R_7ad5r...`). Não voltou em 7 recargas em dev nem no build de produção; tratei como artefato do `next dev` compilando a rota. Na web o item é **derrubado**: ver o critério 3. O `curl` com a sessão confirma o SSR no idioma da URL (tabela em [Evidências](#evidências-e2e)). |
| 2 | Troca de idioma sem recarregar | **Confirmado.** `/en/entities` → `/es/entities` e `/en/admin/users` → `/es/admin/users` pelo `LanguageSwitcher`: um marcador gravado em `window` sobreviveu (navegação suave), `document.documentElement.lang` passou a `es`, e sidebar ("Plataforma", "Entidades", "Configuración"), breadcrumb ("Inicio"), cabeçalhos ("Foto", "Nombre", "Tipo", "Creado", "Activo", "Acciones") e células ("Franquicia", "Nunca accedió", "25 sept 2026, 15:07") saíram em espanhol, sem aviso de hidratação. Validação do formulário depois da troca: "Indica el nombre."; criar entidade: toast "Entidad creada correctamente.". |
| 3 | D-dev1, toast do `AuthProvider` depois da troca | **Confirmado**, em dev e em produção. `/en/sign-in` → `/es/sign-in` com `router.push` (marcador em `window` preservado), login: toast "Inicio de sesión exitoso!" e redirect para `/es` (comum) ou `/es/admin` (admin). Agora com teste automatizado que falha sem o D-dev1. |
| 4 | Datas no SSR | **Confirmado.** HTML do servidor de `/en/admin/users` traz `Sep 25, 2026, 6:07 PM`; `/es`, `25 sept 2026, 18:07`; `/pt-br`, `25 de set. de 2026, 18:07`. No navegador (com cookie `x-timezone`) a célula sai `Sep 25, 2026, 3:07 PM`, sem mismatch. A diferença de hora entre o `curl` e o navegador é o fuso: o `curl` não mandou `x-timezone`. |
| 5 | "Context can only be read while React is rendering" no terminal | **Confirmado ausente.** Zero ocorrências nos logs do `next dev` da app (151 linhas, depois de carregar `/en/admin/users`, `/en/entities` e o resto da passada) e da web, e nos logs do `next start` dos dois. |
| 6 | Diálogo de arquivamento com a frase nova | **Confirmado** nos 3 idiomas, lido do diálogo aberto (texto exato em [Evidências](#evidências-e2e)). |
| 7 | Arquivar usuário sem assinatura | **Confirmado.** `DELETE /users/Os6cCO85ffLFhZcDxrEZ 204` (em `es`) e `DELETE /users/SB3MFcdzJadosH5pfeTY 204` (em `pt-br`, toast "Usuário arquivado com sucesso."). Os dois saíram da listagem e ganharam `deletedAt` com timestamp no Firestore do emulador. |
| 8 | Assinatura viva com a Stripe desligada | **Confirmado** nos 3 idiomas. `DELETE /users/1B1DJSpltWmBRsL9E5cc 503` três vezes; log `[payments] admin-user-delete-billing-failed requestId=... reason=billing-not-configured`; o usuário continuou na listagem; no Firestore, `deletedAt` seguiu `null` e `subscription.status` seguiu `active`. Toasts exatos em [Evidências](#evidências-e2e). |
| 9 | Cancelamento real numa conta Stripe | 🔒 **Não verificável** sem conta no provedor. |

## Critérios de aceite

| # | Critério | Status | Meio |
|---|----------|--------|------|
| 1 | SSR em `/en` e `/es` no idioma da URL em todo componente client | ✅ | `curl` do SSR com sessão (app) e anônimo (web), com e sem `x-locale=pt-br` |
| 2 | Sem erro de hidratação por idioma na `apps/app` | ✅ | e2e em dev e em build de produção, console e `errors` do navegador; logs do servidor |
| 3 | Sem erro de hidratação na `apps/web` em `/en` e `/es` | ✅ (Rodada 1) | Passada inicial ❌ (D1). Rodada 1: e2e em `next dev` e em `next build && next start`, visitante e logado, `/pt-br`, `/en` e `/es` sem "cannot be a descendant of", sem "Hydration failed" e sem #418; varredura do HTML do SSR com zero `<a>`/`<button>` aninhados no header; `headerInteractiveNesting.test.tsx` |
| 4 | Troca de idioma por navegação suave atualiza client e callbacks | ✅ | e2e (switcher, toasts de página e do `AuthProvider`) + teste novo |
| 5 | pt-br sem regressão | ✅ | e2e e `curl` em `/pt-br/admin`, `/pt-br/admin/users`, `/pt-br/entities`; `parity.test.ts` |
| 6 | Arquivar sem assinatura: 204 | ✅ | e2e (status no log da API, toast, listagem, Firestore) + rota mockada. Duplo clique no "Sim" **não coberto**: não medi |
| 7 | Assinatura viva cancela antes do soft delete | ✅ | rota mockada (`usersAdminDeleteBilling.test.ts`, incluindo ordem e os 4 status vivos além de `active`). Chamada real à Stripe 🔒, ver critério 15 |
| 8 | Stripe desligada: 503 e usuário continua ativo | ✅ | e2e nos 3 idiomas (toast, status, log, Firestore) + rota mockada |
| 9 | Falha da Stripe: mesmo resultado | ✅ | rota mockada ("logging only the error name") |
| 10 | `resource_missing` arquiva | ✅ | rota mockada |
| 11 | Diálogo avisa do cancelamento nos 3 idiomas | ✅ | e2e, texto lido do diálogo |
| 12 | Só admin arquiva | ✅ | `adminGuard.test.ts` + leitura da rota (`requireAdminApi<RouteIdParamsContext>` inalterado). Não chamei o `DELETE` como usuário comum nesta passada |
| 13 | Light, dark e mobile sem mudança visual | ✅ | e2e: `/en/admin` light e dark 1280 px; `/en/admin/users` dark e light 375 px; web `/en` dark 375 px e light 1280 px |
| 14 | Gates do CI | ✅ | `pnpm test` raiz e typecheck medidos aqui; `pnpm check` do `/review` |
| 15 | Cancelamento real na Stripe | 🔒 | exige conta Stripe de teste |

## Defeitos

### D1. A landing falha a hidratação em todos os idiomas (critério 3)

- **Onde**: `apps/web/app/[locale]/components/header/index.tsx:82-88`. `NavigationMenuLink` renderiza um
  `<a data-slot="navigation-menu-link">`, e dentro dele vêm `<Button>` (um `<button>`) e `<Link>` (outro
  `<a>`). O parser HTML do navegador fecha o primeiro `<a>` ao encontrar o segundo, então o DOM que o React
  encontra não bate com o que ele renderizou.
- **Repro**: `pnpm --filter web dev`, abrir `http://localhost:3001/pt-br` (ou `/en`, `/es`) com o console
  aberto. Em dev: `In HTML, <a> cannot be a descendant of <a>. This will cause a hydration error.` e
  `Error: Hydration failed because the server rendered HTML didn't match the client`, com a pilha em
  `NavigationMenuItem > NavigationMenuLink`. Em produção (`next build && next start -p 3001`):
  `Minified React error #418; ...args[]=HTML`, um por carga, nos 3 idiomas. O `curl` de `/pt-br` mostra o
  trecho `<a ... data-slot="navigation-menu-link" ...><button ...>` com o `<a href>` do `Link` dentro.
- **Não é regressão**: o header não mudou neste diff (último commit dele em 2026-09-01) e o erro acontece
  igual em `/pt-br`, que não depende do `LocaleProvider`. O `/develop` mediu a web por `curl`, que não
  hidrata, então ninguém tinha visto.
- **Correção sugerida (hipótese, não medida)**: usar `NavigationMenuLink asChild` com o `Link` como filho
  único e mover o estilo do `Button` para o `Link` (por exemplo `buttonVariants({ variant: "ghost" })`), em
  vez de aninhar `a > button > a`. O mesmo padrão `Button > Link` aparece de novo por volta da linha 116
  do mesmo arquivo; vale conferir.
- **Decisão para o orquestrador**: corrigir nesta entrega (o plano prometia a web hidratando sem erro) ou
  aceitar o critério como reprovado por causa externa e registrar o defeito no `specs/BACKLOG.md`. Ele
  ainda não está lá.
- **Estado**: corrigido pelo `/review` na rodada 1 e confirmado aqui. Ver [Rodada 1](#rodada-1-volta-do-review-d1).

### D2. O formulário de contato falha a hidratação (fora do diff)

- **Onde**: `apps/web/app/[locale]/contact/components/contact-form-client.tsx:79-80`. `PopoverTrigger`
  renderiza um `<button data-slot="popover-trigger">`, e o `Button` do seletor de data vem dentro dele como
  outro `<button>`. O parser fecha o primeiro botão ao encontrar o segundo, do mesmo jeito que acontecia com
  o `<a>` do D1.
- **Repro**: `next build && next start -p 3001` na web, abrir `/en/contact` ou `/es/contact` com o console
  aberto: um `Minified React error #418; ...args[]=HTML` por carga. A landing (`/pt-br`, `/en`, `/es`) na
  mesma sessão não gera o erro. O HTML do SSR de `/en/contact` tem
  `<button type="button" aria-haspopup="dialog" ... data-slot="popover-trigger"><button class="inline-flex ...`.
- **Não é regressão**: o formulário não mudou neste diff (último commit dele em 2026-09-09), e a página de
  contato não está nas URLs do critério 3.
- **Correção sugerida (hipótese, não medida)**: `PopoverTrigger asChild` com o `Button` como filho, se o
  `Button` do design system repassar a `ref` e as props; se não repassar (o `/review` observou que ele não
  tem `asChild` e envolve os filhos num `<div>`), aplicar `buttonVariants` direto no `PopoverTrigger`.
- **Recomendação**: registrar no `specs/BACKLOG.md` junto dos outros `Button > Link` da web
  (`BACKLOG.md:450`), sem bloquear esta entrega.

Nenhum defeito encontrado no código do diff.

## Evidências e2e

### SSR por `curl` (sessão de admin e de usuário comum do seed)

| URL | `x-locale` | Textos no HTML do servidor | `<html lang>` |
|-----|-----------|----------------------------|---------------|
| `/en/admin` | ausente e `pt-br` | "Platform", "Users", "Audit trail", "Home", "Hello", "Activity", "Active", "Inactive" | `pt-br` |
| `/es/admin` | ausente e `pt-br` | "Plataforma", "Usuarios", "Auditoría", "Inicio", "Hola", "Actividad", "Activos" | `pt-br` |
| `/pt-br/admin` | ausente e `pt-br` | "Plataforma", "Usuários", "Início", "Olá", "Atividade", "Ativos" | `pt-br` |
| `/en/admin/users` | ausente | cabeçalhos "Name", "Email", "Last access"; células "User", "Never accessed", "Sep 25, 2026, 6:07 PM" | |
| `/es/admin/users` | ausente | "Nombre", "Correo", "Último acceso"; "Usuario", "Nunca accedió", "25 sept 2026, 18:07" | |
| `/en/entities` | ausente e `pt-br` | "Entities", "New", "Refresh", "Created", "Franchise", "Customer", "Sep 25, 2026, 3:03 PM" | `pt-br` |
| `/es/entities` | ausente e `pt-br` | "Entidades", "Nuevo", "Actualizar", "Franquicia", "Cliente", "25 sept 2026, 15:03" | `pt-br` |
| `/en/account` | ausente e `pt-br` | "My account", "Profile", "Security", "Billing", "Display name", "Save" | `pt-br` |
| web `/en` | ausente | header "Contact" 1×, "Contato" 0× | `pt-br` |
| web `/es` | ausente | header "Contacto" 1× | `pt-br` |
| web `/pt-br` | ausente | header "Contato" 1× | `pt-br` |

O formulário de `/[locale]/sign-in` não vem no SSR (a página renderiza "Loading" e monta o form no
cliente), então o `curl` não serve de prova ali; no navegador o título saiu "Sign In" em `/en` com
`x-locale=pt-br` e sem aviso de hidratação. O proxy regrava o cookie para o idioma da URL
(`x-locale=en` depois da carga), então o cenário de cookie divergente só existe na primeira requisição.

### Diálogo e toasts do arquivamento (texto exato)

- Diálogo, pt-br: "Arquivar usuário O usuário sai da listagem e perde o acesso, mas o cadastro é preservado
  e o e-mail continua ocupado. Se houver assinatura ativa, ela é cancelada na hora. Não Sim"
- Diálogo, en: "Archive user The user leaves the listing and loses access, but the record is kept and the
  email stays taken. If there is an active subscription, it is canceled right away. No Yes"
- Diálogo, es: "Archivar usuario El usuario sale del listado y pierde el acceso, pero el registro se
  conserva y el correo sigue ocupado. Si hay una suscripción activa, se cancela de inmediato. No Sí"
- Toast 503, pt-br: "Não foi possível cancelar a assinatura deste usuário, então ele não foi arquivado.
  Tente de novo em instantes. (Código do erro: <requestId>)"
- Toast 503, en: "We couldn't cancel this user's subscription, so they were not archived. Try again in a
  moment. (Error code: <requestId>)"
- Toast 503, es: "No pudimos cancelar la suscripción de este usuario, así que no se archivó. Inténtalo de
  nuevo en unos instantes. (Código del error: <requestId>)"
- Toast 204, pt-br: "Usuário arquivado com sucesso."

O `<requestId>` do toast bate com o `requestId` do log da API na mesma tentativa.

### Tema e tela

- `/en/admin` dark 1280 px: `html.dark` ativo, fundo do `body` `lab(2.75 0 0)`, título "Hello" em
  `lab(98.26 0 0)`; cartões, atividade e gráfico legíveis.
- `/en/admin/users` dark 375 px: a tabela antd tem fundo transparente sobre o painel escuro e texto de
  célula `lab(98.26 0 0)`; `scrollWidth` da página 375, a tabela rola dentro do contêiner. Light 375 px
  sem quebra.
- Web `/en` dark 375 px: `scrollWidth` 360, sem rolagem horizontal.

Screenshots de apoio em `test/e2e/` (descartados pelo `.gitignore`): `01-en-sign-in-cookie-ptbr.png`,
`02-es-admin-users-apos-troca.png`, `03-es-dialogo-arquivar.png`, `04-es-arquivar-com-assinatura-503.png`,
`05-en-admin-light-desktop.png`, `06-en-admin-dark-desktop.png`, `07-en-admin-users-dark-mobile.png`,
`08-en-admin-users-light-mobile.png`, `09-web-en-dark-mobile.png`, `10-web-en-light-desktop.png`. Só
aparecem contas do seed e de QA em `@example.com`.

### O4 observado, sem reprovar

Fora do escopo pela D10 do plano. Na web, primeira visita a `/en` sem cookie (ou com `x-locale=pt-br`): os
Server Components saem em pt-br ("Início", "Cadastrar", "Entrar" no hero) e os componentes client em
inglês ("Contact" no header, "Companies that trust us"), com `<html lang="pt-br">`. Com `x-locale=en`, a
página sai toda em inglês e `lang="en"`. Na `apps/app` o conteúdo medido saiu todo no idioma da URL, e só o
`<html lang>` ficou `pt-br` na primeira requisição. A tarefa de fazer o `getDictionary()` do servidor ler o
locale da URL (pergunta 3 da seção 14 do plano) segue como recomendação.

Também visto, já registrado no `specs/BACKLOG.md:506`: os `aria-label` "Switch language", "Toggle theme"
e "Toggle Sidebar" saem em inglês nos 3 idiomas.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001). Não reutilizei nada
do usuário. Subi, com o ambiente que o `apps/e2e/support/stackEnv.ts` gera a partir dos `.env.example`
(emulador forçado, project id `demo-next-boilerplate`, `STRIPE_SECRET_KEY` vazia):

- `pnpm emulators` com `JAVA_HOME` no `openjdk@21`, seguido de `pnpm seed`;
- `next dev` da api (3002), da app (3000) e da web (3001);
- depois, para confirmar em produção, derrubei os `next dev` da app e da web e subi `next build` +
  `next start` das duas nas mesmas portas.

No fim, matei cada processo pelo PID que guardei (os `pnpm` e os `next-server` filhos) e mandei SIGINT ao
`firebase-tools`. Conferi com `lsof -ti tcp:<porta> -sTCP:LISTEN` que 3000, 3001, 3002, 3003, 9099, 8080,
4001, 4400, 4500 e 9150 ficaram vazias, e fechei a sessão `qa-i18n` do `agent-browser`. Apaguei os arquivos
temporários com o cookie de sessão.

## Dados de QA

Tudo no emulador, que descartou o estado ao desligar. Nada foi criado em projeto Firebase real, então o
`docs/PRE-PRODUCTION.md` não ganhou conta nova.

| Conta ou dado | Estado final |
|---------------|--------------|
| `admin@example.com`, `user@example.com` (seed) | usadas para entrar; senha do seed documentada em `docs/SETUP.md` |
| `qa-i18n-a2-nosub@example.com` | criada sem assinatura, arquivada (204) |
| `qa-i18n-a2-nosub2@example.com` | criada sem assinatura, arquivada (204) |
| `qa-i18n-a2-sub@example.com` | criada com `subscription.status = "active"` e `subscriptionId` fictício, recusada 3 vezes (503) |
| `qa-i18n-skip@example.com` | criada por engano, com a mesma assinatura fictícia; não foi usada |
| entidade "QA i18n entidad" | criada para `user@example.com` pelo formulário em `es` |

## Lacunas

| Lacuna | Veredito |
|--------|----------|
| Re-render do `AuthProvider` na troca de idioma sem teste automatizado (handoff e review) | **Fechada aqui.** Teste novo que falha sem o D-dev1, além da medição no navegador em dev e em produção. |
| Cancelamento passa e soft delete falha (Firestore fora), sem teste (handoff e review) | **Continua aberta.** Exigiria derrubar o Firestore no meio da requisição; o `/review` descreveu por leitura o estado resultante como recuperável. |
| Cancelamento real numa conta Stripe | **Continua aberta**, 🔒 por falta de conta no provedor. |
| Duplo clique no "Sim" do arquivamento | **Continua aberta.** Não medi nesta passada. |
| `DELETE /users/[id]` chamado por usuário comum no ambiente real | **Fora de escopo.** O guard não mudou e tem teste próprio. |

## Estado de dev alterado

- `apps/app/.next` e `apps/web/.next` foram reconstruídos com o ambiente do emulador. Um `next start` sem
  novo build vai apontar para o emulador e não para o `.env` local.
- Nenhum arquivo versionado mudou além do teste novo em `apps/app/__tests__/` e dos artefatos em
  `docs/features/i18n-hydration-admin-delete-billing/test/`. A troca temporária em
  `packages/auth/provider.tsx`, feita para provar que o teste mede o D-dev1, foi revertida e conferida com
  `cmp`.

## Rodada 1: volta do `/review` (D1)

O `/review` corrigiu o D1 em `apps/web/app/[locale]/components/header/index.tsx`: a navegação desktop usa
`NavigationMenuLink asChild` com `buttonVariants({ variant: "ghost" })`, e o contato do menu Produto, o
link do painel, entrar e cadastrar viraram um único `<a>` cada, com as classes de `buttonVariants`. Teste
novo: `apps/web/__tests__/headerInteractiveNesting.test.tsx`. Esta rodada remediu só o que a correção toca;
a `apps/app` não mudou e não foi percorrida de novo.

### Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter web test` | 9 arquivos, 44 testes, exit 0 (inclui `headerInteractiveNesting.test.tsx`, 3 casos) |
| `pnpm test` (raiz, com cache) | 11/11 tarefas, 10 do cache, exit 0; web 9 / 44, app 78 / 608, api 73 / 894, i18n 59, auth 101 |
| `next build` da web (ambiente do emulador, `NEXT_PUBLIC_APP_URL=http://localhost:3000`) | exit 0 |

### Verificar no `/test` (rodada 1)

| # | Item | Veredito |
|---|------|----------|
| 1 | Critério 3: `/pt-br`, `/en`, `/es` sem erro de hidratação | **Confirmado.** Em `next dev`, visitante e logado, zero "cannot be a descendant of", zero "cannot contain a nested", zero "Hydration failed" e zero erros de página. Em `next build && next start -p 3001`, logado e visitante, zero `#418` e zero erros de página nas três URLs. No HTML do SSR, uma varredura com pilha de tags achou zero `<a>`/`<button>` aninhados no header nos 3 idiomas. No DOM, `header a a, a button, button a, button button` devolve 0, e cada link aparece uma vez (no `HEAD` o parser partia cada item e o `Home` aparecia duas vezes). |
| 2 | Visual do header em light, dark e mobile | **Aceitável, sem regressão.** Detalhe abaixo. |
| 3 | Teclado | **Confirmado.** De `/en`, oito Tabs param em: Home (`a`), Product (`button`), Contact (`a`), seletor de idioma, tema, Sign In (`a`), Sign Up (`a`) e o formulário do hero. Uma parada por item, cada uma com o anel de foco (`box-shadow`). Com o foco em Home, seta para a direita vai para Product e depois Contact, e seta para a esquerda volta a Product. Enter em Contact navega para `/en/contact` sem recarregar a página. |
| 4 | Menu Produto → Contato | **Confirmado** nos 3 idiomas. O menu aberto mostra "Contact"/"Contato"/"Contacto" (32 px de altura, `size="sm"`) e "Pricing"/"Preços"/"Precios", sem aninhamento. Clique real em "Contact" dentro do menu leva a `/en/contact`; em pt-br e es o destino é `/pt-br/contact` e `/es/contact`. |
| 5 | Anotação `a11y-stale-exception` para `web:/pt-br/sign-up` | **Não verificado.** Não rodei `pnpm e2e`. |

### Visual do header

A altura do item de navegação caiu de 52 px para 36 px, e medi os dois lados. Para ver o antes, troquei
por alguns segundos o header pelo do `HEAD` com o `next dev` no ar, medi e restaurei a correção
(`cmp` confirmou o arquivo idêntico). No `HEAD`, o `<li>` tinha 52 px e o texto de "Home" começava em
x = 32. Agora o `<li>` tem 36 px, "Home" começa em x = 24, e cada item ocupa 16 px a menos na horizontal,
que era o `p-2` do link externo. O header continua com 81 px de altura, e o texto dos itens fica na mesma
linha de base que antes (y = 40 nos dois prints). Considero aceitável: o que sumiu foi um preenchimento
invisível em volta do botão, a área clicável de 36 px segue o `h-9` dos outros botões do design system, e
os itens da navegação agora têm a mesma altura de entrar, cadastrar e do seletor de tema, ao lado.

Medidas da correção, a 1280 px:

- Light, visitante: Home 71×36, Product 100×36, Contact 85×36; Sign In 79×36 com borda de 1 px e fundo
  `lab(100)`; Sign Up 83×36 com fundo `lab(7.78)` e texto `lab(98.26)`. Hover em Home muda o fundo de
  transparente para `lab(96.52)` (`accent`); hover em Sign In também vai para `lab(96.52)`; hover em
  Sign Up vai para o primário a 90%.
- Dark, visitante: texto dos itens em `lab(98.26)`; Sign In com fundo translúcido `oklab(0.269 / 0.3)` e
  borda escura; Sign Up invertido, com fundo `lab(98.26)` e texto `lab(7.78)`. É o mesmo par do CTA do hero
  logo abaixo.
- Logado (subscription, com `NEXT_PUBLIC_APP_URL`): "Go to panel" 108×36 com o estilo primário, href
  `http://localhost:3000/en`, hover no primário a 90%; ao lado, "Sign Out" (o `Button`, que não mudou).
- Mobile 375 px, dark e light: entrar oculto (`display: none`), cadastrar visível (83×36); logado, o link
  do painel também fica oculto; `scrollWidth` de 360 px, sem rolagem horizontal.

Observado, e já existia antes da correção: logado a 1280 px, "Sign Out" termina em x = 1270 com a área
útil em 1265 px, e a página ganha 5 px de rolagem horizontal (a 1024 px, 29 px; a 1440 px, nenhuma). O header
do `HEAD` mede exatamente o mesmo (`scrollWidth` 1270 a 1280 px e 1038 a 1024 px). Não é da correção.
Fica como achado para o backlog, junto do D2.

Durante a troca temporária, o `next dev` registrou um erro de compilação ("Export Header doesn't exist")
enquanto o arquivo era regravado. Ele pertence à troca e não ao código. Para a medição limpa, fechei a
sessão do navegador e abri outra.

### Critério 3

Passa de ❌ para ✅. O D2 (formulário de contato) não entra nele: a página de contato não está nas URLs do
critério, e o defeito é anterior ao diff.

### Ambiente

As portas 3000, 3001, 3002, 9099, 8080 e 4001 estavam livres no início. Subi `pnpm emulators`
(`JAVA_HOME` no `openjdk@21`) e `pnpm seed`, a api em `next dev` na 3002 e a web em `next dev` na 3001. Reiniciei
a web com `NEXT_PUBLIC_APP_URL=http://localhost:3000` para o link do painel aparecer, e depois troquei por
`next build && next start -p 3001`. A `apps/app` não subiu. No fim, matei cada processo pelo PID guardado,
mandei SIGINT ao `firebase-tools` e fechei a sessão do `agent-browser`. Conferi com `lsof` que 3000, 3001,
3002, 3003, 9099, 8080, 4001, 4400, 4500 e 9150 ficaram vazias. Apaguei o arquivo temporário com o estado da
sessão do navegador.

### Dados de QA

Só no emulador, que descartou o estado ao desligar: login com `user@example.com`, do seed, pelo
`/en/sign-in` da web. Nenhuma conta criada.

### Estado de dev alterado

`apps/web/.next` foi reconstruído com o ambiente do emulador e `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
O header ficou idêntico à correção do `/review` depois da troca temporária (`cmp`). Screenshots de apoio,
descartados pelo `.gitignore`: `test/e2e/r1-01` a `r1-10`.

### Lacunas

| Lacuna | Veredito |
|--------|----------|
| D1, hidratação da landing | **Fechada** nesta rodada. |
| Anotação `a11y-stale-exception` de `web:/pt-br/sign-up` | **Continua aberta.** Exige `pnpm e2e`. |
| D2, hidratação do formulário de contato | **Fora de escopo.** Vai para o backlog. |
| Rolagem horizontal de 5 a 29 px no header logado entre 1024 e 1280 px | **Fora de escopo.** Já existia; vai para o backlog. |
