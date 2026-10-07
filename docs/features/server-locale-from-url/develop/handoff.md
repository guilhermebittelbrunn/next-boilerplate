# Handoff do develop: server-locale-from-url

Implementação do plano em `analyze/plan.md`, em rodada autônoma do `/cycle`. Nada foi commitado; branch atual
`guilhermebittelbrunn/cycle-command`. As mudanças em `specs/BACKLOG.md` e `specs/account-security-mfa.md` que
aparecem no working tree já estavam lá antes desta etapa e não são deste develop.

## Blueprint para arquivos

| item do plano | arquivos |
|---------------|----------|
| 10.1 constante do header | `packages/internationalization/utils.ts` (`LOCALE_REQUEST_HEADER = "x-request-locale"`) |
| 10.2 `getDictionary()` lê header, depois cookie, depois padrão | `packages/internationalization/server.ts` |
| 10.3 proxy da web repassa o idioma | `apps/web/proxy.ts:129-134` |
| 10.4 proxy da app repassa o idioma | `apps/app/proxy.ts:261-265`; ramo de asset em `apps/app/proxy.ts:159-172` (desvio 1) |
| 10.5 `NotFoundPage` usa `getDictionary()` | `apps/app/shared/components/ui/NotFoundPage.tsx` |
| 10.6 comentário falso do pricing | `apps/web/app/[locale]/pricing/page.tsx` (2 linhas removidas) |
| 10.7 testes | `packages/internationalization/__tests__/serverDictionary.test.ts` (novo), `apps/web/__tests__/proxyLocale.test.ts` (novo), `apps/app/__tests__/proxy.test.ts` (4 casos novos em `describe("proxy locale")`), `apps/app/__tests__/notFoundPageHomeLink.test.tsx` (mock de `headers` + 1 caso) |
| 10.8 documentos | `docs/ARCHITECTURE.md:64`, `AGENTS.md:25`, `apps/app/CLAUDE.md:47` e `:81` (desvio 2), `.claude/skills/i18n-sync/SKILL.md:14`, `docs/PRE-PRODUCTION.md:414` |

## Contrato

Sem SDK, API, DTO ou Firestore. O único contrato novo é o header de requisição `x-request-locale`, escrito
pelos dois proxies e lido só por `getDictionary()` de `@repo/internationalization/server`. Os 18 chamadores de
`getDictionary()` e os dois layouts com `<html lang>` não mudaram. `getTranslations(locale)` não mudou.

Raio de impacto: toda renderização de servidor que passa pelo ramo final dos proxies passa a usar o idioma da
URL. Fora do matcher (`/api/*`, `robots.ts`, `sitemap.ts`, `_next/*`) nenhum arquivo chama `getDictionary()`
(conferido com `grep -rln "internationalization/server" apps packages`: os importadores são páginas, layouts,
componentes e a Server Action de contato, todos sob o matcher).

## Códigos de erro novos

Nenhum. Nenhuma chave de i18n nova.

## Desvios em relação ao plano

1. **O ramo de asset estático da app agora remove um `x-request-locale` enviado pelo navegador.** O plano
   decidiu deixar passar (§6 e §12: "efeito máximo é o idioma de um 404"). O raciocínio dele está certo quanto
   ao risco, mas a rodada exigiu que o proxy sobrescreva qualquer valor vindo do cliente, e sem isso o 404 raiz
   de um caminho com extensão era o único render sob o matcher em que o header do navegador chegava ao
   servidor. `passStaticAsset` só cria o override quando o header está presente; uma requisição normal de
   asset continua com `NextResponse.next()` puro (caso "leaves a plain static asset request untouched").
   Custo: uma função de 9 linhas e dois casos de teste.
2. **`apps/app/CLAUDE.md:81` dizia que existe `app/[locale]/not-found.tsx`.** Não existe (`find apps/app/app
   -name not-found.tsx` devolve só `apps/app/app/not-found.tsx`). Corrigido no mesmo arquivo que o plano já
   editava.
3. **Âncoras do `PRE-PRODUCTION.md`.** As anteriores (`apps/app/proxy.ts:169,173`, `apps/web/proxy.ts:104,108`)
   já estavam desatualizadas antes desta tarefa. Recontadas com `grep -n "x-locale\|LOCALE_COOKIE"` depois da
   edição: `server.ts:13`, `apps/app/proxy.ts:214,218`, `apps/web/proxy.ts:111,115`.
4. **Testes a mais que o plano.** Web: "keeps the request headers the browser sent" (pega uma implementação
   que monte `new Headers()` vazio e apague cookies e demais headers da requisição) e "does not forward
   anything on the redirect" (regressão). i18n: o caso de header inválido cobre também `""`.
5. `isSupportedLocale` recebe `string | null` (o que `Headers.get` devolve), em vez de `string | null |
   undefined` do esboço. Sem efeito de comportamento.

Nenhuma decisão do plano estava errada a ponto de exigir correção; os desvios 1 e 2 são escolha e correção de
documento, respectivamente.

## Prova de que os testes novos falham no código antigo

Procedimento: primeiro só a constante em `utils.ts` (adição sem efeito de comportamento), depois os testes, e
rodada contra `server.ts`, os dois `proxy.ts` e `NotFoundPage.tsx` ainda sem alteração.

| comando (no workspace) | resultado no código antigo |
|------------------------|----------------------------|
| `NODE_ENV=test npx vitest run __tests__/serverDictionary.test.ts` (i18n) | 3 falham, 5 passam. Falham: URL vence cookie (`expected 'pt-br' to be 'en'`), primeira visita sem cookie (`expected 'pt-br' to be 'es'`), padrão inválido (`expected 'pt-BR' to be 'pt-br'`). |
| `npx vitest run __tests__/proxyLocale.test.ts` (web) | 4 falham, 1 passa. Falham os quatro de repasse (`expected null to be 'en'`, `'es'`, `'pt-br'`, `'en-US'`). |
| `npx vitest run __tests__/proxy.test.ts __tests__/notFoundPageHomeLink.test.tsx` (app) | 4 falham, 24 passam. Falham: repasse (`expected null to be 'es'`), forjado (`expected 'es' to be 'pt-br'`), asset com header forjado (`expected null not to be null`), 404 no idioma da URL (`homePathMock` chamado com `pt-br` em vez de `en`). |

Os que passam no código antigo são regressões declaradas: cookie sem header, padrão válido sem cookie,
header inválido cai no cookie (3 valores), redirect sem repasse, asset sem header intocado.

Os testes de regressão de segurança foram conferidos por mutação, com o código novo alterado de propósito e
depois restaurado:

- `server.ts` trocado por `resolveLocale(urlLocale ?? cookie)`: os 3 casos de header inválido falham.
- `apps/web/proxy.ts` com `append` no lugar de `set`: "replaces a locale header the browser sent" falha com
  `expected 'es, pt-br' to be 'pt-br'`.

Depois da correção, os mesmos três comandos: 8/8, 5/5 (web, junto com `securityHeaders` e `pricingPage`: 11/11)
e 28/28.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 858 arquivos, sem erro |
| typecheck + testes | `pnpm turbo run typecheck test --filter=@repo/internationalization --filter=web --filter=app` | 14/14 tasks (3 do cache). i18n 67 testes (7 arquivos, inclui paridade), web 87 (14), app 823 (101) |

Na primeira rodada o typecheck do pacote de i18n falhou (`TS1309`, top-level `await import` num pacote
CommonJS) e o lint acusou `useAwait` no mock de `headers` do teste da 404. Os dois foram corrigidos (import
estático, já que o `vi.mock` é içado; mock sem `async`) antes da rodada acima.

## Smoke local

`next dev` da web na porta 3001 (estava livre; subido e derrubado pelo PID, porta conferida livre depois).
Com `curl -s ... | grep -o '<html[^>]*lang="[^"]*"'`:

- sem cookie: `/en` → `lang="en"`, `/es` → `lang="es"`, `/pt-br` → `lang="pt-br"`;
- `Cookie: x-locale=pt-br` em `/en/pricing` → `lang="en"`;
- `x-request-locale: es` + `Cookie: x-locale=pt-br` em `/en` → `lang="en"`;
- `curl -D -` em `/en`: só `set-cookie: x-locale=en`, nenhum `x-middleware-*`.

Isso foi em `next dev` e só na web. Não vale como validação do critério; a medição de verdade é a do `/test`,
em build de produção. A app não foi subida.

## A verificar no `/test`

Tudo da §8 do plano continua valendo. Em particular, nada abaixo foi medido aqui em build de produção:

- web em `build && start`: `/en` e `/es` sem cookie com `lang` e texto do hero no idioma da URL; `set-cookie:
  x-locale=<idioma>` presente;
- web: Server Action de contato em `/en/contact` com `Cookie: x-locale=pt-br` responde em inglês;
- app: `Cookie: x-locale=pt-br` em `/en/sign-in` → `lang="en"`; logado, carga completa de `/en/entities` e
  `/es/entities` com `lang` da URL;
- app: logado, `/en/rota-inexistente` com cookie `pt-br` → `lang="en"`, "Page not found" e link para `/en`;
- app, ramo de asset: `Cookie: x-locale=es` em `/nao-existe.txt` → 404 com `lang="es"`; e, por causa do
  desvio 1, `x-request-locale: en` + `Cookie: x-locale=es` no mesmo caminho → ainda `lang="es"`;
- nenhuma resposta das duas apps com `x-middleware-request-*` ou `x-middleware-override-headers`; CSP e HSTS
  presentes, inclusive no redirect de `/`;
- troca pelo `LanguageSwitcher` (navegação suave) segue atualizando `document.documentElement.lang`.

## Lacunas de teste conhecidas

- A ligação "override de header do proxy → `headers()` no Server Component" é do Next e não tem teste
  unitário. Só o `/test` mede, em build.
- Os unitários do proxy leem `x-middleware-request-*` na resposta, o formato interno que o
  `NextResponse.next({ request })` do Next 16.0.0 grava. Se o Next mudar esse formato, os testes quebram
  junto com os de `x-app-path` que já existiam.
- Sem caso E2E de `lang` no Playwright (pergunta 6 do plano, mantida como "não").

## Decisões em aberto

Nenhuma nova. A pergunta 6 do plano (caso E2E permanente para WCAG 3.1.1) continua com a opção adotada.
