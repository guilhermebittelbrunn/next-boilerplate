# Relatório de QA — `ci-pipeline`

> Branch: **`ci/feat/github-actions-pipeline`** (não protegida; criada pelo `/review`). **Nada foi
> commitado e nenhuma branch foi criada nesta etapa.** O working tree saiu de 131 entradas para **141**:
> as 10 a mais são os artefatos desta etapa (9 arquivos de teste/config + `docs/features/ci-pipeline/test/`).
> Cada um dos 131 arquivos entregues foi conferido por **checksum antes e depois** de todas as mutações e
> da validação no browser — nenhum sofreu deriva.

---

## 1. Placar

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `pnpm check` | `Checked 392 files in 130ms` · **0 erros / 0 warnings** · exit 0 |
| Os 3 gates | `turbo run lint typecheck test --force` | **21 tasks, 21 sucessos** · 15,0 s |
| Cache | 2ª execução consecutiva | **`FULL TURBO`** · 21/21 cached · **144 ms** |
| Hermeticidade | `turbo run lint typecheck test --force --env-mode=strict` | **21/21** · 16,1 s |
| Testes | `pnpm test --force` | **7 tasks** · **331 testes** |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | **11/11** (2 de paridade + 9 novos) |
| Typecheck | script em **13** workspaces, executados um a um | **13/13 exit 0** |
| Lockfile | `pnpm install --frozen-lockfile` | exit 0 · `Lockfile is up to date` |
| Workflow no runner | `act pull_request -j verify --container-architecture linux/amd64` | **21/21** · `Job succeeded` |

As **21 tasks** = 1 `//#lint` + 13 `typecheck` + **7** `test`. Eram 18 no `/review`; as 3 a mais são as
suítes que esta etapa criou em `@repo/auth`, `@repo/payments` e `@repo/shared`.

### Testes por workspace

| Workspace | Antes do QA | Depois | Delta |
|---|---:|---:|---:|
| `apps/api` | 107 | **118** | +11 |
| `apps/app` | 135 | 135 | — |
| `apps/web` | 15 | 15 | — |
| `@repo/internationalization` | 2 | **11** | +9 |
| `@repo/auth` | **sem suíte** | **29** | +29 |
| `@repo/payments` | **sem suíte** | **8** | +8 |
| `@repo/shared` | **sem suíte** | **15** | +15 |
| **total** | **259** | **331** | **+72** |

---

## 2. Testes criados — e a prova de mutação de cada um

**39 mutações aplicadas, 39 mortas, 0 sobreviventes.** Cada mutação foi aplicada ao código de produção,
a suíte correspondente foi executada e o arquivo restaurado a partir de uma cópia byte a byte; o
checksum foi conferido depois de cada rodada.

### 2.1 `packages/auth/__tests__/middleware.test.ts` — 21 testes

Fecha a **maior lacuna apontada pelo `/review`**: `packages/auth/middleware.ts` sofreu um refactor de
complexidade cognitiva 43 num caminho de autenticação, tem **zero consumidores no repositório** (é API
pública do pacote, para forks) e por isso **nenhum fluxo de browser o exercita** — o login da `apps/app`
passa por `apps/app/proxy.ts`. Estava correto por leitura, e agora está verificado.

Cobre: rota pública sem verificação de token · rota pública com `nextMiddleware` · **factory (aridade 0)
× middleware (aridade ≥1) × `undefined`**, que é a ternária que o refactor extraiu para
`resolveNextMiddleware` · injeção de `x-user-id`/`x-user-email` · e-mail nulo · token do cookie × do
header `Authorization` × ausente (`null`) · redirect 307 para `/sign-in` preservando `?redirect=` · o
**catch de "Firebase Admin credentials"** (segue sem autenticar, não redireciona) · catch de outro erro
(redireciona) · erro que não é `instanceof Error` · `protectedRoutes` e `redirectTo` customizados ·
`/api/collaboration` protegida por padrão.

| Mutação em `middleware.ts` | Testes derrubados |
|---|---:|
| aridade invertida (`length === 0` para `=== 1`) | 7 |
| rota pública passa a ser autenticada | 4 |
| catch de credenciais ausentes removido | 2 |
| precedência cookie/header invertida | 1 |
| `x-user-email` removido | 2 |
| query `redirect` removida do sign-in | 1 |
| middleware seguinte ignorado no caminho autenticado | 2 |

### 2.2 `packages/auth/__tests__/firebaseClient.test.ts` — 8 testes

Cobre os três desfechos de `getFirebaseApp` (alcançado por `getAuthClient`, já que ele não é exportado),
com `vi.resetModules()` + `await import` por caso, porque o app é memoizado em escopo de módulo.

Cobre: config completa gera `initializeApp` com as 7 chaves lidas das envs · as 3 opcionais ausentes
**não** tornam a config incompleta · `getApps()[0]` reaproveitado em vez de reinicializar · memoização do
`Auth` · incompleta em `development` gera `console.warn` **listando exatamente as envs faltando** + app de
fachada `MOCK_CONFIG` · incompleta em produção lança · incompleta em `test` lança (a fachada é só de
`development`).

| Mutação em `client.ts` | Testes derrubados |
|---|---:|
| detecção de env faltante invertida | 7 |
| config incompleta tratada como completa | 4 |
| app existente ignorado | 1 |
| fachada usada fora de `development` | 1 |
| fachada trocada pela config real | 1 |
| memoização do `Auth` removida | 1 |

### 2.3 `packages/payments/__tests__/getStripe.test.ts` — 8 testes

Usa o **SDK real da Stripe**, de propósito: `new Stripe("")` lança de verdade, então o teste que exige
`null` sem chave falha se alguém reintroduzir o `|| ""`. `keys()` é mockado e `server-only` é neutralizado
com `vi.mock`. Atenção ao achado 9 do `/review` (memoização de módulo): cada caso faz
`vi.resetModules()` + `await import("../index")`, então nenhum caso contamina o outro.

Cobre: sem chave devolve `null` · chave vazia devolve `null` · **importar o módulo não constrói nada nem
chama `keys()`** (é o defeito que quebrava o `api#build`) · com chave devolve `instanceof Stripe` ·
`apiVersion` fixada em `2025-09-30.clover` · duas chamadas devolvem **a mesma instância** · `keys()`
relido a cada chamada · construção só na primeira chamada.

| Mutação em `index.ts` | Testes derrubados |
|---|---:|
| guard de chave ausente removido (volta ao `\|\| ""`) | 2 |
| `keys()` avaliada no carregamento do módulo | 3 |
| memoização removida (`??=` vira `=`) | 1 |
| `apiVersion` alterada | 1 |

### 2.4 `apps/api/__tests__/paymentsWebhookRoute.test.ts` — 11 testes

Mocka `@repo/payments`, `next/headers` e `@/env`. Cobre os quatro caminhos que o `/develop` só havia
exercitado à mão.

Cobre: sem cliente Stripe devolve 200 `Not configured` · sem `STRIPE_WEBHOOK_SECRET` devolve 200
`Not configured` · o corpo **não é lido** quando não está configurado · `constructEvent` recebe corpo cru
+ assinatura + segredo · header `stripe-signature` ausente devolve 500 sem chamar `constructEvent` ·
assinatura inválida devolve 500 · **a mensagem interna não vaza na resposta** ·
`checkout.session.completed` devolve 200 com o evento verificado · `subscription_schedule.canceled`
devolve 200 · evento sem `customer` não quebra · tipo não tratado gera `console.warn` + 200.

| Mutação na rota | Testes derrubados |
|---|---:|
| segredo do webhook deixa de ser exigido | 1 |
| checagem do header de assinatura removida | 1 |
| erro passa a responder 200 | 2 |
| evento verificado sai da resposta | 1 |
| contrato `Not configured` alterado | 2 |
| aviso de evento não tratado removido | 1 |
| mensagem interna vazada na resposta | 3 |

### 2.5 `packages/shared/__tests__/cookies.test.ts` — 15 testes

Cobre a **implementação única** para onde os dois `LanguageSwitcher` foram deduplicados. Ambiente `node`
com `window`/`document` stubados, o que dá controle exato sobre a string de cookie.

Cobre `getCookie`: cookie único · espaço separador (`trimStart`) · nome que é **prefixo de outro**
(`x-loc` × `x-locale`) · ausente devolve `null` · valor vazio devolve `""` · `=` dentro do valor
preservado · **nome que aparece no valor de outro cookie não casa** · sem `document` devolve `null`. E
`setCookie`/`removeCookie`: `path=/` + `SameSite=Lax` · TTL **em segundos** (com `useFakeTimers`) · no-op
no servidor · expiração no passado · ida e volta.

| Mutação em `cookies.ts` | Testes derrubados |
|---|---:|
| `=` removido do prefixo | 7 |
| `trimStart` removido | 4 |
| `startsWith` trocado por `includes` | 2 |
| valor cortado no primeiro `=` | 1 |
| TTL interpretado em milissegundos | 1 |
| `SameSite` alterado | 1 |
| guarda de servidor do `setCookie` removida | 1 |
| `removeCookie` deixa de expirar no passado | 1 |

> ⚠️ A mutação `startsWith` para `includes` **sobreviveu na primeira rodada**. Foi o que motivou os dois
> casos "nome dentro do valor de outro cookie"; com eles, ela morre. Registrado porque é a evidência de
> que a prova de mutação não foi cerimônia.

### 2.6 `packages/internationalization/__tests__/cookies.test.ts` — 9 testes

Mesma bateria de `getCookie` para a segunda cópia, que vive em `@repo/internationalization/utils`.

| Mutação em `utils/cookies.ts` | Testes derrubados |
|---|---:|
| `trimStart` removido | 4 |
| `startsWith` trocado por `includes` | 2 |
| valor cortado no primeiro `=` | 1 |
| guarda de servidor removida | 1 |

### 2.7 Infraestrutura acrescentada

`packages/{auth,payments,shared}/vitest.config.mts` (`environment: "node"`, no modelo enxuto do
`@repo/internationalization`) e `"test": "NODE_ENV=test vitest run"` nos três `package.json`.
**Nenhuma dependência nova e nenhuma linha do `pnpm-lock.yaml` mudou**: `vitest@4.0.3` está nas
`devDependencies` da **raiz**, que é de onde `@repo/internationalization` já o resolve — o hoisting aqui é
o do workspace root, não o hoisting acidental entre apps que o P2 corrigiu na `apps/api`.
`pnpm install --frozen-lockfile` continua saindo 0.

---

## 3. Critérios de aceite — status item a item

Detalhe e evidência de cada um em [`criterios-aceite.md`](criterios-aceite.md).

| # | Critério | Status | Por qual meio |
|---|---|---|---|
| 1 | `pnpm check` limpo, exit 0 | ✅ | `pnpm check` — 392 arquivos, 0/0 |
| 2 | Lint sem rede, versão no lockfile | ✅ | binário fixado + `act` num container do zero |
| 3 | Todo `typecheck` passa | ✅ | 13 workspaces executados um a um |
| 4 | `typecheck` não depende de `build` | ✅ | `turbo.json` + 21 tasks em 15,0 s |
| 5 | `turbo run lint typecheck test` verde e cacheável | ✅ | 21/21 · `FULL TURBO` 144 ms |
| 6 | `apps/web` na suíte | ✅ | 15 testes + mutação `expect(1).toBe(2)` |
| 7 | `apps/api` em `node`, sem dependência fantasma | ✅ | 118 testes em `environment: "node"` |
| 8 | Tasks herméticas quanto a env | ✅ | `--env-mode=strict` 21/21 |
| 9 | `globalDependencies` cobre `.env` | ✅ | `turbo.json` + `FULL TURBO` estável |
| 10 | `build` não falha mais por chave da Stripe | ✅ | **unit** (8 testes + 4 mutações) + rota (11 testes) |
| 11 | PR com defeito fica vermelha | ✅ | 4 cenários locais + `act` com `Job failed` |
| 12 | Clone sem segredo roda o pipeline | ✅ | `ci.yml` sem `secrets.` + `act` sem secret |
| 13 | Comando local igual ao comando do CI | ✅ | mesma linha no host e no container |
| 14 | Node e pnpm vindos dos arquivos do repo | ✅ | log do `act` (`.nvmrc` + `packageManager`) |
| 15 | Cache não erra por dependência não declarada | ✅ | cenário (d) invalidou as tasks a jusante |
| 16 | Nada muda em runtime | ✅ | **e2e** — CRUD completo com conta comum real, 17 prints |
| 17 | Configuração fora do repo documentada | ⚠️ **BLOQUEADO** | runbook escrito; execução é ação humana |
| — | PR real vermelha/verde no GitHub | ⚠️ **BLOQUEADO** | exige push e PR aberta |

**15 ✅ · 0 ❌ · 2 ⚠️.** Os dois bloqueios são exatamente os previstos pela decisão **Q1** do plano — não
são falha da entrega.

### Os 4 cenários de defeito do plano §8.2, reconferidos de forma independente

| Defeito | Task que quebra | Exit | Tasks |
|---|---|---:|---|
| (a) `console.log` em arquivo novo de `apps/app` | `//#lint` (`lint/suspicious/noConsole`) | 1 | 18/21 |
| (b) `const qaTypeProbe: number = "..."` em `@repo/sdk` | `@repo/sdk#typecheck` (`TS2322`) | 2 | 19/21 |
| (c) `expect(1).toBe(2)` em `apps/web/__tests__` | `web:test` | 1 | 19/21 |
| (d) chave `announcement` removida **só** do `es` | `@repo/internationalization#test` (`parity.test.ts`) | 1 | 15/17 |

O cenário (d) — o do sinal de pronto da spec — foi levado até o fim **dentro do runner**:
`act pull_request -j verify` terminou em `Failure - Main pnpm turbo run lint typecheck test` e
`Job failed`, emitindo a anotação `::error::@repo/internationalization#test`. Com o repositório íntegro,
o mesmo comando termina em 21/21 e `Job succeeded`. Cada defeito foi revertido e o checksum do arquivo
conferido contra o manifesto inicial.

---

## 4. Evidências e2e

`agent-browser` 0.27.0, comandos **estritamente em sequência**, três dev servers no ar (app 3000, web
3001, api 3002). Screenshots em [`e2e/`](e2e/).

**O que esta etapa cobriu e as anteriores não**: o `/develop` (20 prints) e o `/review` (7) validaram o
painel e a landing com uma conta **admin**, que no painel comum cai em impersonação read-only — a lista de
`entities` parou no estado vazio. Aqui foi criada uma **conta comum de verdade** pelo próprio fluxo de
sign-up (`qa-common-ci@example.com`), sem impersonação e sem banner read-only, e o CRUD foi percorrido
inteiro. A bateria visual anterior **não foi repetida**.

| # | Screenshot | O que prova |
|---|---|---|
| 01 | `01-signup-conta-comum.png` | criação da conta comum pelo formulário (campos de senha mascarados) |
| 02 | `02-entities-lista-vazia-comum.png` | painel comum **sem** banner read-only, botão "Novo" habilitado |
| 03 | `03-entities-form-validacao.png` | submit vazio devolve `Informe o nome.`, label e borda destructive (`HookForm*` com `return null` íntegros) |
| 04 | `04-entities-apos-criar.png` | entidade criada e listada |
| 05 | `05-entities-toggle-ativo.png` | toggle `Ativo` otimista; **persistiu após reload** |
| 06 | `06-entities-menu-acoes-dark.png` | dropdown antd em **dark**: "Excluir" com texto **e** ícone `destructive` |
| 07 | `07-entities-editar-preenchido.png` | edição carrega os valores e aceita alteração |
| 08 | `08-entities-menu-acoes-light.png` | mesmo dropdown em **light** — a troca de ordem em `globals.css` não alterou a cascata |
| 09 | `09-entities-confirmar-exclusao.png` | confirmação "Excluir registro" antes de apagar |
| 10 | `10-entities-apos-excluir-light.png` | lista volta ao estado vazio; `Table` antd respeita o tema light |
| 11 | `11-entities-espanhol-light.png` | troca pt-br para es grava `x-locale=es` (`setCookie` de `@repo/shared`) e traduz a tabela |
| 12 | `12-entities-mobile-light.png` | 390×844 light: sidebar recolhida, tabela com scroll horizontal |
| 13 | `13-web-sso-sessao-reconhecida.png` | `apps/web` reconhece a sessão da conta comum (header mostra "Sair") |
| 14 | `14-app-redirect-sign-in.png` | rota protegida sem sessão vai para `/sign-in?redirect=%2Fpt-br%2Fentities` |
| 15 | `15-app-sign-in-credencial-invalida.png` | senha errada devolve toast traduzido, sem stack trace |
| 16 | `16-app-login-comum-redirect-preservado.png` | login volta para `/pt-br/entities`; `AuthProvider` monta após a remoção do `import React` |
| 17 | `17-entities-mobile-dark.png` | 390×844 dark |

Matriz coberta: **light + dark** × **1440×900 + 390×844**, idiomas **pt-br + es**, painel **comum sem
impersonação**.

**Console: zero erro novo.** Os presentes são os já catalogados — `scroll-behavior: smooth` do Next, o
`useId` do Radix em `DropdownMenuTrigger`/`Collapsible` (`specs/BACKLOG.md:205`), o aviso de
compatibilidade do antd v5 com React 19 e os `<a>`/`<button>` aninhados do `NavigationMenu` da web.

Busca também exercitada: termo `zzz-inexistente` devolve "Nenhuma entidade cadastrada."; termo `editada`
devolve 1 linha.

---

## 5. Integridade do working tree

O QA aplicou 39 mutações e 4 defeitos deliberados a arquivos de produção. Para garantir que nada ficou
para trás:

1. Manifesto de checksums (`shasum`) de **todos** os arquivos modificados e não rastreados, tirado antes
   da primeira mutação.
2. Cada mutação restaurada a partir de cópia byte a byte, com checksum conferido logo em seguida.
3. Manifesto final comparado ao inicial: **as únicas diferenças são os 9 arquivos novos de teste/config e
   as 3 `package.json` que ganharam o script `test`.** Nenhum dos 131 arquivos entregues pelo `/develop`
   e pelo `/review` foi alterado.

Arquivos que esta etapa acrescenta ao diff:

```
apps/api/__tests__/paymentsWebhookRoute.test.ts           (novo)
packages/auth/__tests__/firebaseClient.test.ts            (novo)
packages/auth/__tests__/middleware.test.ts                (novo)
packages/auth/vitest.config.mts                           (novo)
packages/auth/package.json                                (script test — já estava no diff)
packages/internationalization/__tests__/cookies.test.ts   (novo)
packages/payments/__tests__/getStripe.test.ts             (novo)
packages/payments/vitest.config.mts                       (novo)
packages/payments/package.json                            (script test — novo no diff)
packages/shared/__tests__/cookies.test.ts                 (novo)
packages/shared/vitest.config.mts                         (novo)
packages/shared/package.json                              (script test — novo no diff)
docs/features/ci-pipeline/test/                           (novo)
```

**Sugestão para o plano de commits do `/review`** (que hoje tem 29): os testes acompanham o commit da
funcionalidade que cobrem, então `packages/auth/__tests__/*` + `vitest.config.mts` + `package.json` vão
no commit **15** (`refactor(auth): cut the middleware and client complexity`);
`packages/payments/__tests__/*` no **21** (`fix(payments): ...`);
`apps/api/__tests__/paymentsWebhookRoute.test.ts` no **22** (`fix(api): consume the lazy Stripe client...`);
`packages/shared/__tests__/*` no **8** (`refactor(shared): simplify the cookie reader...`);
`packages/internationalization/__tests__/cookies.test.ts` no **11**
(`refactor(internationalization): simplify the cookie reader...`). O `docs/features/ci-pipeline/test/`
entra no commit **29** (`docs(features): ci-pipeline`).

---

## 6. O que falta testar — lacunas remanescentes

| Lacuna | Sev | Situação |
|---|---|---|
| **PR real no GitHub** (status check `verify` na interface, merge bloqueado) | 🔴 | Não reproduzível localmente. O `act` provou o job, não a interface. **Exige push e PR.** |
| **Runbook de branch protection executado** | 🔴 | Ação humana no GitHub (Q1). Até lá o CI **sinaliza mas não bloqueia** — e nenhum fork herda a proteção. |
| **Cache-hit do store do pnpm na 2ª execução do workflow** | 🟡 | A chave de cache correta foi observada no log do `act` (`Cache saved successfully`), mas o `act` não tem backend persistente entre execuções. Só verificável no GitHub. |
| `apps/web/app/sitemap.ts` sem teste | 🟡 | Era opcional no plano §8.1; continua barato (5 rotas × 3 locales) e load-bearing. Não entrou aqui por não ter relação com as lacunas prioritárias. |
| Strings pt-br em `apps/web/app/[locale]/sign-{in,up}/validations/` | 🟡 | **Deliberadamente não congeladas em teste** — congelá-las travaria o bug de i18n em vez de expô-lo. Segue em aberto. |
| `packages/auth/{server,session,session-routes}.ts` sem cobertura | 🟡 | A suíte nova de `@repo/auth` cobre `middleware.ts` e `client.ts`. O resto do pacote (verificação de token no servidor, cookie de sessão) continua sem teste — agora, porém, o pacote **tem** suíte, então acrescentar é barato. |
| `packages/payments/ai.ts` | 🟡 | Fora do corte por decisão do `/review`; tem o gêmeo do defeito que o P10 corrigiu, sem importador. Item para o `/spec --sync`. |
| Comportamento em `subscription` × `simple` | — | **N/A**: o corte não toca modo de produto. |
| Ownership / autorização de recurso alheio | — | **N/A** para este corte: nenhuma rota nova, nenhum guard alterado. A rota do webhook não é autenticada por usuário (autentica pela assinatura HMAC da Stripe, agora coberta por teste). |

---

## 7. Observações e recomendações

1. **`turbo run` aborta na primeira falha.** Confirmado nos quatro cenários: uma PR com lint **e** teste
   quebrados mostra só o lint. É comportamento conhecido e registrado como decisão em aberto —
   `--continue` resolveria, mas faria o comando do CI divergir do local, contra o critério 13.
2. **A cascata de `dependsOn: ["^test"]` amplifica a falha do i18n.** Quando
   `@repo/internationalization#test` falha, as tasks de teste de `app`, `web` e `api` nem chegam a rodar
   (15 de 17 tasks no cenário (d)). Isso é correto — mas quem ler o log da PR verá "3 suítes não rodaram"
   e pode se confundir. Vale uma linha no `docs/SETUP.md` se o time reclamar.
3. **O gate pegou defeitos do próprio QA**, o que é a melhor evidência de que ele funciona: 10 erros de
   lint (`noMagicNumbers`, `useTopLevelRegex`, formatação) e 2 erros de tipo (`TS2339` em `getApiField`,
   `TS2345` no `RequestInit` do `NextRequest`) nos testes escritos aqui. Todos corrigidos antes de fechar.
4. **Recomendo adicionar `permissions: contents: read` ao `ci.yml`** — é a decisão em aberto nº 2 do
   `/review` e continuo concordando: 2 linhas de hardening num arquivo que todo fork herda. Não mexi,
   porque o YAML foi aprovado literalmente pelo usuário.
5. **Achado novo, fora do corte** (para o `/spec --sync`): o `useId` do Radix produz *hydration mismatch*
   em **toda** carga do painel comum, não só no `DropdownMenuTrigger` — o `Collapsible` do
   `GlobalSidebar` também. Já catalogado em `specs/BACKLOG.md:205` como pré-existente; o que esta etapa
   acrescenta é o escopo real (sidebar + dropdown) e a confirmação de que aparece no fluxo mais comum do
   app.

---

## 8. Estado de dev alterado

- **Conta criada**: `qa-common-ci@example.com` — **usuário comum**, criado pelo fluxo de sign-up no
  projeto de dev `next-boilerplate-576d0`. Deixada no projeto, como as demais contas `qa-` das etapas
  anteriores (`qa-ci-admin@example.com`, `qa-review-ci@example.com`). **A senha não está registrada em
  nenhum arquivo** — foi usada só em memória durante a sessão. Se o `/test` precisar reusá-la numa
  próxima rodada, a recomendação é o usuário guardá-la em `.claude/dev-credentials.local.md` (gitignored).
- **Dado criado e removido**: a entidade `QA Entidade CI` foi criada, editada e **excluída** pela própria
  UI. A lista de `entities` da conta comum voltou ao estado vazio. Nenhum resíduo no Firestore.
- **Nenhum screenshot contém PII** (só contas `qa-`) nem credencial (campos de senha mascarados).
- **Nenhum `.env` foi tocado** em nenhum momento desta etapa.
- Dev servers encerrados; sessão do `agent-browser` fechada; portas 3000/3001/3002 liberadas.
- Resíduos no disco, ignorados pelo git: `apps/*/.next/` das execuções de dev e o cache que o `act`
  gravou no diretório do Docker. `pnpm clean` remove os primeiros.

---

## 9. Pendências que exigem decisão do usuário

1. **Push e abertura da PR** — é o que desbloqueia os dois critérios ⚠️. Recomendo: aprovar os commits,
   autorizar o push da branch `ci/feat/github-actions-pipeline` para o `origin`, abrir a PR para `main` e
   conferir que o check `verify` aparece sozinho. Depois, empurrar um commit descartável com um
   `console.log` para ver a PR ficar vermelha, e removê-lo.
2. **Executar o runbook de branch protection** (`docs/SETUP.md`) depois que o check `verify` tiver
   aparecido pela primeira vez — antes disso ele nem fica selecionável no GitHub.
3. **`permissions: contents: read` no `ci.yml`** — recomendo adicionar (item 4 acima). Uma linha do
   usuário destrava.
4. **Credenciais de dev para as próximas rodadas de QA** — hoje cada etapa cria uma conta `qa-` nova. Se
   o usuário quiser reuso, colocar e-mail e senha de uma conta comum e de uma admin em
   `.claude/dev-credentials.local.md` (gitignored). ⛔ Nunca em arquivo versionado.
