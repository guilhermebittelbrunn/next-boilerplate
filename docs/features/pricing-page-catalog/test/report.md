# Relatório de QA: página de preços a partir do catálogo da Stripe

Rodada autônoma do `/cycle`, 2026-10-16. Nenhuma pergunta ao usuário. Nada foi commitado nem preparado no
índice; a branch continua `guilhermebittelbrunn/spec-discussion` (não é protegida; o nome final é decisão
do `/review`). Os critérios estão em `test/criterios-aceite.md`.

## Placar

| Resultado | Quantos | Itens |
|---|---|---|
| ✅ verificado e correto | 21 | do 1 ao 21 da tabela "Critérios de aceite" |
| ❌ falha | 0 | nenhum |
| 🔒 não verificado (exige conta Stripe real) | 3 | catálogo real, chamadas reais à Stripe, checkout real |

Nenhum defeito de produção nesta entrega. O open redirect que o `/review` corrigiu era real em `main` e
está fechado (medição abaixo). A observação 1 da primeira passada (cards colados na borda da `/pricing`)
foi corrigida pelo `/review` e medida na seção "Rodada 2"; o placar não mudou. As outras duas observações
continuam no fim, sem reprovar.

## Cobertura automatizada

| Comando | Resultado |
|---|---|
| `pnpm test` (raiz, com `JAVA_HOME` do JDK 21; inclui `test:emulator`) | 15/15 tasks, código 0. Rodado duas vezes; a segunda, depois do último teste novo, com 13 tasks do cache |
| ↳ `app` | 107 arquivos, 861 testes (eram 106/849 no `/develop`; +12 desta etapa) |
| ↳ `api` | 97 arquivos, 1236 testes |
| ↳ `api` `test:emulator` | 4 arquivos, 186 testes (nunca vem do cache) |
| ↳ `web` | 20 arquivos, 131 testes |
| ↳ `@repo/auth` | 10 arquivos, 127 testes (cache miss: roda depois da correção do guard) |
| ↳ `@repo/sdk` | 2 arquivos, 10 testes |
| ↳ `@repo/shared` | 5 arquivos, 56 testes |
| ↳ `@repo/internationalization` (paridade pt-br/en/es + `apiErrors`) | 7 arquivos, 67 testes |
| ↳ demais (`design-system` 171, `email` 202, `security` 45, `analytics` 34, `next-config` 32, `payments` 22, `e2e` 16) | todos passando |
| `pnpm check` | 902 arquivos, nenhuma correção (901 do `/review` + o arquivo de teste novo) |
| `pnpm turbo run typecheck --filter=app --filter=@repo/auth` | 2/2 (`@repo/auth` do cache); `typecheck` da `app` repetido no fim, 1/1 |
| `pnpm --filter web build` com a API desligada | código 0; `/[locale]/pricing` sai como `ƒ` (dinâmica), nenhuma linha `catalog-unavailable` no build |
| `env -u STRIPE_SECRET_KEY -u STRIPE_WEBHOOK_SECRET pnpm --filter api build` | código 0; `/payments/catalog` sai como `ƒ` |
| `pnpm --filter app build` (ambiente do emulador) | código 0; usado só para medir o redirect em `next start` |

Sem `--force`: o cache não deu motivo de suspeita. O número 29/29 do `/develop` não cobria a correção em
`packages/auth`; o `pnpm test` acima cobre (`@repo/auth` e `app` rodaram sem cache).

### Testes criados ou alterados nesta etapa

| Arquivo | O que prova | Mutação |
|---|---|---|
| `apps/app/__tests__/postAuthRedirectTarget.test.ts` (+4 casos) | Oito alvos com `..` que saem do locale para outro host (`\`, `%2e%2e`, `%5c`, `..\\`, tab, codificação dupla e um `x/../../`) caem no fallback; `..` que sai de todos os locales também; `..` que fica dentro de um locale é aceito e devolvido sem mudança; o destino com query passa inteiro | Com o `redirect.ts` de `HEAD` no lugar, os dois primeiros casos falham; os outros dois passam nas duas versões e ficam como guarda de regressão |
| `apps/app/__tests__/proxy.test.ts` (+1 caso, +1 asserção) | Cinco variantes de `redirect` com `..` respondem com `Location` relativo igual a `/pt-br`, que nunca começa com `//`. O caso da barra invertida ganhou a asserção sobre o `Location` relativo, que é o que o navegador recebe depois que o Next tira a origem | Com o `redirect.ts` de `HEAD`, o caso novo falha. O da barra invertida passa nas duas versões, porque `/pt-br/\evil` resolve para `/pt-br//evil.example.com`, que fica no host |
| `apps/app/__tests__/authPagesRedirect.test.tsx` (novo, 6 testes) | As páginas `sign-in` e `sign-up` (Server Components) repassam o `redirect` da URL ao formulário, mandam `null` sem o parâmetro e `null` quando ele vem repetido | não feita |
| `apps/app/__tests__/accountBillingPanel.test.tsx` (+1 caso) | Personificando, o selo aparece no card do `?plan=` e todos os "Assinar" ficam desligados | não feita |

A troca do `redirect.ts` para a versão de `HEAD` foi feita copiando o arquivo de `git show HEAD:` para
`/tmp`, e o original voltou na mesma linha de comando; `cmp` confirmou o arquivo idêntico ao de antes
(`shasum` `2b97270…` antes e depois). Nenhum `git stash`.

### Decisões de custo de teste

Todos os testes desta etapa são da faixa barata (unidade, rota ou componente com mock). Nenhum exige
emulador: a feature não toca Firestore, rules nem índice.

| Rota ou módulo tocado | Decisão |
|---|---|
| `GET /payments/catalog` e o cache | os testes do `/develop` já cobriam (`paymentsCatalogRoute.test.ts`: contrato, chaves exatas, `enabled: false` em quatro situações, 503 com log; `planCatalogCache.test.ts`: validade, uma hora, chamadas simultâneas, falha fora do cache). Nada novo |
| `apps/api/proxy.ts` (rota fora do rate limit) | `proxyArcjetKey.test.ts` já cobria. Nada novo |
| `packages/auth/redirect.ts` | acrescentei os casos de `..` (não havia nenhum) |
| `apps/app/proxy.ts` | acrescentei o caso que confere o `Location` relativo |
| `sign-in/page.tsx`, `sign-up/page.tsx` | teste novo da página, porque nenhum renderizava as duas |
| `AccountBillingPanel` | +1 caso para a combinação personificação + destaque, que não tinha teste |
| `packages/sdk`, `apps/web/shared/lib/*`, `/pricing`, formatador em `@repo/shared`, i18n | os testes do `/develop` cobrem (prazo de 5 s no SDK, modo `simple`, URL vazia, erro com log, CTA nos três ramos, `h1` único, locale da rota, dicionário sem dígito, paridade) |

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|---|---|
| 1 | Open redirect fechado | **confirmado** em `next dev` e em `next start`; a falha era real em `HEAD` (tabela abaixo) |
| 2 | Visitante logado clicando o CTA | **confirmado**: `Location: /pt-br/account?tab=billing&plan=price_1`, página 200. Em `HEAD` a resposta era `/pt-br/account%3Ftab=billing&plan=price_1`, que responde 404 |
| 3 | Fluxo do visitante novo, trocando o idioma | **confirmado**, com o catálogo da aba vindo de um stub (ver "Ambiente"). O selo "Selected plan" apareceu só no Pro |
| 4 | "Entrar" a partir do cadastro e deep link anônimo | **confirmado** |
| 5 | 503 da Stripe | **confirmado**: 503 `PAYMENTS_PROVIDER_UNAVAILABLE`, estado vazio, linha `status=503 reason=ERR_BAD_RESPONSE` |
| 6 | Modo `simple` | **confirmado**: estado vazio nos três idiomas e zero acessos ao stub |
| 7 | Catálogo com planos nos três idiomas | **confirmado, com uma expectativa derrubada**: em `es` o preço sai "29,00 BRL / mes", não "R$ 29,00 / mes". É o que o `Intl` faz com BRL em `es` (CLDR) e o mesmo que a aba da app já mostra; o plano errou a expectativa, o código está correto. Grade, light e dark conferem |
| 8 | Selo e anel do destaque | **confirmado**: anel visível no dark; "Plan elegido" numa linha em 375 px |
| 9 | Build sem Stripe e sem API | **confirmado**: os dois builds saem com código 0 |
| 10 | Duas visitas, uma chamada à Stripe | **🔒 não verificável** sem chave Stripe de teste: o cliente Stripe do `@repo/payments` não aceita host alternativo, então não há como contar chamadas sem conta. Coberto por `planCatalogCache.test.ts` e pelo teste da rota com cliente falso |

### Medição do open redirect

Sessão de `qa-pricing-catalog@example.com` no emulador, `curl -s -o /dev/null -D - -b "access-token=<cookie>"`
em `http://localhost:3000/pt-br/sign-in?redirect=<valor>`. "HEAD" é o guard de `main` com o proxy do diff;
"HEAD completo" é guard e proxy de `main`.

| `redirect` | HEAD (`next dev`) | atual (`next dev`) | atual (`next start`) |
|---|---|---|---|
| `%2Fpt-br%2F..%2F%5Cevil.example.com` | 307 `location: //evil.example.com` | 307 `location: /pt-br` | 307 `location: /pt-br` |
| `%2Fpt-br%2F%252e%252e%2F%255cevil.example.com` | 307 `location: //evil.example.com` | 307 `location: /pt-br` | 307 `location: /pt-br` |
| `%2Fpt-br%2F..%2F%09%2Fevil.example.com` | 307 `location: //evil.example.com` | 307 `location: /pt-br` | 307 `location: /pt-br` |
| `%2Fpt-br%2F%2e%2e%2F%5Cevil.example.com` | 307 `location: //evil.example.com` | 307 `location: /pt-br` | 307 `location: /pt-br` |
| `%2Fpt-br%2F..%5C%5Cevil.example.com` | 307 `location: //evil.example.com` | 307 `location: /pt-br` | 307 `location: /pt-br` |
| `%2Fpt-br%2F%5Cevil.example.com` | 307 `location: /pt-br//evil.example.com` | igual | igual |
| `%2F%2Fevil.example.com` | não medido | 307 `location: /pt-br` | 307 `location: /pt-br` |

Com o "HEAD completo", o primeiro valor deu `location: //evil.example.com`, e o `curl` resolveu o destino
para `http://evil.example.com/`: o navegador sairia do domínio. A linha da barra invertida sem `..` fica no
host nas duas versões (caminho absoluto `/pt-br//…`).

## Critérios de aceite: status por item

| # | Critério | Status | Meio e evidência |
|---|---|---|---|
| 1 | A landing mostra os planos nos três idiomas | ✅ | e2e com stub. pt-br: "Pro QA / Plano de teste do QA / R$ 29,00 / mês / 5 membros / Suporte por e-mail / Escolher plano" e "Business QA / R$ 99,00 / mês / Membros ilimitados" (sem descrição). en: "R$29.00 / month", "R$99.00 / month", "Choose plan". es: "29,00 BRL / mes", "99,00 BRL / mes", "Elegir plan". Card "Enterprise" com "Sob consulta" / "Custom pricing" / "Precio a medida" e link `/<locale>/contact`. Um `h1` ("Preços", "Pricing", "Precios"), `h2` nos três cards. Unit: `pricingPage.test.tsx` |
| 2 | Os preços de exemplo saíram do dicionário | ✅ | e2e: nenhum "R$ 40" ou "$40" na página com e sem catálogo. Unit: subtree `pricing` sem dígito nos três idiomas |
| 3 | Grade responsiva e tema | ✅ | e2e, rodada 1: 375 px, três cards empilhados; 768 px, dois por linha (Enterprise na segunda); 1280 px, três por linha; botões com 36 px de altura (uma linha) nas três larguras; light e dark conferidos. Rodada 2, depois da correção do recuo: o primeiro card começa no mesmo `left` do container do header (16 px em 375, 8 px em 768 e 1280) e termina à mesma distância da borda direita, sem rolagem lateral. Números na seção "Rodada 2" |
| 4 | Sem cobrança ligada, estado vazio | ✅ | e2e com a API real sem chave: `curl` na rota → 200 `{"data":{"enabled":false,"plans":[]}}`. Página: "Planos em breve / Os planos aparecem aqui assim que estiverem disponíveis.", "Plans coming soon / Plans will show up here as soon as they are available.", "Planes próximamente / Los planes aparecerán aquí en cuanto estén disponibles."; zero links de cadastro, nenhum valor com centavos; no `xl` o painel mede 838 px (duas colunas) e o Enterprise fecha a linha |
| 5 | Stripe falhando vira estado vazio | ✅ | e2e com a API real e chave falsa: 503 `{"error":{"code":"PAYMENTS_PROVIDER_UNAVAILABLE"}}`; duas requisições geraram duas linhas `[payments] catalog-failed requestId=<uuid>` (falha fora do cache). `/en/pricing` → 200 com o estado vazio; log da web `[payments] catalog-unavailable status=503 reason=ERR_BAD_RESPONSE` |
| 6 | API fora do ar vira estado vazio | ✅ | e2e com o endereço do catálogo fechado: `/en/pricing` → 200, estado vazio, log `[payments] catalog-unavailable reason=ECONNREFUSED`. Prazo de 5 s: unit (`paymentsCatalog.test.ts`), não medido no browser |
| 7 | Modo `simple` não consulta o catálogo | ✅ | e2e: web com `NEXT_PUBLIC_PRODUCT_MODE=simple` e o stub pronto para devolver planos; seis renderizações (browser e `curl` nos três idiomas) mostraram o estado vazio e o contador do stub ficou em 0. URL da API vazia: unit (`planCatalog.test.ts`) |
| 8 | A rota pública expõe só o catálogo | ✅ | e2e: `curl` sem cookie nem token → 200. `Origin: http://evil.example.com` → 403 (CORS); sem `Origin` → 200. Chaves exatas de `PlanDTO` e `metadata` fora: rota com mock |
| 9 | A rota fica fora do rate limit | ✅ | unit (`proxyArcjetKey.test.ts`): limitador negando, a rota passa sem chamar o Arcjet. Não dá para medir no servidor sem `ARCJET_KEY` na API |
| 10 | Duas visitas, uma chamada à Stripe | ✅ | unit e rota com cliente Stripe falso (duas leituras = 1 chamada; 1 h + 1 ms = 2; simultâneas = 1; falha não guardada). A contagem real é o critério 23 |
| 11 | O botão do plano leva ao cadastro com a escolha | ✅ | e2e: `http://localhost:3000/pt-br/sign-up?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_qa_pro`, um por plano, e o equivalente com `/en/` e `/es/`. Ramos sem URL da app e `simple`: unit (`pricingCta.test.ts`) |
| 12 | Visitante novo chega à aba com o destaque | ✅ | e2e: clique em "Escolher plano" do Pro → cadastro com o `redirect` → conta criada → `/pt-br/onboarding?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_qa_pro` → nome de exibição → idioma English → "Concluir" → `/en/account?tab=billing&plan=price_qa_pro`, aba "Billing" ativa, selo "Selected plan" e anel só no Pro, "Subscribe" habilitado nos dois cards. O catálogo da aba veio do stub |
| 13 | Visitante já logado vai direto à aba | ✅ | `curl` com sessão em `next dev` e `next start`: 307 `location: /pt-br/account?tab=billing&plan=price_1`; a página responde 200. Browser: com sessão, o clique no Business levou a `/pt-br/account?tab=billing&plan=price_qa_business` com "Plano escolhido" só no Business |
| 14 | Admin logado continua no painel admin | ✅ | `curl` com a sessão de `admin@example.com`: o link do plano → 307 `/pt-br/account?tab=billing&plan=price_qa_pro` → 307 `/pt-br/admin` |
| 15 | Os links entre cadastro e login carregam o `redirect` | ✅ | e2e: no cadastro, "Entrar" → `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_qa_pro`; no login, "Cadastrar" → o mesmo valor no cadastro; ida e volta sem perda. Ausente, repetido e inseguro: unit (`authRedirectLink.test.ts`, `authPagesRedirect.test.tsx`) |
| 16 | Deep link anônimo preserva a query | ✅ | e2e: anônimo em `/pt-br/account?tab=billing&plan=price_qa_pro` → `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_qa_pro`, sem `tab`/`plan` soltos; login com `user@example.com` → a aba com "Plano escolhido" no Pro |
| 17 | O destaque só marca, não decide | ✅ | e2e: `plan=price_desconhecido` → nenhum selo, nenhum anel, dois "Assinar"; catálogo falhando → "Não foi possível carregar os planos." e nenhum selo. Assinatura viva: unit. A troca de aba descartando o destaque não foi medida (comportamento aceito no plano) |
| 18 | Personificação vê o destaque com os botões desligados | ✅ | e2e: `admin@example.com` em "Painel do usuário" personificando `user@example.com`, `?plan=price_qa_business` → "Plano escolhido" e anel no Business, os dois "Assinar" desabilitados. Unit: caso novo em `accountBillingPanel.test.tsx` |
| 19 | Selo e anel legíveis em light, dark e no card estreito | ✅ | e2e: anel branco em volta do card escolhido no dark e preto no light (1280 px); `es` em 375 px dark: badge "Plan elegido" com 22 px de altura (uma linha), sem overflow, terminando 25 px antes da borda do card |
| 20 | Open redirect: destinos que saem do locale caem no fallback | ✅ | e2e em `next dev` e `next start` (tabela acima), unit e rota com mutação. Destino legítimo com query intacto |
| 21 | Build sem Stripe e sem API | ✅ | `pnpm --filter web build` e `pnpm --filter api build` com código 0, as duas rotas dinâmicas |
| 22 | Catálogo real da Stripe na landing | 🔒 | exige conta Stripe com produtos; o `/test` usou stub |
| 23 | Número real de chamadas à Stripe | 🔒 | exige chave de teste e o log da Stripe |
| 24 | Checkout real a partir do card destacado | 🔒 | exige conta Stripe (mesmo 🔒 da `billing-subscription`) |

## Evidências e2e (o texto é a prova)

Os prints estão em `test/e2e/`, que o `.gitignore` descarta. O que vale é o texto da tabela acima. Lista,
como apoio: `01-pricing-ptbr-light.png`, `02-pricing-en-light.png`, `03-pricing-es-dark.png`,
`04-pricing-ptbr-mobile-dark.png`, `05-signup-with-redirect.png`, `06-onboarding-step1.png`,
`07-billing-en-selected-light.png`, `08-billing-en-selected-dark.png`, `09-billing-es-mobile-dark.png`,
`10-pricing-empty-es-light.png`, `11-pricing-empty-ptbr-mobile-dark.png`, `12-pricing-503-en-light.png`,
`13-billing-impersonating-ptbr.png`. Só contas `@example.com` do emulador aparecem neles.

## Observações que não reprovam

1. **Corrigida na rodada 2.** Na primeira passada, os cards da `/pricing` encostavam na borda lateral: em
   375 px os três começavam em x = 0 e mediam 360 px, a largura toda; em 1280 px o primeiro começava em
   x = 0 e o Enterprise terminava na borda. O `/review` tratou como regressão (a tabela de `HEAD` tinha
   `px-3`/`md:px-6` por célula) e pôs o recuo no wrapper (`px-4 md:px-2`), como o header e o footer. A
   hipótese desta etapa (`px-4` no container) foi descartada pelo revisor. Medição na seção "Rodada 2".
2. **BRL em `es` sai "29,00 BRL".** Comportamento do `Intl` (CLDR), igual ao da aba da app. A expectativa
   "R$ 29,00 / mes" do plano e do handoff estava errada.
3. **Fora do diff:** na aba da conta em 1280 px (en), os rótulos "Security" e "Preferences" ficam colados e
   "Preferences" passa por baixo de "Billing"; em 375 px a lista de abas rola na horizontal.
   `AccountTabs.tsx` não está no diff.

## Rodada 2: recuo lateral da `/pricing`

2026-10-16. O `/review` mudou só o wrapper de `apps/web/app/[locale]/pricing/page.tsx:40`, de
`w-full py-20 lg:py-40` para `w-full px-4 py-20 md:px-2 lg:py-40`, o mesmo recuo por fora do `container` que
o header (`components/header/index.tsx:106`) e o footer (`components/footer.tsx:56`) usam. Esta passada
mediu só isso, com `agent-browser`, numa sessão anônima.

**Como medi.** Para cada largura e tema, li `getBoundingClientRect()` do primeiro filho da grade (card ou
estado vazio), de cada bloco da grade, de `header > div` (o container do header do site) e de
`footer .container`, e comparei `document.documentElement.scrollWidth` com `innerWidth`. O navegador
headless reserva 15 px para a barra de rolagem vertical, então a área útil (`clientWidth`) é 360 px em
375, 753 em 768 e 1265 em 1280. A folga à direita abaixo é `clientWidth − right`.

**Com o catálogo do stub** (dois planos + Enterprise), `/pt-br/pricing`:

| Largura | Tema | 1º card `left` / `right` | Folga à direita do bloco mais à direita | Header `left` / `right` | Footer `left` / `right` | `scrollWidth` |
|---|---|---|---|---|---|---|
| 375 | light | 16 / 344 | 16 (os três cards empilhados, todos 16 / 344) | 16 / 344 | 16 / 344 | 360 (≤ 375) |
| 375 | dark | 16 / 344 | 16 | 16 / 344 | 16 / 344 | 360 |
| 768 | light | 8 / 368,5 | 8 (Business termina em 745) | 8 / 745 | 8 / 745 | 753 (≤ 768) |
| 1280 | light | 8 / 413,7 | 8 (Enterprise termina em 1257) | 8 / 1257 | 8 / 1257 | 1265 (≤ 1280) |
| 1280 | dark | 8 / 413,7 | 8 | 8 / 1257 | 8 / 1257 | 1265 |

`/es/pricing` a 375 px, dark: os três cards em 16 / 344, header em 16 / 344, `scrollWidth` 360. Os botões
"Elegir plan", "Elegir plan" e "Contáctanos" medem 36 px de altura (uma linha), e nenhum elemento dentro de
um card passa da borda dele. "Plan elegido" é o selo da aba da app, que esta correção não tocou; ele foi
medido na primeira passada (critério 19).

**Sem o stub**, com a web apontando direto para a API real sem chave Stripe (`GET /payments/catalog` → 200
`{"data":{"enabled":false,"plans":[]}}`), `/pt-br/pricing`:

| Largura | Tema | Estado vazio `left` / `right` | Enterprise `left` / `right` | Folga à direita | Header `left` / `right` | `scrollWidth` |
|---|---|---|---|---|---|---|
| 375 | light | 16 / 344 | 16 / 344 | 16 | 16 / 344 | 360 |
| 375 | dark | 16 / 344 | 16 / 344 | 16 | 16 / 344 | 360 |
| 1280 | light | 8 / 835,3 (duas colunas) | 851,3 / 1257 | 8 | 8 / 1257 | 1265 |
| 1280 | dark | 8 / 835,3 | 851,3 / 1257 | 8 | 8 / 1257 | 1265 |

`/es/pricing` a 375 px, dark, sem o stub: "Planes próximamente" e o Enterprise em 16 / 344, header em 16 / 344,
`scrollWidth` 360.

**Veredito: ✅.** Em todas as medições o `left` do primeiro bloco é igual ao `left` do container do header,
o bloco mais à direita termina à mesma distância da borda que o header, e nada rola de lado. O critério 3
continua ✅, agora com o recuo medido; o placar da feature segue 21 ✅, 0 ❌, 3 🔒.

**Ambiente da rodada 2.** As portas 3001, 3002, 3910, 3911, 9099, 8080, 9199, 4001, 4400, 4500 e 9150 estavam
livres. Subi um stub só de catálogo em 3910 e a `apps/web` em `next dev` (3001) apontando para ele; depois
derrubei os dois e subi a `apps/api` em `next dev` (3002, ambiente do emulador, sem chave Stripe, sem
emulador de pé, porque a rota do catálogo desligada não toca o Firestore) e a `apps/web` apontando para ela.
Os quatro processos foram derrubados pelo PID; no fim, `lsof -ti tcp:<porta>` saiu vazio em 3000, 3001,
3002, 3003, 3910, 9099, 8080, 9199 e 4001. O stub e os arquivos de ambiente em `/tmp` foram apagados.
Nenhuma conta foi criada nem usada. Prints de apoio, descartados pelo `.gitignore`:
`r2-01-pricing-ptbr-375-light.png`, `r2-02-pricing-ptbr-375-dark.png`, `r2-03-pricing-ptbr-1280-dark.png`,
`r2-04-pricing-es-375-dark.png`, `r2-05-pricing-empty-1280-dark.png`, `r2-06-pricing-empty-es-375-dark.png`.

## Lacunas herdadas: veredito

| Lacuna (origem) | Veredito |
|---|---|
| Nenhum teste renderiza `sign-in/page.tsx` e `sign-up/page.tsx` (handoff, `review.md`) | **fechada aqui**: `authPagesRedirect.test.tsx` |
| Proxy da app testado com `URL`, não `NextURL`, e sem a relativização do `Location` (handoff, `review.md`) | **continua aberta** quanto ao `NextURL`. A relativização ficou coberta: a asserção nova lê o `Location` sem a origem (o `locationOf` corta a origem como o Next faz), e a resposta real foi medida em `next dev` e `next start` |
| Layout da landing sem teste automatizado (handoff, `review.md`) | **continua aberta**, por decisão: layout é da passada de browser, feita nesta rodada |
| `postAuthRedirectTarget.test.ts` sem casos de `..` (nova, `review.md`) | **fechada aqui** |
| `proxy.test.ts:301-309` conferindo só o `Location` absoluto (nova, `review.md`) | **fechada aqui** |
| Decodificação dupla em `postAuthRedirectTarget` e query perdida no portão do onboarding com `%` malformado (plano, achado 2; `review.md` 🟢) | **fora de escopo**, continua no backlog |
| Sessão expirada perde a query (plano, achado 3) | **fora de escopo**, fora do caminho do CTA |
| Cache por instância em serverless (plano, Riscos) | **continua aberta**, 🔒 (critério 23) |
| `packages/shared` sem `typecheck` (plano, achado 4) | **fora de escopo**; o formatador segue checado pelo `typecheck` da `app` e da `web` |

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001, 4400, 4500, 9150),
então nada foi reaproveitado do usuário. Tudo abaixo foi subido por esta etapa e derrubado pelo PID:

- `pnpm emulators` (Auth, Firestore, Storage, projeto `demo-next-boilerplate`, JDK 21) e `pnpm seed`;
- `apps/api` em `next dev` (3002) com o ambiente do emulador montado pelo `buildStackEnv` da suíte e2e
  (o `.env` local aponta para um projeto Firebase real e não foi usado), primeiro sem chave Stripe e depois
  com `sk_test_offline_qa` / `whsec_offline_qa`, que não valem em conta nenhuma;
- `apps/app` em `next dev` (3000) e, para a medição em produção, `next build` + `next start` (3005);
- `apps/web` em `next dev` (3001), em modo assinatura e depois em `simple`;
- um stub HTTP temporário em `/tmp/pricing-qa/` (3910, controle em 3911). Ele responde `GET /payments/catalog`
  com dois planos (`price_qa_pro`, BRL 2900/mês, dois recursos; `price_qa_business`, BRL 9900/mês, descrição
  `null`) e `GET /payments/plans` com os mesmos planos, e repassa o resto para a API real. A web e a app
  apontaram `NEXT_PUBLIC_API_URL` para ele. Para os estados vazios a rota do catálogo passou a repassar à
  API real, e para "API fora do ar" o stub fechou a porta 3910.

A stack subiu duas vezes: a segunda só para os critérios 14 e 18 (admin e personificação). No fim das duas,
`lsof -ti tcp:<porta>` saiu vazio em 3000, 3001, 3002, 3003, 3005, 3910, 3911, 9099, 8080, 9199, 4001, 4400,
4500 e 9150, e nenhum PID guardado continuava vivo. O stub, os logs, os arquivos de ambiente e os cookies de
sessão em `/tmp/pricing-qa/` foram apagados.

## Contas e dados de QA

- `qa-pricing-catalog@example.com`: criada pelo cadastro da app **no emulador**. Morreu com o processo.
- `user@example.com` e `admin@example.com`: contas do `pnpm seed`, só no emulador.
- Nenhuma conta criada em projeto Firebase real; nada a acrescentar ao `docs/PRE-PRODUCTION.md`. A senha da
  conta de QA foi gerada na hora, ficou só em `/tmp` e foi apagada.

## Estado de dev alterado

- Os builds sobrescreveram `apps/web/.next`, `apps/api/.next` e `apps/app/.next` (artefatos ignorados pelo
  git). O `next dev` usa `.next/dev`, que não muda.
- Nenhum arquivo versionado mudou fora dos quatro arquivos de teste da tabela "Testes criados".

## Roteiro manual (para quem tiver conta Stripe de teste)

1. Na `apps/api`, preencher `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` de teste, com produtos e preços
   recorrentes ativos e um produto arquivado.
2. Abrir `/pt-br/pricing`, `/en/pricing` e `/es/pricing` na web: os planos ativos aparecem, o arquivado não.
3. Recarregar a página duas vezes e conferir no log da Stripe uma única chamada `GET /v1/prices` na hora.
4. Clicar "Escolher plano", criar conta, concluir o onboarding e clicar "Assinar" no card com o selo: o
   Checkout da Stripe abre com o preço escolhido.

## Cross-check

| Eixo | Coberto |
|---|---|
| `apps/web` × `apps/app` | os dois, no mesmo fluxo |
| comum × admin × personificação × anônimo | os quatro (critérios 12, 14, 16, 18) |
| `subscription` × `simple` | os dois na web; `simple` na API só por teste de rota |
| mobile × desktop | 375, 768 e 1280 px na landing; 375 e 1280 px na aba |
| light × dark | os dois na landing e na aba |
| pt-br × en × es | os três na landing e na aba |
