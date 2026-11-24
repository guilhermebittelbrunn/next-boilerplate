# Critérios de Aceite (Checklist)

Fatia 3 da spec `delivery-product-quality`: título por tela no painel e eventos de conversão (`sign_up`,
`generate_lead`) só com consentimento. Status medido no `/test` de 2026-11-23: ✅ aprovado, ❌ reprovado,
🔒 não verificado (precisa de infra externa). O meio de cada medição está em `test/report.md`.

- [x] **Cada tela do painel tem título próprio** ✅
  As dez telas internas do painel (seis comuns e quatro de admin) mostram na aba o rótulo da tela seguido de
  " | " e da marca, por exemplo "Entidades | next-boilerplate". As duas telas iniciais continuam com o nome da
  área: "Painel do usuário | next-boilerplate" e "Administração | next-boilerplate". Nenhum par de telas da mesma
  área repete título. O título também troca na navegação do cliente (clique na barra lateral), não só no
  carregamento completo. Medido no navegador nas 12 telas e no E2E `entityCrud.spec.ts` (lista, criação e
  edição, `chromium` e `mobile`).

- [x] **O título acompanha o idioma da rota** ✅
  Em `/en/...` e `/es/...` o título sai do dicionário do idioma do segmento ("Entities", "Entidades", "Edit User",
  "Editar Usuario", "Audit trail", "Auditoría"). Nenhum título fica vazio nos três idiomas e nenhuma chave nova de
  tradução foi criada (paridade de i18n: 67 testes). Idioma fora da lista cai no padrão de `resolveLocale`, o que
  só o unitário cobre (`panelTitles.test.ts`).

- [x] **O formato segue o das telas sem autenticação** ✅
  O sufixo é " | <marca>", com a marca de `getBrand()`, o mesmo formato de `createMetadata` ("Cadastrar |
  next-boilerplate", "Configurar conta | next-boilerplate"). Trocar a marca muda o sufixo das doze telas sem
  editar página; isso está coberto pelo unitário (marca configurada e marca padrão).

- [x] **Tela nova sem título quebra o teste** ✅
  Uma pasta com `page.tsx` sob `(common)/(pages)` ou `admin/(pages)` sem entrada em `PANEL_PAGE_TITLES`, ou sem
  `panelPageMetadata` na página ou num `layout.tsx` irmão, reprova `panelTitles.test.ts`. Medido aqui com a
  sonda `(common)/(pages)/qaprobe/page.tsx`: 2 falhas ("registers a title for exactly the screens that exist" e
  "wires '/qaprobe'..."); sonda removida, 27/27 de volta. Chamada quebrada em várias linhas pelo Biome não
  reprova (medido no `/review`).

- [x] **Título não expõe dado de usuário** ✅
  As telas de edição usam o rótulo fixo ("Editar entidade", "Editar Usuário"), sem nome, e-mail ou id do
  registro, mesmo com um id real na URL. Com id inexistente o título continua "Editar entidade | next-boilerplate".
  Nenhum `generateMetadata` do painel chama a API.

- [x] **Título igual durante a personificação** ✅
  Com o admin personificando `user@example.com`, `/pt-br` mostra "Painel do usuário | next-boilerplate" e
  `/pt-br/entities` mostra "Entidades | next-boilerplate", os mesmos títulos da conta comum.

- [x] **Cadastro por e-mail dispara `sign_up` uma vez** ✅
  Na app e na landing, quando a API responde 201 ao cadastro, o `dataLayer` recebe
  `["event","sign_up",{"method":"email"}]` antes do login automático, e o login que vem em seguida não dispara
  outro. Na app o evento sobrevive ao carregamento completo para `/pt-br/onboarding`; na landing, à navegação do
  cliente para `/pt-br`. Recusa da API (`AUTH_EMAIL_EXISTS`, validação, `USERS_PROFILE_CREATE_FAILED`) não
  dispara nada: coberto pelos testes de componente das duas apps, não pelo navegador. Duplo clique é barrado pelo
  `isPending`.

- [x] **Primeiro acesso com Google dispara `sign_up`, os seguintes não** ✅
  Nas quatro telas com botão do Google (cadastro e login, app e landing), o evento sai com `method: "google"`
  quando o popup criou a conta. O login seguinte com a mesma conta não dispara. Fechar o popup mostra o alerta
  "Login cancelado." e não dispara evento. Conta recusada pela API depois do popup (conta arquivada) ficou só no
  unitário: o evento sai mesmo assim, porque a conta existe no Firebase (desvio 1 do handoff, aceito no
  `/review`).

- [x] **Contato aceito dispara `generate_lead`** ✅
  Quando a API aceita a mensagem, o `dataLayer` recebe `generate_lead` sem parâmetros e a tela mostra "Mensagem
  enviada". `CONTACT_UNAVAILABLE` (503) não dispara. `EMAIL_SEND_FAILED` e erro de validação estão no teste de
  componente. Sem caixa de suporte configurada o formulário não aparece (comportamento anterior, não remedido).

- [x] **Sem consentimento, nenhum evento** ✅
  Com o banner sem resposta ou com "Recusar tudo", um cadastro completo não coloca `sign_up` no `dataLayer` e não
  carrega o `gtag.js`. Aceitar o banner e se cadastrar na mesma visita mede. Desligar a medição depois, nas
  preferências, para de medir: isso só o teste de componente cobre.

- [x] **Sem GA configurado, nada quebra** ✅
  Com `NEXT_PUBLIC_GA_MEASUREMENT_ID=""` e fora da Vercel, a landing (dev) e a app (build de produção) sobem sem
  banner, com `window.dataLayer` e `window.gtag` indefinidos; cadastro e contato concluem e nenhum erro aparece em
  `errors`. O caso "Vercel sem id do GA" (banner presente, nenhum evento) ficou só no teste de componente.

- [x] **Nenhum dado pessoal no evento** ✅
  Todas as entradas `event` lidas do `dataLayer` foram `["event","sign_up",{"method":"email"}]`,
  `["event","sign_up",{"method":"google"}]` ou `["event","generate_lead"]` (terceiro argumento indefinido).
  Nenhum e-mail, nome, uid ou texto de mensagem.

- [x] **O fork registra os próprios eventos com a mesma regra** ✅
  `useAnalyticsEvent()` de `@repo/analytics/events-context` devolve `trackEvent(name, params?)`, que obedece ao
  consentimento e ao id do GA. `docs/FORKING.md` §7.4 mostra o uso. Coberto pelo teste de componente e pela
  leitura da doc.

- [x] **Documentação aponta para o que o core faz** ✅
  `docs/delivery/03-product-quality.md` descreve os dois eventos e como conferir o `dataLayer`; a entrada
  `["event","sign_up",{"method":"email"}]` citada lá é a mesma que o navegador mostrou. `docs/PRE-PRODUCTION.md`
  tem o item 19; `apps/app/CLAUDE.md` e a skill `new-crud` mandam registrar o título de tela nova.

- [ ] **Eventos chegam numa propriedade GA4 real e viram eventos principais** 🔒
  Ver `sign_up` e `generate_lead` no Tempo real ou no DebugView de uma propriedade GA4 e marcá-los como eventos
  principais exige a propriedade do fork. Pendência no item 19 do `docs/PRE-PRODUCTION.md`.
