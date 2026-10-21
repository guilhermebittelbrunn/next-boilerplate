# Relatório de QA: web-global-error

Rodada autônoma do `/cycle`. Branch `guilhermebittelbrunn/cycle-command-v7` (não protegida). Não criei branch nem
commit e não criei teste novo. Resultado: os 8 critérios passaram, sem defeito de produção. Os 6 itens de "Verificar
no `/test`" foram medidos em build de produção, e a linha de base (tela embutida) também.

## Interrupção e retomada

A primeira execução foi cortada por limite de sessão depois das medições com `curl` e dos cliques, e antes de derrubar
o servidor. Ao retomar, o orquestrador matou o `next start -p 3001` que ficou de pé (PIDs 47765/47766) e reverteu o
`throw` temporário de `apps/web/app/[locale]/layout.tsx` com `git checkout --`. O arquivo não faz parte do diff, então
o `checkout` não descartou trabalho. Conferi o hash do layout depois da retomada: igual ao do início (`85c5e96f`).

Na retomada reinseri o `throw`, refiz o build, capturei de novo o tema escuro e os 375 px e medi a linha de base. Na
primeira execução eu tinha usado `agent-browser media` e `agent-browser viewport`, que não existem; o certo é
`agent-browser set media dark` e `set viewport 375 812`. As três capturas antigas tinham saído em 1280 px e foram
apagadas. No fim removi o `throw`, rodei um build limpo e o `pnpm test` da raiz.

## Cobertura

| Comando | Resultado |
|---|---|
| `pnpm --filter web test` | 24 arquivos, 189 testes passados (inclui `globalErrorLocale.test.tsx`, 5 casos, e o `signInSchema.test.ts` da tarefa irmã) |
| `pnpm --filter web typecheck` | exit 0 |
| `pnpm test` (raiz, `JAVA_HOME=/opt/homebrew/opt/openjdk@21`), antes do e2e | exit 0, 15/15 tarefas, 13 do cache. `web` 189, `app` 975, `api` 1455, `api:test:emulator` 207, `@repo/internationalization` 67, `e2e` 16, `shared` 56, `security` 45, `payments` 22, `next-config` 32, `auth` 132, `email` 205, `design-system` 171, `sdk` 11, `analytics` 34 |
| `pnpm test` (raiz), depois da limpeza | exit 0, 15/15 tarefas, 14 do cache, mesmos números (`web` 189, `api:test:emulator` 207) |
| `pnpm --filter web build` com o `throw` (duas vezes) | `Compiled successfully`, `Generating static pages (8/8)`, `_global-error.html/.meta/.rsc/.segments` gerados; 9 arquivos em `.next/server/app` citam `apps/web/app/global-error.tsx`, 0 citam `[locale]/global-error` |
| `pnpm --filter web build` limpo, no fim | exit 0, mesmos 9 manifests, nenhuma ocorrência de `global-error probe` em `.next/server` |

Sem `--force`. Não rodei `pnpm check` nem a paridade de i18n à parte: o `/test` não mexeu em código, e esta tarefa não
toca em chave de tradução. Vale a medição do `/review` (`pnpm check`, 969 arquivos sem correção), e a paridade (67
testes) rodou dentro do `pnpm test` da raiz.

## Critérios de aceite

| Critério | Status | Meio |
|---|---|---|
| A landing usa a própria tela de erro global | ✅ | e2e em build de produção + linha de base + T1 (o import fixa o lugar do arquivo) |
| Título e botão no idioma da URL | ✅ | e2e (3 idiomas, `/` sem cookie, cookie antigo de outro idioma) + T1 |
| `lang` do documento | ✅ | e2e + T1 |
| O botão tenta de novo | ✅ | e2e (cliques, console, rede) |
| Nenhum detalhe do erro na tela | ✅ | e2e + linha de base + T1 (`never prints the error details`) |
| A resposta continua sendo um erro | ✅ | `curl` |
| Build e gates | ✅ | comandos |
| Tema e tamanho de tela (observação) | ✅ | e2e |

Texto completo de cada critério em `test/criterios-aceite.md`.

## Verificar no `/test`

| # | Item do `review.md` | Veredito |
|---|---|---|
| 1 | Build sem `app/layout.tsx` na raiz gera `/_global-error` | **Confirmado.** Três builds com exit 0 e os quatro arquivos `_global-error.*`. O `/_global-error` não aparece na tabela de rotas do log, mas os artefatos existem. |
| 2 | A tela com o layout quebrado é a da web, sem "Application error" | **Confirmado.** Em `/pt-br`, `/en` e `/es`, `document.body.innerText` contém só o título e o botão; "Application error" não aparece. Na linha de base, a mesma URL mostra o `<h2>` "Application error: a server-side exception has occurred while loading localhost (see the server logs for more information)." e "Digest: 3765487808", sem botão e com `lang` vazio. |
| 3 | `lang`, `<h1>`, botão e status por idioma | **Confirmado.** Status 500 nos três. `pt-br`: `lang="pt-br"`, "Ops, algo deu errado", "Tentar novamente". `en`: `lang="en"`, "Oops, something went wrong", "Try again". `es`: `lang="es"`, "Ups, algo salió mal", "Intentar de nuevo". |
| 4 | `/` sem cookie | **Confirmado.** `curl`: `307`, `location: /pt-br/`, `set-cookie: x-locale=pt-br; Path=/`. No navegador, com os cookies apagados: URL final `/pt-br`, `document.cookie` `x-locale=pt-br`, `lang="pt-br"`, texto em português. |
| 5 | Clique em `reset()` sem erro novo no console | **Confirmado, com ressalva de leitura.** Sem clicar, o console fica vazio depois de limpo. Cada clique registra uma vez o mesmo erro do servidor (`digest: "3765487808"`, "An error occurred in the Server Components render"): é o `reset()` refazendo a árvore e o layout quebrando de novo. Nenhum erro de outro tipo, `agent-browser errors` vazio e nenhuma requisição de rede no clique (a captura de rede funciona: 22 requisições na carga de `/en`). A tela continua igual depois de 1, 2 e 3 cliques, nos três idiomas. |
| 6 | Nem mensagem nem `digest` na tela | **Confirmado.** O texto visível não contém "probe", "digest" nem o número. O `digest` está no payload RSC dentro de um `<script>` do HTML e no console, como em qualquer erro de Server Component no Next. A mensagem `global-error probe` não aparece no HTML; aparece só no log do servidor. |

## Evidências e2e

Build de produção com `throw new Error("global-error probe")` logo depois do `Promise.all` de
`apps/web/app/[locale]/layout.tsx`, servido por `pnpm exec next start -p 3001` dentro de `apps/web`. Navegador:
`agent-browser` 0.27.0, sessão `wge`, comandos em sequência.

- `curl` em `/pt-br`, `/en` e `/es`: `HTTP/1.1 500`, `Content-Type: text/html; charset=utf-8`,
  `set-cookie: x-locale=<idioma>; Path=/`, casca `<html id="__next_error__">`. "Application error" aparece 0 vezes no
  HTML.
- Árvore de acessibilidade em cada idioma: um `heading` de nível 1 e um `button`, mais nada.
- Cookie antigo: com `x-locale=en` gravado antes, a visita a `/es` sai com `document.cookie` `x-locale=es`,
  `lang="es"` e "Ups, algo salió mal".
- Escuro (`set media dark`, `/en`, 1280 px): `prefers-color-scheme: dark` verdadeiro, fundo do `body`
  `rgba(0, 0, 0, 0)` sobre branco, texto `rgb(0, 0, 0)`, título em `Times`, botão `rgb(239, 239, 239)` (nativo). Mesma
  aparência do claro, legível.
- 375 px (`set viewport 375 812`): `/es` escuro e `/pt-br` claro com `innerWidth` 375 e `scrollWidth` 375, sem rolagem
  horizontal.
- Log do servidor: `⨯ Error: global-error probe` com `digest: '3765487808'`.

Capturas de apoio em `test/e2e/` (descartadas pelo `.gitignore`): `00-linha-de-base-en.png`,
`01-pt-br-light-desktop.png`, `02-en-light-desktop.png`, `03-es-light-desktop.png`, `04-root-sem-cookie.png`,
`05-en-dark-desktop.png`, `06-es-dark-375.png`, `07-pt-br-light-375.png`. Nenhuma tem dado de pessoa.

### Linha de base

O build leva 11 s, então medi em vez de só citar a §1.2 do plano. Com o `throw` ainda no layout, movi
`apps/web/app/global-error.tsx` de volta para `apps/web/app/[locale]/global-error.tsx`, rodei o build e devolvi o
arquivo ao lugar, com `trap` de restauração. O build da linha de base tinha 0 manifests citando o caminho novo e 24
citando `[locale]/global-error`. Em `/en`: status 500, `lang` vazio, nenhum `<h1>`, nenhum botão, e o texto visível
"Application error: a server-side exception has occurred while loading localhost (see the server logs for more
information)." seguido de "Digest: 3765487808". O arquivo voltou ao lugar com o mesmo hash (`6548b6a5`). A linha de
base usou a versão nova do componente, não a antiga; o que a medição isola é o lugar do arquivo.

## Decisões de custo de teste

Não criei teste. O T1 (`apps/web/__tests__/globalErrorLocale.test.tsx`, 5 casos) já cobre idioma, `lang`, fallback sem
cookie, ausência da mensagem do erro e, pelo `await import("@/app/global-error")`, o lugar do arquivo. O que falta nele
(qual `GlobalError` o build escolhe, o clique no `reset()`) só se prova em build de produção com navegador, e a passada
acima mediu. Um teste de clique com `@testing-library` provaria só que o `onClick` chama a função recebida, e esse
trecho não mudou neste diff.

## Lacunas

| Lacuna (herdada do handoff e do review) | Veredito |
|---|---|
| Clique no botão (`reset()`) sem teste de componente | **Fechada no e2e**, continua sem teste automatizado. Não vale um teste novo: o `onClick` não mudou. |
| Root layout quebrando numa troca de idioma no cliente (R1) | **Fora de escopo**, pelo plano. Não medi. |
| `digest` fora da tela sem teste de componente | **Fechada no e2e**, com a linha de base mostrando o `digest` na tela antiga e ausente na nova. |

## Observações (não são defeito desta tarefa)

- `pnpm --filter web start` sobe na porta 3000, não na 3001: o script é `next start`, sem `-p`
  (`apps/web/package.json:7`). O repro do `review.md` e da §8 do plano diz 3001. Usei
  `pnpm exec next start -p 3001` em `apps/web`. Quem seguir o repro ao pé da letra vai ter a web ocupando a porta da
  `app`. Sugestão para um próximo ciclo: `next start -p 3001` no script, como já faz o `dev`.
- O `reset()` da tela global não faz nova requisição ao servidor: só refaz a árvore com o payload que já tem. Se a
  causa do erro sumir no servidor, o botão não basta e a pessoa precisa recarregar a página. É o comportamento do Next,
  não do componente.
- Estilo e tema da tela de erro seguem fora de escopo (§1.4 do plano). A tela é legível, mas não segue o tema escuro
  nem o design da landing.

## Ambiente do e2e

| Serviço | Origem | Situação no fim |
|---|---|---|
| web `next start -p 3001`, primeira execução (PIDs 47765/47766) | subi | derrubado pelo orquestrador na retomada |
| web `next start` sem `-p` (PIDs 47173/47179/47190, porta 3000) | subi por engano | derrubado por PID por mim, na hora |
| web `next start -p 3001` com o `throw` (PIDs 22510/22525) | subi | derrubado por PID |
| web `next start -p 3001` da linha de base (PIDs 23548/23555) | subi | derrubado por PID |
| navegador `agent-browser` (sessão `wge`) | subi | `agent-browser --session wge close` |
| emuladores do `pnpm test` | o próprio `test:emulator` sobe e derruba | livres no fim |

Nada foi reaproveitado do usuário: as portas 3000, 3001, 3002, 3003, 8080, 9099, 9199 e 4001 estavam livres no início
e estão livres no fim (`lsof -ti tcp:<porta> -sTCP:LISTEN` vazio em todas).

## Estado do working tree

- `apps/web/app/[locale]/layout.tsx`: sem diff (`git diff --stat` vazio), hash igual ao do início.
- `apps/web/app/global-error.tsx`: hash igual ao de antes da linha de base.
- `git status --short` igual ao do início; a única novidade é a pasta `test/` desta feature.
- `apps/web/.next` (gitignored) ficou com o build limpo, sem o `throw`.

Nenhum dado criado: sem conta, sem documento no Firestore, sem projeto Firebase real. Nenhuma credencial usada.
