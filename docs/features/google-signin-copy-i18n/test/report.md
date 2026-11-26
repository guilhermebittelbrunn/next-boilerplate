# Relatório de QA: textos fixos em inglês no login com Google da app

Branch: `guilhermebittelbrunn/claude-cycle-full-pipeline` (não protegida). Rodada do `/cycle`, sem commit.

Escopo: `apps/app/shared/lib/googleSignInApi.ts` e os testes dele. Sem browser: o diff não muda layout nem
fluxo visível, e os dois ramos só disparam com resposta malformada do Google ou da API. O plano (§8) e o
review ("Verificar no `/test`") descartam o percurso no browser pelo mesmo motivo, e eu concordo: forçar o
ramo pela UI exigiria adulterar código ou interceptar a rede.

## Cobertura

| Comando | Resultado |
|---------|-----------|
| `pnpm exec vitest run __tests__/googleSignInApi.test.ts` (em `apps/app`) | 18 passed |
| O mesmo, com `googleSignInApi.ts` do `HEAD` no lugar | 7 failed, 11 passed |
| `pnpm exec vitest run __tests__/googleSignInApiUrlLocale.test.tsx` (novo) | 4 passed |
| O mesmo, com `googleSignInApi.ts` do `HEAD` no lugar | 4 failed |
| O mesmo, numa cópia temporária sem renderizar o `LocaleProvider` | 4 failed (recebeu a copy em en, do cookie) |
| `pnpm exec biome check apps/app/__tests__/googleSignInApiUrlLocale.test.tsx` | sem ajuste |
| `pnpm --filter app typecheck` | exit 0 |
| `pnpm --filter app test` | 155 arquivos, 1389 testes, todos passando |
| `pnpm test` (raiz, com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | exit 0, 15 de 15 tasks, 13 do cache |

No `pnpm test` da raiz só `app:test` e `api:test:emulator` executaram; o resto veio do cache do turbo, sem
`--force`. Por workspace: app 1389, api 1880, api `test:emulator` 280, web 315, auth 201, email 209,
design-system 173, internationalization 67, security 65, shared 63, analytics 41, next-config 39,
payments 19, sdk 15. Nenhum `Timeout starting forks runner`.

Prova de reprovação: salvei o arquivo do working tree no scratchpad, troquei pelo do `HEAD`, rodei, restaurei
e conferi com `cmp` (idêntico). Os 7 que falham com o `HEAD` são os 6 casos do `it.each` (popup sem ID token
e API sem `session.idToken`, nos 3 idiomas) e o caso do `signOut` que rejeita. Bate com o handoff.

Paridade de i18n: não rodei isolada, porque nenhuma chave mudou; o `@repo/internationalization:test` passou
no `pnpm test` da raiz (cache).

## Teste criado

`apps/app/__tests__/googleSignInApiUrlLocale.test.tsx`, 4 casos. Renderiza o `LocaleProvider` com
`useParams` mockado em pt-br ou es, deixa o cookie `x-locale` em en e dispara os dois ramos (popup sem
`idToken`, API sem `session.idToken`). Esperado e medido: a copy do idioma da URL.

Ficou num arquivo próprio porque o `LocaleProvider` grava o locale em estado de módulo
(`lastRenderedBrowserLocale`) que não é limpo entre testes. No arquivo existente, esse estado passaria a
mandar nos casos que fixam o idioma pelo cookie.

## Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| Popup do Google sem ID token mostra a copy traduzida | PASS | unit (`googleSignInApi.test.ts`, 3 idiomas) |
| Resposta da API sem `session.idToken` mostra a copy traduzida | PASS | unit (3 idiomas + caso do `signOut` que falha) |
| O idioma da copy segue a URL, não só o cookie | PASS | unit (`googleSignInApiUrlLocale.test.tsx`) |
| Nenhum texto fixo em inglês sobra no arquivo | PASS | `grep` sem ocorrência dos dois textos; os 11 testes antigos passam sem alteração |
| O alerta de `SignInForm`/`SignUpFormClient` exibe a copy traduzida | não coberto | leitura de código (`formattedError.ts:52`) |

## Decisões de custo de teste

Tudo na faixa barata. O arquivo tocado é um helper de cliente com as bordas (`firebase/auth`,
`@repo/auth/client`, `@/shared/lib/client`, `fetch`) mockadas. Nenhum comportamento de infra está em jogo,
então não há teste com emulador. O emulador de Auth devolveria credencial com `idToken`, ou seja, nem
alcançaria os ramos.

## Verificar no `/test`

1. "Rodar `pnpm --filter app test` e `pnpm test` da raiz; esperado 18 de 18 em `googleSignInApi.test.ts` e a
   suíte da app inteira passando." **Confirmado**: 18/18, app 1389/1389 (155 arquivos, um a mais que o
   handoff por causa do teste novo), raiz exit 0.

## Lacunas

- Nit do review (os testes fixam o idioma pelo cookie, não pelo `LocaleProvider` da URL): **fechada** pelo
  teste novo.
- Nenhum teste de componente prova que `SignInForm` e `SignUpFormClient` mostram `error.message` de um `Error`
  simples no `errorAlert`: **continua aberta**, fora do escopo. O comportamento é anterior à tarefa, e
  reproduzir pela UI exige adulterar a resposta.

## Ambiente do e2e

Não subi app, API nem browser. O `pnpm test` da raiz subiu os emuladores pelo próprio `test:emulator`.
Antes e depois, as portas 8080, 9099, 9199, 4001, 4400 e 4500 estavam livres. Carga do host antes da raiz:
load average de 1 minuto em 16,21.

## Estado de dev alterado

Nenhum. Nenhuma conta criada, nenhum dado em projeto real.

## Gate anterior

O `STATE.md` mostrava `review` em `in-progress` quando esta etapa começou. Como a rodada é do `/cycle` e os
commits ainda não existem, o gate aberto é esperado: o orquestrador fecha o `review` quando commitar.
