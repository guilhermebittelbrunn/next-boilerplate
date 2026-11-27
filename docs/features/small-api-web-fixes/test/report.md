# Relatório de QA: lote de correções pequenas (web, auth, e2e, scripts de start)

Rodada autônoma do `/cycle`, sem o usuário acompanhando. Branch `feat/audit-log-levels`, não protegida; nenhuma
branch criada ou trocada, nada commitado, índice intocado (continua só com os dois `git mv` de `specs/` de outra
tarefa). Escopo: os itens 2, 3, 5 e 6 do `develop/handoff.md`.

**Resultado: aprovado.** Os 12 critérios passaram. Um teste do lote falhava sob carga e foi reescrito (seção
"Teste corrigido"). Nenhum defeito de produção.

## Teste corrigido: `apps/web/__tests__/signInForgotPassword.test.tsx`

Nas duas primeiras execuções do `pnpm test` da raiz, os três casos `points at the app's password recovery in
{pt-br,en,es}` estouraram o `testTimeout` de 20 s da web (22,2 s, 20,3 s e 50,3 s na primeira; 22,6 s, 20,2 s e
36,5 s na segunda). Isolado, o arquivo passava em 4,3 s. `uptime` durante as execuções: load average de 8,00 no
início a 44,49 no fim da primeira, e de 28,86 a 46,09 na segunda. A carga vinha de processos do sistema
(`com.apple.WebKit.GPU` a 220 % de CPU), não da suíte.

A causa não era só a carga. O arquivo chamava `vi.resetModules()` em `beforeEach` e importava o formulário e o
`LocaleProvider` dentro de cada teste, para o `vi.stubEnv` valer no `@/env`. Assim, cada caso pagava de novo a
avaliação do formulário, do design system e do dicionário dentro do orçamento de tempo do teste. O vizinho
`signInFormRedirect.test.tsx` importa uma vez no topo, e essa carga cai na fase de coleta, fora do timeout.

Correção, só no arquivo de teste: `@/env` passa a ser um mock com objeto mutável (`envMock`, o padrão de
`pricingPage.test.tsx` e `headerInteractiveNesting.test.tsx`), o import acontece uma vez no topo e o
`resetModules` saiu. O timeout não mudou. Isolado, o arquivo caiu de 4,3 s para 0,45 s. Os mutantes que o
`/develop` usou continuam reprovando:

| mutação no componente | resultado |
|-----------------------|-----------|
| não remove a barra final da `NEXT_PUBLIC_APP_URL` | 3 de 4 falham |
| link renderizado sem depender da env | 1 de 4 falha (o caso de env vazia) |

O componente foi restaurado byte a byte depois das mutações (`cmp` contra a cópia guardada fora do repo).

O teste mockado não exercita mais o `|| undefined` de `apps/web/env.ts:32`. Isso não abre lacuna: o componente
testa a variável por valor verdadeiro, então `""` esconde o link de qualquer forma, e a passada no navegador
com `NEXT_PUBLIC_APP_URL=""` confirmou isso.

## Cobertura e gates

| gate | comando | resultado |
|------|---------|-----------|
| suíte da raiz (com `test:emulator`) | `JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=…:$PATH pnpm test` | 4ª execução: 15/15 tasks, 11 do cache, 2 min 7 s |
| ↳ web | (dentro do acima) | 319/319, 36 arquivos |
| ↳ app | | 1403/1403, 154 arquivos |
| ↳ api | | 1966/1966, 135 arquivos |
| ↳ api `test:emulator` | | 284/284, 12 arquivos |
| ↳ `@repo/auth` (guard) | | 216/216, 16 arquivos |
| ↳ e2e (Vitest, `regExp.test.ts`) | | 41/41, 4 arquivos |
| ↳ paridade de i18n | `@repo/internationalization` | 67/67, 7 arquivos |
| typecheck da web | `pnpm turbo run typecheck --filter=web` | 1/1 |
| lint | `pnpm check` | 1170 arquivos, nenhuma correção |
| E2E Playwright | `pnpm e2e` (JDK 21) | 45/45 em 5,7 min |

Histórico das quatro execuções do `pnpm test`, todas sem `--force`:

1. Load 8,00 → 44,49. Web: os 3 timeouts acima; app: `securityPolicySources.test.ts` estourou 20 s num caso
   (passa isolado: 29/29). A falha da web cancelou o resto.
2. Load 28,86 → 46,09. Os mesmos 3 timeouts da web.
3. Depois da correção do teste. Load 20,97 → 54,82. Web 319/319, mas o Vitest registrou
   `[vitest-pool]: Timeout starting forks runner` e saiu com erro. É carga, não teste.
4. Load 50,75 → 69,20. Verde.

O typecheck dos outros workspaces não foi medido de novo: o `/review` mediu 5/5 e esta etapa só mexeu num
arquivo de teste da web.

## Critérios de aceite com status

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | Link aparece no login da landing nos 3 idiomas | ✅ PASS | e2e (`agent-browser`) + componente |
| 2 | Link leva à recuperação de senha da app, no mesmo idioma | ✅ PASS | e2e |
| 3 | Sem `NEXT_PUBLIC_APP_URL`, o link some e a tela não muda | ✅ PASS | e2e + componente |
| 4 | Layout e contraste em light, dark e mobile | ✅ PASS | e2e (medição computada) |
| 5 | Destino com `%26` sobrevive ao login | ✅ PASS | e2e; `%25` por unidade |
| 6 | Deep link comum chega ao destino exato | ✅ PASS | e2e |
| 7 | Open redirect continua recusado | ✅ PASS | unidade (`postAuthRedirectTarget.test.ts`) |
| 8 | `%2F%2F` vindo do onboarding nunca sai da origem | ✅ PASS | e2e |
| 9 | Teste do guard roda no pacote dono | ✅ PASS | `@repo/auth` 216/216; arquivo antigo ausente |
| 10 | E2E usa um `escapeRegExp` só | ✅ PASS | unidade 41/41 + `pnpm e2e` 45/45 |
| 11 | `start` da web e da api na porta certa, `PORT` vence | ✅ PASS | execução + `curl` |
| 12 | Gates verdes | ✅ PASS | ver tabela acima |

## Verificar no `/test` (lista do `review.md`)

1. **Item 6, app respondendo na porta: confirmado.** Build de produção da web e da api, depois `start` com e sem
   `PORT`. Os quatro resultados estão em "Evidências". O build de produção, que é caro, se justifica aqui: o
   objeto do teste é a porta em que o processo do `start` atende, e isso só existe com build.
2. **Item 2 no navegador: confirmado.** Detalhes em "Evidências".
3. **Item 3 no fluxo: confirmado.** `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling` terminou em
   `http://localhost:3000/pt-br/account?tab=billing`, aba "Minha conta | next-boilerplate".
   `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities%3Fq%3Da%2526b` terminou em
   `http://localhost:3000/pt-br/entities?q=a%26b`. A query tem uma chave só (`q`), com valor `a&b`; antes da
   correção, o destino virava `q=a&b`, com o `b` como parâmetro separado.
4. **Item 3, forma codificada no header: confirmado na propriedade de segurança. O repro do review estava
   parcialmente errado.**
   - `/pt-br/%2F%2Fevil.com` com onboarding pendente **não** passa pelo onboarding: a app responde direto
     "Página não encontrada", em `http://localhost:3000/pt-br/%2F%2Fevil.com`. O caminho termina em `.com`, que
     o `isStaticAssetPath` do proxy (`apps/app/proxy.ts:143-145`) lê como arquivo estático, e não há rota para
     esse segmento. Mesma origem, sem saída.
   - O header `x-app-path` com `%2F%2F` foi medido numa rota que existe: `/pt-br/entities/edit/%2F%2Fx` levou a
     `/pt-br/onboarding?redirect=%2Fpt-br%2Fentities%2Fedit%2F%252F%252Fx`. O `%2F` chega literal ao destino,
     como a análise do review previa. Controles: `a%2Fb` → `a%252Fb`, `%2Fx` → `%252Fx`.
   - Fim do ciclo, com o destino exato do review: abrir `/pt-br/onboarding?redirect=%2Fpt-br%2F%252F%252Fevil.com`
     e concluir os dois passos do onboarding levou a `http://localhost:3000/pt-br/%2F%2Fevil.com`, com
     `location.origin` igual a `http://localhost:3000` e a tela de 404 da app. Nunca `evil.com`.
5. **Item 5: confirmado.** `pnpm e2e` rodou nesta máquina (JDK 21, Chromium do Playwright 1243) e passou 45/45,
   incluindo `landing`, `signIn`, `entityCrud` e `panelSwitch`, os quatro specs que passaram a usar o helper.

## Evidências e2e

Stack próprio, montado com o mesmo ambiente da suíte Playwright (`buildStackEnv` de
`apps/e2e/support/stackEnv.ts`, exportado para variáveis de processo; nenhum `.env` criado): emuladores de Auth,
Firestore e Storage do projeto `demo-next-boilerplate`, seed padrão, `next dev` da api (3002), da app (3000) e da
web (3001).

**Landing com `NEXT_PUBLIC_APP_URL="http://localhost:3000/"`** (barra final de propósito):

| idioma | rótulo do link | `href` |
|--------|----------------|--------|
| pt-br | `Esqueci minha senha` | `http://localhost:3000/pt-br/forgot-password` |
| en | `Forgot your password?` | `http://localhost:3000/en/forgot-password` |
| es | `¿Olvidaste tu contraseña?` | `http://localhost:3000/es/forgot-password` |

- A barra final da variável não gerou `//` no `href`.
- Ordem no bloco: o link fica no topo (y = 646 px) e "Não tem uma conta? Cadastrar" logo abaixo (y = 674 px). O
  mesmo vale nos 3 idiomas, em desktop (1280 px) e mobile (390 px).
- Contraste medido sobre as cores computadas (texto contra o primeiro fundo opaco): light `rgb(23,23,23)` sobre
  `rgb(255,255,255)`, 17,93:1; dark `rgb(250,250,250)` sobre `rgb(10,10,10)`, 18,97:1. O link de cadastro tem
  os mesmos valores.
- Mobile 390 px, light e dark: `scrollWidth` de 375 px (a largura menos a barra de rolagem), sem estouro
  horizontal. O link ocupa 170 × 16 px no maior rótulo (es).
- Clique em `¿Olvidaste tu contraseña?` na landing abriu `http://localhost:3000/es/forgot-password`, com título
  "Olvidé mi contraseña", campo Email, botão "Enviar enlace" e link "Volver al inicio de sesión". A sessão estava
  vazia e a app não redirecionou para o login.

**Landing com `NEXT_PUBLIC_APP_URL=""`** (web reiniciada, sessão limpa):

- `/pt-br`, `/en` e `/es/sign-in`: zero links para `forgot-password`. O bloco de baixo tem só
  "Não tem uma conta? Cadastrar", "Don't have an account? Sign Up" e "¿No tienes una cuenta? Registrarse", com o
  link de cadastro em `/{locale}/sign-up` e o botão do Google no lugar. Mobile dark 390 px: mesmo resultado, sem
  estouro.

**Item 6, porta do `start`** (build de produção da web e da api; um processo por vez, PID guardado e derrubado
antes do seguinte):

| comando | `Local:` impresso | `curl` | portas em escuta |
|---------|-------------------|--------|------------------|
| `pnpm --filter web start` (sem `PORT`) | `http://localhost:3001` | `/pt-br` → 200 | só `*:3001` |
| `PORT=3105 pnpm --filter web start` | `http://localhost:3105` | `/pt-br` → 200 | só `*:3105` |
| `pnpm --filter api start` (sem `PORT`) | `http://localhost:3002` | `/health` → 200 `{"message":"OK"}` | só `*:3002` |
| `PORT=3105 pnpm --filter api start` | `http://localhost:3105` | `/health` → 200 `{"message":"OK"}` | só `*:3105` |

Nenhum dos quatro abriu a 3000.

Observação de ambiente, fora do escopo: o `next build` da api recusa `FIREBASE_ADMIN_CLIENT_EMAIL` e
`FIREBASE_ADMIN_PRIVATE_KEY` vazios mesmo com o emulador configurado (`apps/api/env.ts:16`, obrigatórios fora de
`development`). Para o build, passei valores falsos só no processo (`demo-next-boilerplate`, um e-mail
`@demo-next-boilerplate.iam.gserviceaccount.com` e a chave `not-a-real-key`). Nada foi gravado em arquivo. A
`/health` não toca o Firebase.

Screenshots de apoio em `test/e2e/` (`01` a `10`), descartados pelo `.gitignore`. O texto acima é a prova.

## Decisões de custo de teste

| módulo | decisão |
|--------|---------|
| `packages/auth/redirect.ts` | unidade basta: 216/216 no pacote, incluindo os casos `%2F`, `%5C`, `%09` e `..%2F` do review. Fluxo real confirmado no navegador, sem teste novo. |
| `sign-in-form-client.tsx` | componente (jsdom) basta; reescrito para não pagar import por caso. Layout e tema no navegador. |
| `apps/e2e/support/regExp.ts` | unidade (`regExp.test.ts`) + a própria suíte E2E. |
| scripts `start` | sem teste automatizado: um teste que leia o `package.json` só repetiria a string. A prova é a execução acima. |

Nenhum teste da faixa cara foi criado.

## Ambiente do e2e

- Todas as portas (3000, 3001, 3002, 3105, 9099, 8080, 9199, 4001, 4400, 4500, 9150) estavam livres no início.
  Nada do usuário foi reutilizado.
- `pnpm e2e`: o Playwright subiu e derrubou o próprio stack; as portas estavam livres depois.
- Stack próprio: emuladores (PID 14337, filhos 14360 e 14429), api (14476), app (14478), web (14480; depois
  16586 com a env vazia). Derrubados por PID; os filhos `next-server` presos às portas que eu abri (14514,
  14515, 16610) e o `firebase` (14360, com SIGINT) foram mortos por PID. Conferência final com `lsof`: as 11
  portas vazias.
- `start` de produção: quatro processos, cada um morto antes do seguinte; 3000, 3001, 3002 e 3105 vazias no fim.
- Nenhum `.env` criado. O ambiente ficou em variáveis de processo, geradas em arquivos do scratchpad da sessão,
  fora do repositório.

## Estado de dev alterado

- Dados: só no emulador, que morreu com o processo. Conta criada pela UI: `qa-small-fixes@example.com`
  (cadastro, onboarding concluído com o nome "QA Small Fixes"). Conta do seed usada: `user@example.com`, com a
  senha pública do seed documentada em `docs/SETUP.md`. Nenhuma conta em projeto Firebase real, então o
  `docs/PRE-PRODUCTION.md` não muda. A senha da conta de QA existiu só no emulador e não foi gravada.
- `apps/web/.next` e `apps/api/.next` agora têm o build de produção desta rodada (ignorados pelo git). O build da
  web foi feito com `NEXT_PUBLIC_APP_URL=""`; um `pnpm --filter web start` sem rebuild mostra a landing sem o
  link de recuperação.

## Lacunas

| lacuna (handoff/review) | veredito |
|-------------------------|----------|
| Item 6 sem teste automatizado | continua sem teste, por decisão; o comportamento foi medido nesta etapa |
| `/pt-br/%2F%2Fevil.com` do header sem teste | fechada no `/review` (unidade) e agora também no fluxo |
| `signInForgotPassword.test.tsx` em jsdom por arquivo | segue o padrão do vizinho; a lentidão do import por caso foi corrigida aqui |
| `pnpm e2e` não rodado | fechada: 45/45 |
| `\t` e `\\` no guard resolvendo para `//` (🟢 do review, anterior ao lote) | continua aberta, fora do escopo; recomendação do review mantida (tarefa direta) |

## Follow-ups

- Decisão em aberto 1 do review (recusar caminho resolvido com `//`): segue como tarefa separada.
- O repro do item 4 do review não vale ao pé da letra (caminho com `.com` não passa pelo onboarding). Teste ou
  documento futuro que reaproveite o exemplo deve usar uma rota existente sem extensão no último segmento, como
  `/pt-br/entities/edit/%2F%2Fx`.
- Plano de commits do `/review`: `apps/web/__tests__/signInForgotPassword.test.tsx` mudou nesta etapa e continua
  no commit 5 (`feat(web): link landing sign-in to the app's password recovery`).
