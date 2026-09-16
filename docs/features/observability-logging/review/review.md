# Revisão — observabilidade, request id e readiness

Revisão do working tree inteiro da rodada `/cycle`. Quatro assuntos convivem no diff: a feature, a
auditoria do backlog em `specs/`, correções em `docs/PRE-PRODUCTION.md` e os artefatos da feature.

Nada foi commitado. O plano de commits está no fim; quem commita é o `/review`, bloco a bloco.

## Branch

| item | valor |
|---|---|
| nome | `feat/observability-logging` |
| origem | criada a partir de `los-angeles` (nome fora do padrão, sem remoto) |
| criada ou reutilizada | criada |
| validação do regex | **passou** |

A branch anterior, `los-angeles`, é o nome do workspace do Conductor e não bate com
`<project>/<type>/<title>`. Como o diff toca `packages/shared`, `apps/api`, `apps/app`, `apps/web` e
`packages/internationalization` — vários apps **e** vários pacotes —, o `project` foi omitido, que é a
única forma sem prefixo que a regra aceita.

Comando e resultado:

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
printf '%s' "$BRANCH" | grep -qE '^((app|web|api|email|sdk|design-system|internationalization|auth|payments|shared|analytics|security|seo|next-config|typescript-config|packages|claude|specs)/)?(feat|fix|style|chore|ci|refactor|perf|test|docs)/[a-z0-9]+(-[a-z0-9]+)*$' \
  && echo "branch OK: $BRANCH" || echo "BRANCH INVALIDA: $BRANCH"
# branch OK: feat/observability-logging
```

`los-angeles` não foi renomeada: ela é o workspace, e outras rodadas vão continuar usando o nome.

## Achados

| # | sev | arquivo:linha | problema | ação |
|---|---|---|---|---|
| 1 | 🟡 | `packages/shared/utils/helpers/requestErrorReporter.ts:23` | O `path` que o Next entrega vem com a query string colada. Medido em build de produção: `path=/probe-request-id?boom=1&search=alguem@example.com`. O painel busca registro por e-mail (`Table` com `searchFields`), então um `throw` numa rota de busca grava o endereço no log — exatamente o que a regra de privacidade da própria feature proíbe. | **corrigido**: só a parte antes do `?` é retida |
| 2 | 🟡 | `packages/shared/utils/helpers/requestErrorReporter.ts:21-26` | A linha `[request] failed` não carregava `requestId`, mas a resposta 500 que o usuário recebe carrega o header. O identificador que ele cita num chamado não achava nada no log. A §8.5 do plano pede essa correlação de forma literal; a §9 esqueceu de listá-la. | **corrigido**: o gancho lê `x-request-id` de `request.headers`, que o tipo do Next expõe |
| 3 | 🟡 | `docs/PRE-PRODUCTION.md` | As quatro pendências de infra da §11 do plano não tinham sido registradas. O `/cycle` manda registrar ali o que exige console de provedor. | **corrigido**: seção 10 nova, com os quatro itens |
| 4 | 🟢 | `docs/features/observability-logging/develop/screenshots/01-toast-com-request-id-light-ptbr.png` | Captura órfã: o nome promete tema light com o sufixo, a imagem mostra tema dark e nenhum toast. Não aparece na tabela do handoff. Evidência que não evidencia nada iria para o repo. | **corrigido**: removida |
| 5 | 🟢 | `docs/features/firebase-emulator-seed/analyze/plan.md:3` | O `git mv` da spec para `docs/features/firebase-emulator-seed/spec.md` quebrou o link relativo que apontava para `specs/`. | **corrigido**: aponta para `../spec.md` |
| 6 | 🟡 | `packages/shared/package.json` | Único pacote com `test` e sem `typecheck`, e sem `tsconfig.json`. Os fontes são typechecados de carona pelos apps que os importam; os arquivos de `__tests__/` não são checados por ninguém. | **não corrigido** — critério abaixo |
| 7 | 🟢 | `docs/PRE-PRODUCTION.md:216` | A medição diz `pnpm check` com **517** arquivos. O número foi tirado antes de a feature existir; hoje são 528. | **não corrigido**: o parágrafo data a medição, então não mente — mas quem reler vai achar a diferença |
| 8 | 👁 | `apps/app/app/[locale]/(unauthenticated)/components/AuthCard.tsx:14` | Erro de hidratação no `<h1>{title}</h1>` em locale diferente do padrão (`/en/forgot-password` mostra o badge do dev overlay, `/pt-br/...` não). O handoff atribuiu a `next-themes` e disse que some num reload limpo; não some. | **não corrigido**: **pré-existente**, confirmado com `git stash` e recarga na baseline. Fora do escopo |

Nenhum achado bloqueante.

### Sobre o achado 6

`packages/shared` ganhou peso nesta entrega: `log.ts`, `request-id.ts` e `requestErrorReporter.ts` são
usados pelos três apps. Dar `typecheck` ao pacote exige declarar `@repo/typescript-config` nas dependências
e rodar `pnpm install`, o que reescreve o `pnpm-lock.yaml`.

Ficou fora por três razões. A dívida é anterior a este diff. Um `pnpm-lock.yaml` alterado dentro de um
commit de feature esconde a mudança de quem revisa a PR, e mudança de lockfile merece commit próprio com
aprovação. E o que está de fato descoberto é pequeno: a imunidade a `Error` na assinatura do `logEvent` é
cobrada em todo call site de `apps/api`, `apps/app` e `apps/web`, que typecheckam; o buraco são só os
arquivos de teste do pacote.

Recomendação para uma tarefa separada: `tsconfig.json` estendendo `@repo/typescript-config`, script
`typecheck`, e a dependência declarada. É commit de um arquivo mais o lockfile.

## Correções aplicadas

| arquivo | o que mudou |
|---|---|
| `packages/shared/utils/helpers/requestErrorReporter.ts` | `pathWithoutQuery` corta a query do `path`; `headerValue` lê `x-request-id` do `request.headers` e o campo entra na linha; `ErrorRequest` ganhou `headers` opcional |
| `apps/api/__tests__/instrumentation.test.ts` | duas asserções novas, uma para o identificador na linha e outra para a query descartada |
| `docs/PRE-PRODUCTION.md` | seção 10 com as quatro pendências de infra; nota de que o ciclo não deixou conta de QA |
| `docs/features/firebase-emulator-seed/analyze/plan.md` | link da spec corrigido para `../spec.md` |
| `docs/features/observability-logging/develop/screenshots/` | captura órfã removida |

As correções em `requestErrorReporter.ts` são as únicas que mudam comportamento. O antes e o depois da
linha, medidos no mesmo binário de produção:

```
# antes
[request] failed method=GET path=/probe-request-id?boom=1 routeType=route

# depois
[request] failed method=GET path=/probe-request-id routeType=route requestId=9495587b-5147-4d62-96ac-aa47ac2bab0f
```

Escrevi duas asserções em vez de só apontar a lacuna porque as duas correções são de privacidade e de
correlação: sem gate, a próxima edição do gancho desfaz qualquer uma das duas sem ninguém perceber.

## O que foi medido de novo, sem confiar no handoff

Três afirmações do handoff foram refeitas em **build de produção** (`next build` + `next start -p 3002`),
não em `next dev`. Uma sonda temporária em `app/(routes)/probe-request-id/` serviu de alvo e foi apagada;
`git status` não mostra resíduo.

**1. O handler vê o mesmo identificador que volta no header.** Confirmado. `NextResponse.next({ request:
{ headers } })` repassa o header no build de produção:

| entrada | visto pelo handler | header da resposta |
|---|---|---|
| `x-request-id: FORJADO-PELO-CLIENTE` | `ce5b09ca-f89f-4955-b757-c7d86682e436` | o mesmo |
| sem header | `0cdaa07b-5516-4a0d-a992-e62d8a10209b` | o mesmo |
| duas chamadas seguidas | UUIDs diferentes | idem |

O valor do cliente é sobrescrito, que é o ponto de D5.

**2. Degradado: a mensagem sai idêntica à de hoje.** Confirmado no browser, com a API derrubada. O toast
mostrou exatamente `Um erro inesperado aconteceu`: sem parênteses vazios, sem rótulo órfão, sem `null` nem
`undefined`. A checagem foi feita lendo o texto do DOM, não só olhando a captura.

**3. CORS não quebrou origem nem preflight.** `Retry-After` continua exposto e `x-request-id` entrou ao
lado:

| caminho | resultado |
|---|---|
| `GET` com `Origin: http://localhost:3000` | `200`, `access-control-expose-headers: Retry-After, x-request-id` |
| `OPTIONS` (preflight) | `204`, mesmos cabeçalhos |
| `Origin: https://evil.example` | `403 AUTH_FORBIDDEN_ORIGIN`, sem `Access-Control-Allow-Origin`, com `x-request-id` |
| sem `Origin` (servidor a servidor) | `200`, inalterado |

Ler o header em requisição cross-origin pelo JavaScript da página devolveu o UUID, não `null`. Sem a
entrada em `Access-Control-Expose-Headers` ele viria `null`.

### O laço inteiro, fechado

O que o handoff não tinha provado em runtime: a correlação entre o identificador que o usuário recebe e a
linha que o servidor grava. Um `throw` cross-origin, de `localhost:3000` para `localhost:3002`:

```
browser:  {"status":500,"idSeenByBrowser":"818af80f-fb59-42d6-aa20-ef6743a6ef71"}
servidor: [request] failed method=GET path=/probe-request-id routeType=route requestId=818af80f-fb59-42d6-aa20-ef6743a6ef71
```

Isso só passou a valer depois da correção 2.

### Health e readiness em produção

| estado | rota | resultado |
|---|---|---|
| Firestore alcançável | `/health/ready` | `200 {"data":{"ready":true}}` em 0,45 s |
| `FIRESTORE_EMULATOR_HOST=127.0.0.1:9` | `/health/ready` | `503 {"error":{"code":"HEALTH_DEPENDENCY_UNAVAILABLE"}}` em 2,01 s |
| `FIRESTORE_EMULATOR_HOST=127.0.0.1:9` | `/health` | `200 {"message":"OK"}` em 0,17 s |

O timeout de 2 s fechou a requisição em vez de pendurá-la, e o log trouxe `[request] readiness-failed
reason=timeout`, sem mensagem do driver. O `next build` lista `/health` como `ƒ (Dynamic)`, que é o
`force-dynamic` valendo no build e não só na exportação do módulo.

### Desvios do plano, um a um

1. **`REQUEST_ID_HEADER` em `packages/shared`.** Aceito. O plano se contradizia: a §10.2 punha o módulo em
   `apps/api` e a §10.6 usava o literal `"x-request-id"` dentro de `packages/shared`.
2. **Corpo do `onRequestError` centralizado.** Aceito, e foi o que deixou as duas correções acima valerem
   para os três apps de uma vez. O tipo `Instrumentation.onRequestError` continua sendo aplicado em cada
   app, então a assinatura segue validada por quem importa.
3. **`probeDatabase` limpa o timer no `finally`.** Aceito. O `Promise.race` do plano deixava um timer de
   2 s vivo depois da resposta.
4. **Asserção de tipo virou teste de runtime.** Aceito, com a ressalva do achado 6.
5. **Três asserções de teste existentes atualizadas.** Conferido linha a linha: **nenhum teste foi
   afrouxado**. Em `corsOrigin.test.ts` as duas comparações por igualdade viraram regex **ancoradas** que
   também exigem o formato do UUID, o que é mais estrito que antes. Em `paymentsWebhookRoute.test.ts` a
   string esperada mudou junto com a linha de log, e continua sendo igualdade exata. Nenhum `skip`, nenhum
   `todo`, nenhum `any` a mais.

### O que o handoff declarou não ter provado

| item | veredito |
|---|---|
| Emulador do Firebase não subiu (Java 17, `firebase-tools` exige 21) | **aceitável.** Instalar JDK é provisionamento de infra, fora do que a rodada pode fazer. A sonda é uma leitura de documento inexistente, sem escrita, e o caminho de falha foi exercido com `FIRESTORE_EMULATOR_HOST` apontando para porta morta |
| `ready:true` medido contra o projeto real | **aceitável.** Só leitura, nenhum dado criado |
| Fluxo autenticado do painel não exercido | **aceitável.** O sufixo nasce em `handleClientError`, que é o mesmo ponto para `/forgot-password` e para todo `useXCrud`. Fica como lacuna de teste, não como pendência |
| `apps/web` não foi subido | **resolvido.** Subi na 3001: boot limpo, `/pt-br` responde `200`, nenhum erro de resolução de `@repo/shared` no `instrumentation.ts` |

## Raio de impacto

| mudança de contrato | quem consome | risco |
|---|---|---|
| `FormattedError.requestId` (campo novo) | todo `useXCrud`, `useAccountMutations`, `useFileUpload`, os formulários de `(unauthenticated)`, `apps/app/proxy.ts` | nenhum: é adição, e a composição da mensagem mora em `handleClientError` |
| `handleClientError` passa a sufixar a mensagem | todo alerta de erro dos dois apps | a string muda **só** quando o header existe; sem header é byte a byte a de hoje |
| `EXPOSED_HEADERS` de `"Retry-After"` para `"Retry-After, x-request-id"` | qualquer origem permitida | nenhuma regressão medida: preflight, origem permitida, origem recusada e sem origem conferidos |
| `@repo/shared` exporta 7 símbolos novos pelo barrel | quem importa `@repo/shared/utils` | nenhum: só adição |
| `packages/sdk` | — | não mudou, conforme D8 |

## Validação visual

Feita com `agent-browser`, comandos em sequência. API em build de produção na 3002, `apps/app` em dev na
3000. Todas as portas foram devolvidas no fim.

| fluxo | tema / viewport | resultado |
|---|---|---|
| `/pt-br/forgot-password`, erro `EMAIL_NOT_CONFIGURED` | dark, 1280×720 | sufixo presente, toast legível |
| idem | light, 1280×720 | sufixo presente, contraste ok |
| idem | light, 390×844 | o UUID quebra em duas linhas, sem estourar e sem truncar |
| `/en/forgot-password` | light | rótulo `Error code` |
| `/es/forgot-password` | light | rótulo `Código del error` |
| `/pt-br/forgot-password` com a API derrubada | light | `Um erro inesperado aconteceu`, sem sufixo |

As capturas ficaram em `/tmp` (evidência de revisão, não entra no repo); as do `develop/screenshots/`
mostram os mesmos estados e foram conferidas uma a uma contra o que reproduzi.

Durante essa passagem apareceu o achado 8, o erro de hidratação do `AuthCard` em locale não padrão. É
anterior a este diff: `git stash push -u` e recarga da mesma URL na baseline reproduzem o badge.

## Lacunas de teste para o `/test`

1. Nada cobre o repasse do header pelo proxy até o handler. O unitário testa a resposta do proxy, não a
   requisição que chega à rota. A prova continua sendo manual, e está reproduzida acima.
2. Os cinco call sites de rota que chamam `requestIdFrom(req)` não têm teste do campo `requestId` na linha
   de log.
3. `apps/app` e `apps/web` não têm teste do `onRequestError`. O de `apps/api` cobre o comportamento e os
   três compartilham `reportRequestError`, mas nada garante que os dois arquivos continuem exportando o
   gancho.
4. O sufixo do identificador não foi exercido num fluxo autenticado do painel.
5. `packages/shared/__tests__/` não é typechecado por ninguém (achado 6).

## Decisões em aberto

1. **`typecheck` em `packages/shared`.** Fica para tarefa própria, porque mexe no lockfile. Recomendação:
   abrir logo depois desta PR.
2. **Coletor de erro no `onRequestError`.** Mantida a decisão D1 do plano (só a costura, sem serviço
   gerenciado). Registrada em `docs/PRE-PRODUCTION.md`, seção 10.
3. **Erro de hidratação do `AuthCard` em locale não padrão** (achado 8). Recomendação: virar spec ou
   tarefa de correção, com a causa já localizada no `<h1>{title}</h1>`.
4. **`docs/PRE-PRODUCTION.md` com dois assuntos no mesmo arquivo.** As correções da auditoria e a seção
   nova convivem. Separar exigiria `git add -p`, então vão no mesmo commit.

## Gates

| comando | resultado |
|---|---|
| `pnpm check` | **528 arquivos**, 0 correções |
| `pnpm turbo run lint typecheck test --force` | **23 de 23 tasks**, 0 em cache, **28,9 s** |
| `pnpm --filter api test` | 35 arquivos, **367 testes** (eram 365; as 2 asserções novas) |
| `pnpm --filter app test` | 36 arquivos, 265 testes |
| `pnpm --filter web test` | 4 arquivos, 27 testes |
| `pnpm --filter @repo/shared test` | 3 arquivos, 34 testes |
| `pnpm --filter @repo/internationalization test` | 3 arquivos, 27 testes, `parity.test.ts` incluído |
| `next build` de `apps/api` | sucesso, `/health` e `/health/ready` listados como `ƒ (Dynamic)` |

Nenhuma falha, nenhum teste pulado.

Auditoria de `console.*`: em `apps/api` sobram só `instrumentation.ts:27` (aviso de boot) e
`app/global-error.tsx:15` (componente React), que são as duas exceções declaradas no critério de aceite. Em
`packages/shared` restam os dois do próprio helper (`log.ts:55` e `requestErrorReporter.ts:52`).

Os artefatos em `docs/features/observability-logging/` foram varridos atrás de credencial: nada.

## Plano de commits proposto

Ordem de dependência: `packages/shared` → `apps/api` → `apps/app`/`apps/web` →
`packages/internationalization`, e depois os três assuntos de documentação.

| # | mensagem | arquivos |
|---|---|---|
| 1 | `feat(shared): add a structured log helper with a privacy test` | `packages/shared/utils/helpers/log.ts` · `packages/shared/__tests__/log.test.ts` |
| 2 | `feat(shared): expose the request id on FormattedError and in the error message` | `packages/shared/utils/helpers/request-id.ts` · `packages/shared/utils/helpers/formattedError.ts` · `packages/shared/utils/helpers/handleClientError.ts` · `packages/shared/__tests__/formattedErrorRequestId.test.ts` |
| 3 | `feat(shared): report unhandled request errors through the structured logger` | `packages/shared/utils/helpers/requestErrorReporter.ts` · `packages/shared/utils/helpers/index.ts` |
| 4 | `feat(api): stamp a request id on every response and forward it to handlers` | `apps/api/proxy.ts` · `apps/api/(shared)/lib/cors.ts` · `apps/api/__tests__/requestId.test.ts` · `apps/api/__tests__/corsOrigin.test.ts` |
| 5 | `feat(api): report unhandled errors through the structured logger` | `apps/api/instrumentation.ts` · `apps/api/__tests__/instrumentation.test.ts` |
| 6 | `feat(api): add a readiness probe and pin health to dynamic rendering` | `apps/api/(shared)/lib/readiness.ts` · `apps/api/app/(routes)/health/ready/route.ts` · `apps/api/app/(routes)/health/route.ts` · `apps/api/__tests__/healthReady.test.ts` · `apps/api/__tests__/health.test.ts` |
| 7 | `refactor(api): route every deliberate log through the shared helper` | `apps/api/(shared)/lib/storage.ts` · `apps/api/(shared)/lib/entity-photo.ts` · `apps/api/(shared)/lib/account-avatar.ts` · `apps/api/(shared)/lib/auth-action-links.ts` · `apps/api/app/(routes)/auth/sign-up/route.ts` · `apps/api/app/(routes)/auth/password/reset/route.ts` · `apps/api/app/(routes)/auth/password/reset-request/route.ts` · `apps/api/app/(routes)/users/route.ts` · `apps/api/app/(routes)/webhooks/payments/route.ts` · `apps/api/__tests__/paymentsWebhookRoute.test.ts` |
| 8 | `feat(app): report unhandled errors through the structured logger` | `apps/app/instrumentation.ts` |
| 9 | `feat(web): report unhandled errors through the structured logger` | `apps/web/instrumentation.ts` |
| 10 | `feat(internationalization): add the readiness error code and the request id label` | `packages/internationalization/translations/packages/shared/utils.ts` |
| 11 | `docs(specs): reconcile the backlog with the delivered code` | `specs/BACKLOG.md` · `specs/account-security-mfa.md` · `specs/audit-log.md` · `specs/billing-subscription.md` · `specs/cookie-consent.md` · `specs/cursor-pagination.md` · `specs/dashboard-home.md` · `specs/data-rights-lgpd.md` · `specs/e2e-testing.md` · `specs/observability-logging.md` · `specs/onboarding-flow.md` · `specs/teams-organizations.md` · `specs/firebase-emulator-seed.md` → `docs/features/firebase-emulator-seed/spec.md` · `docs/features/firebase-emulator-seed/analyze/plan.md` |
| 12 | `docs: record the observability follow-ups and refresh the pre-production audit` | `docs/PRE-PRODUCTION.md` |
| 13 | `docs(features): observability-logging` | `docs/features/observability-logging/` (pasta inteira) |

Notas sobre a granularidade:

- O commit 3 leva o `index.ts` junto porque as três linhas de `export` são adjacentes no mesmo arquivo.
  Separá-las exigiria `git add -p`, e pôr o barril no commit 1 exportaria símbolos que ainda não existem.
  Os commits 1 e 2 compilam sem o barril, porque `apps/api` importa os módulos pelo caminho direto.
- O commit 4 leva `corsOrigin.test.ts` porque as asserções mudaram por causa da linha de log do
  `proxy.ts`, e não por causa do CORS.
- O commit 11 leva `docs/features/firebase-emulator-seed/analyze/plan.md` porque o link só quebrou por
  causa do `git mv` desse mesmo commit.
- O commit 12 junta as correções da auditoria e a seção nova das pendências de observabilidade. São dois
  assuntos, mas o mesmo arquivo; isolar exigiria `git add -p`.
- O commit 13 é o último, e a pasta entra inteira.

Título de PR sugerido: `feat: structured logging, request id and readiness probe`.

Depois do último commit aprovado, o `/review` deve **perguntar** se sincroniza com
`git push -u origin feat/observability-logging`. Nenhum push foi feito aqui.

### Commits realizados

_(preenchido pelo orquestrador depois de commitar)_
