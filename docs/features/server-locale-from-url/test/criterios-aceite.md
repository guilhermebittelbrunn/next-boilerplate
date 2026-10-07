# Critérios de Aceite (Checklist)

Idioma das páginas renderizadas no servidor a partir da URL. A base são os 9 critérios da §9 do plano. O
`/test` separou do critério 3 a troca de idioma sem recarregar, que tem resultado diferente nas duas apps,
e acrescentou o caso do `POST` de Server Action. O status, o meio e o valor medido de cada item estão em
[`report.md`](report.md). Marcado `[x]` quando passou em build de produção; `[ ]` quando falhou ou não foi
coberto.

- [x] **Primeira visita à landing em inglês ou espanhol sai inteira no idioma da URL**
  Sem cookie `x-locale`, `GET /en` e `GET /es` da `apps/web` em `next build && next start` respondem com
  `<html lang="en">` e `<html lang="es">`. O texto dos Server Components (título do hero, título do FAQ,
  rodapé) sai no mesmo idioma dos componentes client: "Home" e "Frequently asked questions" em `/en`,
  "Inicio" e "Preguntas frecuentes" em `/es`. A resposta continua gravando `set-cookie: x-locale=<idioma>`,
  para a próxima visita sem idioma no caminho. `/pt-br` sem cookie segue com `lang="pt-br"`.

- [x] **A URL vence o cookie em toda página da web**
  Com `Cookie: x-locale=pt-br`, `/en/pricing`, `/en/contact` e `/en/legal/privacy` saem com `lang="en"` e
  título em inglês ("Pricing", "Contact - Next Boilerplate", "Privacy Policy"). Vale também para `/es/pricing`
  ("Precios"). O cookie gravado na resposta passa a ser o da URL. Uma navegação client-side para outra
  página do mesmo idioma, feita com o cookie ainda apontando para outro idioma, também renderiza os Server
  Components no idioma da URL.

- [x] **Server Action responde no idioma da URL da página que a chamou**
  O `POST` de uma Server Action passa pelo proxy e recebe o header como qualquer render. Com
  `Cookie: x-locale=pt-br`, uma action que chama `getDictionary()` disparada em `/en/contact` resolve `en`;
  com cookie `en`, disparada em `/es` resolve `es` e em `/pt-br` resolve `pt-br`. A action de contato
  (`contact/actions/contact.tsx`) usa o idioma só para escolher o template do e-mail ao dono e hoje não tem
  chamador na UI.

- [x] **Na app, o `lang` acompanha a URL na carga completa**
  Com cookie de outro idioma, `/en/sign-in` sai com `lang="en"` e `/es/sign-in` com `lang="es"` já na
  primeira requisição, sem uma segunda navegação. Logado, a carga completa de `/en/entities`, `/es/entities`
  e `/pt-br/entities` sai com o `lang`, o título da aba e os cabeçalhos da tabela no idioma da URL, mesmo
  com o cookie apontando para outro idioma.

- [x] **A troca de idioma pelo seletor atualiza o `lang` sem recarregar a página**
  Na `apps/web`, trocar de `/pt-br` para `/en` pelo `LanguageSwitcher` mantém a navegação suave e passa
  `document.documentElement.lang` para `en`, com o texto da página em inglês. Na `apps/app`, a troca de
  `/en/entities` para `/es/entities` e depois para `/pt-br/entities` mantém a navegação suave e leva o `lang`
  para `es` e `pt-br`, com uma única mudança do atributo, já com a URL nova. O botão voltar do navegador
  também acompanha. Uma rota sem segmento de idioma válido (o 404 raiz) mantém o `lang` que o servidor
  renderizou depois da hidratação.
  Histórico: na rodada 1 este item falhou na app (o `lang` ficava no idioma anterior até recarregar, igual
  ao código anterior a esta tarefa). A rodada 2 do `/review` acrescentou o `DocumentLangSync`, e a remedição
  passou.

- [x] **A página de 404 da app fala o idioma da URL**
  Logado e com `x-locale=pt-br`, `/en/rota-inexistente` responde 404 com `lang="en"`, "Page not found" e o
  link "Go to home" para `/en`, e o `lang` continua `en` depois da hidratação. O mesmo vale para `/es/rota-inexistente` ("Página no encontrada", "Ir al
  inicio" para `/es`) e para `/pt-br/rota-inexistente` com cookie `en` ("Página não encontrada", "Ir para o
  início" para `/pt-br`). Antes da correção, o texto vinha do cookie.

- [x] **Sem idioma na URL, o servidor usa o cookie e depois o padrão**
  O 404 de um caminho com extensão que não passa pelo ramo final do proxy (por exemplo
  `/x/y/nao-existe.txt` na app) sai no idioma do cookie `x-locale` e, sem cookie, em `pt-br`, com o link de
  início no mesmo idioma. O `lang` não muda depois da hidratação. `/` continua redirecionando para `/pt-br/` nas duas apps. Com
  `NEXT_PUBLIC_DEFAULT_LOCALE` inválido (`pt-BR`), o padrão vira `pt-br` em vez de devolver dicionário
  vazio; esse caso está coberto por teste unitário, não pelo build, porque a variável é embutida na
  compilação.

- [x] **Header forjado não escolhe o idioma**
  Um `x-request-locale` enviado pelo navegador numa rota sob o matcher é sobrescrito pelo proxy com o
  idioma da URL: `x-request-locale: es` em `/en` (web) e em `/en/sign-in` (app) dá `lang="en"`. No ramo de
  asset da app, o header do navegador é descartado e vale o cookie. Um valor fora de `pt-br`/`en`/`es` que
  chegue ao servidor (`fr`) é ignorado, e a resolução segue para o cookie. Fora do matcher (`/api/*` na
  app), o header do navegador chega ao servidor e escolhe o idioma do próprio 404, como descreve o
  `ARCHITECTURE.md`.

- [x] **Nenhum header interno vaza para o navegador**
  As respostas das duas apps, incluindo redirects, 404 e o ramo de asset, não trazem
  `x-middleware-request-*` nem `x-middleware-override-headers`. CSP e HSTS seguem presentes em todos os
  ramos sob o matcher, inclusive no redirect de `/`. Na web a CSP continua em modo
  `content-security-policy-report-only`, como antes.

- [x] **Cada caso tem um teste que o código antigo reprova**
  Os testes novos de `getDictionary()`, dos dois proxies e da página de 404 falham contra o código
  anterior à correção (3 de 8, 4 de 5 e 4 de 28), e os que passam são as regressões declaradas. `pnpm test`
  da raiz fica verde com os emuladores.

- [x] **Tema e responsivo sem mudança**
  A landing em `/en` e `/es` e o login e a lista de entidades da app em light, dark e 375 px ficam sem
  rolagem horizontal da página e sem texto cortado. O diff não toca estilo.
