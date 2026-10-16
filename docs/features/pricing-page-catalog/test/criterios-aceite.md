# Critérios de Aceite (Checklist)

Base: seções 1, 5.5, 7, 9, 11 e 12 do `analyze/plan.md`, mais o achado 🔴 do `/review` (open redirect). Dois
ajustes vieram da medição. O preço em `es` está escrito como o `Intl` formata de fato ("29,00 BRL / mes"), e
não "R$ 29,00 / mes" como o plano previa. O critério do open redirect ganhou as variantes que a revisão
listou. O status de cada item está em `test/report.md`.

- [ ] **A landing mostra os planos do catálogo nos três idiomas**
  Com `GET /payments/catalog` devolvendo planos, `/pt-br/pricing`, `/en/pricing` e `/es/pricing` mostram um
  card por plano, com nome, descrição (some quando é `null`), preço formatado na moeda do preço e no idioma
  da rota ("R$ 29,00 / mês", "R$29.00 / month", "29,00 BRL / mes"), recursos com ícone e o botão "Escolher
  plano" / "Choose plan" / "Elegir plan". O card fixo "Enterprise" fecha a lista com "Sob consulta" e o link
  para `/<locale>/contact`. Nome, descrição e recursos vêm da Stripe sem tradução (fora do corte da spec).
  A página tem um único `h1` e os títulos dos cards são `h2`.

- [ ] **Os preços de exemplo saíram do dicionário**
  Nenhum valor fixo ("R$ 40", "$40") aparece em nenhum idioma, com ou sem catálogo. O subtree `pricing` do
  dicionário da landing não tem dígito, e a tabela comparativa de exemplo não existe mais.

- [ ] **Grade responsiva e tema**
  A grade tem um card por linha no mobile (375 px), dois a partir de `md` e três a partir de `xl`, com o card
  de contato fechando a linha. O botão de cada card não quebra em duas linhas. A grade, com planos ou com o
  estado vazio, começa e termina no mesmo recuo lateral do header (16 px no mobile, 8 px do `md` em diante),
  sem rolagem horizontal. Light e dark herdam os tokens do design system, sem cor nova.

- [ ] **Sem cobrança ligada, a landing mostra o estado vazio**
  Com a API sem `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, a rota responde 200
  `{ enabled: false, plans: [] }` sem chamar a Stripe, e a página mostra "Planos em breve" / "Plans coming
  soon" / "Planes próximamente" com a descrição, o card de contato e nenhum preço nem link de cadastro. No
  `xl` o estado vazio ocupa duas colunas.

- [ ] **Stripe falhando vira estado vazio, não 500**
  Com uma chave Stripe inválida, `GET /payments/catalog` responde 503
  `{ "error": { "code": "PAYMENTS_PROVIDER_UNAVAILABLE" } }` e loga `[payments] catalog-failed
  requestId=<uuid>`. A falha não fica em cache: cada visita refaz a chamada. A landing responde 200 com o
  estado vazio e loga `[payments] catalog-unavailable status=503 reason=ERR_BAD_RESPONSE`.

- [ ] **API fora do ar vira estado vazio, não 500**
  Com a API inalcançável, a landing responde 200 com o estado vazio e loga
  `[payments] catalog-unavailable reason=ECONNREFUSED`. O SDK desiste em 5 s quando a API não responde.

- [ ] **Modo `simple` não consulta o catálogo**
  Com `NEXT_PUBLIC_PRODUCT_MODE=simple` na web, a página mostra o estado vazio nos três idiomas e não faz
  nenhuma chamada a `/payments/catalog`. O mesmo vale para `NEXT_PUBLIC_API_URL` vazia.

- [ ] **A rota pública expõe só o catálogo**
  `GET /payments/catalog` responde sem sessão nem token. Cada plano tem exatamente as chaves de `PlanDTO`
  (`priceId`, `productId`, `name`, `description`, `features`, `unitAmount`, `currency`, `interval`,
  `intervalCount`); `metadata`, cliente e assinante não saem. Sem `Origin` (chamada do servidor da landing) a
  rota responde; com `Origin` fora de `CORS_ORIGIN` responde 403, como as demais.

- [ ] **A rota pública fica fora do rate limit**
  `/payments/catalog` não está em `RATE_LIMITED_PATHS`: com `ARCJET_KEY` preenchida e o limitador negando, a
  requisição passa sem consultar o Arcjet. Quem chama é o servidor da landing, de um único endereço.

- [ ] **Duas visitas, uma chamada à Stripe**
  O catálogo fica em cache por uma hora no processo da API. Duas leituras dentro da validade fazem uma
  chamada; depois de 1 h, uma nova; leituras simultâneas com o cache vazio compartilham a mesma chamada; uma
  falha sai do cache e a visita seguinte tenta de novo.

- [ ] **O botão do plano leva ao cadastro da app com a escolha**
  Em modo assinatura com `NEXT_PUBLIC_APP_URL`, o link de cada plano é
  `<app>/<locale>/sign-up?redirect=%2F<locale>%2Faccount%3Ftab%3Dbilling%26plan%3D<priceId>`, um por plano.
  Sem URL da app, o link é o `/<locale>/sign-up` da landing; em `simple`, a URL da app.

- [ ] **Visitante novo chega à aba com o plano em destaque**
  Do botão "Escolher plano", o visitante cria a conta no cadastro da app, cai em
  `/<locale>/onboarding?redirect=...plan=<priceId>`, conclui o onboarding e aterrissa em
  `/<locale>/account?tab=billing&plan=<priceId>` com a aba "Cobrança" aberta, o selo "Plano escolhido" só no
  card daquele plano e o botão "Assinar" habilitado. Trocando o idioma para English no último passo, o
  destino vira `/en/account?...` e o selo diz "Selected plan".

- [ ] **Visitante já logado vai direto à aba**
  Com sessão, abrir o link do plano responde 307 com `Location: /<locale>/account?tab=billing&plan=<priceId>`,
  sem `%3F` no caminho, e a página abre com 200 (não 404). No browser, o clique no botão leva direto ao card
  destacado.

- [ ] **Admin logado clicando o botão continua no painel admin**
  Com sessão de admin, o link do plano leva a `/<locale>/account?...` e o layout comum desvia para
  `/<locale>/admin`, como já acontecia.

- [ ] **Os links entre cadastro e login carregam o `redirect`**
  No cadastro aberto com `?redirect=`, o link "Entrar" aponta para `/<locale>/sign-in?redirect=<mesmo valor>`;
  no login, "Cadastrar" aponta para o cadastro com o mesmo valor. Sem `redirect`, ou com `redirect` repetido
  na URL, ou com destino inseguro, os links saem sem o parâmetro.

- [ ] **Deep link anônimo preserva a query**
  Sem sessão, abrir `/<locale>/account?tab=billing&plan=<priceId>` leva a
  `/<locale>/sign-in?redirect=%2F<locale>%2Faccount%3Ftab%3Dbilling%26plan%3D<priceId>`, sem `tab` nem
  `plan` soltos na URL do login. Depois de entrar, a aba abre com o destaque.

- [ ] **O destaque só marca, não decide**
  `?plan=` só escolhe qual card recebe o selo e o anel `ring-2 ring-primary`. Um `priceId` fora do catálogo
  não destaca nada nem mostra mensagem. Com assinatura viva a lista de planos não aparece e não há selo. Com
  o catálogo falhando, a aba mostra "Não foi possível carregar os planos." e nenhum selo. O parâmetro não
  chega à API nem dispara checkout. Trocar de aba descarta o destaque.

- [ ] **Personificação vê o destaque com os botões desligados**
  O admin personificando um usuário comum vê o selo no card escolhido e todos os "Assinar" desabilitados.

- [ ] **Selo e anel legíveis em light, dark e no card estreito**
  O anel aparece no light e no dark. Em `es`, "Plan elegido" cabe numa linha no card de 375 px sem
  ultrapassar a borda.

- [ ] **Open redirect: destinos que saem do locale caem no fallback**
  Com sessão, `/<locale>/sign-in?redirect=` com `..` seguido de `\`, `%2e%2e`, tab ou codificação dupla
  (`%2Fpt-br%2F..%2F%5Cevil.example.com`, `%2Fpt-br%2F%252e%252e%2F%255cevil.example.com`,
  `%2Fpt-br%2F..%2F%09%2Fevil.example.com`, `%2Fpt-br%2F..%5C%5Cevil.example.com`) responde 307 com
  `Location: /<locale>`, nunca com algo que comece com `//`. Destinos legítimos, inclusive com query e com
  `..` que fica dentro de um locale, continuam iguais. O mesmo guard protege o proxy, o portão do
  onboarding, os links entre cadastro e login e a navegação pós-login.

- [ ] **Build sem Stripe e sem API**
  `pnpm --filter web build` termina com código 0 com a API desligada, e `/[locale]/pricing` sai como rota
  dinâmica (o build não chama a API). `pnpm --filter api build` termina com código 0 sem as variáveis da
  Stripe, com `/payments/catalog` dinâmica.

- [ ] **Catálogo real da Stripe na landing**
  Com uma conta Stripe de teste com produtos e preços recorrentes ativos, a landing mostra esses planos, e
  produto arquivado ou preço não recorrente não aparece.

- [ ] **Número real de chamadas à Stripe**
  Com chave de teste, duas visitas seguidas à landing geram uma chamada `prices.list` no log da Stripe por
  instância quente.

- [ ] **Checkout real a partir do card destacado**
  Clicar "Assinar" no card destacado abre o Checkout da Stripe com o preço escolhido.
