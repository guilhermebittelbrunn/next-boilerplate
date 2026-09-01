# Review — `ci-pipeline`

> Revisão do working tree completo das duas passadas do `/develop`. **Branch criada, nada commitado.**
> Os commits ficam para o `/review` executar bloco a bloco, sob aprovação do usuário.

## Branch

| Campo | Valor |
|---|---|
| **Nome** | `ci/feat/github-actions-pipeline` |
| **Criada ou reutilizada** | **criada** |
| **Base** | `3089d71` — que é **exatamente `origin/main`** |
| **Branch anterior** | `loop-develop-review-test-sync` (não protegida, fora do padrão `<project>/<type>/<title>`) |

Nome vindo do plano §7.13, que o usuário citou explicitamente. Ressalva de nomenclatura registrada em
"Decisões em aberto": `ci` é um **`type`** válido, não um `project` — o corte não tem um app/pacote dono
(toca raiz, `.github/`, 3 apps e 9 pacotes). O nome foi mantido por ser o que o plano propôs e o usuário
referenciou.

⚠️ A branch anterior estava em `3089d71`, **à frente do `main` local** (`197bc04`, defasado). A base real
é `origin/main`, então a PR vai limpa.

---

## Achados

| # | Sev | `arquivo:linha` | Problema | Ação |
|---|-----|-----------------|----------|------|
| 1 | 🔴 | `packages/auth/provider.tsx:22-23` | Suppression `noUnusedImports` justificada por `classic \`jsx: "react"\` needs React in scope` — **razão invalidada por este próprio diff**, que trocou `packages/auth/tsconfig.json` de `jsx: "react"` para `react-library.json` (`jsx: react-jsx`). Com runtime automático o import `React` é código morto (`React.` aparece **0×** no arquivo). | **Corrigido** — import e suppression removidos |
| 2 | 🔴 | `docs/PAYMENTS.md:7` | Documenta `@repo/payments` como quem "expõe o cliente `stripe`". O export **deixou de existir** no P10. Raio de impacto do rename não foi seguido até a documentação do contrato. | **Corrigido** |
| 3 | 🔴 | `.claude/skills/payments-flow/SKILL.md:15` | Manda `import { stripe } from "@repo/payments"`. É a skill que **scaffolda** todo fluxo Stripe no repo: geraria código que não compila. | **Corrigido** |
| 4 | 🟡 | `packages/internationalization/server.ts:13` | Razão da suppression sem acentuação e com **inversão de sentido**: "quando o corpo **e** sincrono" (lê-se "e", conjunção) em vez de "**é** síncrono". | **Corrigido** |
| 5 | 🟡 | 10 arquivos (barris `sdk`/`shared`/`design-system`, `formatError.ts`, `cookies.ts`) | Razões novas escritas com diacríticos removidos ("superficie publica", "nao", "metodos", "arbitraria"). Texto degradado num artefato que acabou de ser criado. | **Corrigido** (ortografia; idioma preservado) |
| 6 | 🟡 | `packages/auth/middleware.ts` | `authMiddleware` tem **zero consumidores** no repo (`grep` em `apps/` + `packages/`: só a própria definição). O refactor de complexidade 43 rodou sobre código que **nenhum caminho de runtime exercita** — não foi coberto pela validação de login do browser, que passa por `apps/app/proxy.ts`. É API pública do pacote para forks, então não é morto, mas está **não verificado**. | **Registrado** — não corrigido (ver lacunas de teste) |
| 7 | 🟡 | `apps/api/app/(routes)/webhooks/payments/route.ts:31` | "Not configured" responde **HTTP 200**. A Stripe trata 2xx como entregue e **não repete o evento** — um deploy sem chave descarta webhooks em silêncio. Pré-existente para `STRIPE_WEBHOOK_SECRET`; o P10 estendeu o mesmo caminho para a chave ausente. | **Registrado** — corrigir mudaria comportamento além do corte |
| 8 | 🟡 | `packages/design-system/components/form/hookform/` | `hookform{Input,InputPassword,Select}` passaram a `return null`; `hookform{DateInput,RadioGroup,Switch,Textarea}` seguem em `return <></>` com suppression `noUselessFragments`. **3 de 7** — duas convenções para o mesmo padrão. | **Registrado** — fechar alarga `ReactElement` → `ReactElement \| null` na API pública |
| 9 | 🟡 | `packages/payments/index.ts:7,21` | `client` memoizado **sem chave**: uma vez construído, muda de `STRIPE_SECRET_KEY` não têm efeito. Irrelevante em runtime (env não muda), **mas arma o teste**: um caso que seta a chave e outro que a remove compartilham o cliente memoizado. | **Registrado** — instrução para o `/test` |
| 10 | 🟢 | `packages/auth/client.ts:79` | Texto do warning mudou: `"…file in apps/web/ with these variables."` → `"…file with these variables."`. Melhora (não é só da web), mas é mudança de copy não anunciada no handoff. | Mantido |
| 11 | 🟢 | `.github/workflows/ci.yml` | Sem bloco `permissions:`. O job só faz checkout + install + verify; não precisa de escrita. | **Decisão em aberto** — o YAML é literalmente o do plano §7.10, aprovado pelo usuário |
| 12 | 🟢 | `packages/payments/index.ts:15` | `keys()` é chamado a cada `getStripe()`, revalidando o env por requisição (antes: uma vez no load do módulo). Custo desprezível. | Mantido |

### Verificações que passaram (não viraram achado)

- **`getStripe()` é correto.** `client ??= new Stripe(...)` não tem `await` entre teste e atribuição — no
  event loop single-threaded do Node a memoização é atômica. Com chave, o comportamento é **idêntico** ao
  anterior (mesmo `apiVersion`, mesmo argumento).
- **Importadores do export renomeado**: `grep "@repo/payments"` devolve 3 pontos — a rota do webhook
  (atualizada), `apps/api/env.ts` (só `/keys`, intocado) e o `package.json`. Nenhum consumidor em
  `apps/app`/`apps/web`. ✅ O único ponto perdido era a **documentação** (achados 2 e 3).
- **`getCookie` reescrito preserva semântica** nas duas cópias: o laço original removia só espaços
  (`charAt(0) === ' '`) e `trimStart()` remove todo whitespace — em cookie, separados por `"; "`, é
  equivalente. `substring(len)` ≡ `slice(len)`.
- **`resolveNextMiddleware` preserva a ternária tripla** (aridade 0 = factory, ≥1 = middleware) e a
  **chamada continua preguiçosa por caminho**. Única diferença: `requestHeaders` passou a ser construído
  **depois** do teste de `next` — antes era montado e descartado. Sem efeito colateral.
- **`getFirebaseApp` preserva os 3 desfechos**: config completa → app real; incompleta em dev → warning +
  app mock; incompleta em prod → throw. `getApps()[0] ?? initializeApp(config)` ≡ ao if/else original.
- **`globals.css`**: as duas regras `.anticon` são mutuamente exclusivas
  (`:not(.ant-dropdown-menu-item-danger)` vs `.ant-dropdown-menu-item-danger`) — a troca de ordem não
  altera a cascata. **Confirmado visualmente em light e dark** (ver §Validação visual).
- **`packages/design-system/components/{ui,lib,hooks}` intocados** — nenhum aparece no `git status`. ✅
- **Os 21 `<explanation>` restantes** estão só em `packages/design-system/components/ui/*` (fora do escopo
  do Biome, correto) e nos próprios artefatos da feature, que citam a string. Nenhum no escopo do lint. ✅
- **`specs/ci-pipeline.md` modificado é legítimo**: `status: approved → in-progress` + `feature: ci-pipeline`
  é a transição que `specs/README.md:114` atribui ao `/analyze`. Não é edição indevida — entra como commit
  de escopo `specs`.
- **Docs não citam o fluxo de agents**: as ocorrências de `docs/features/`/`plan.md`/`STATE.md` em
  `TASK-PIPELINE.md`, `AI-WORKFLOW.md`, `review-checklist.md` e `CLAUDE.md` são **linhas pré-existentes**
  desses documentos de processo, cujo assunto *é* o fluxo. Nenhuma **linha adicionada** por este diff
  introduz referência ao fluxo. A regra `code-comments.md` §3 proíbe isso em **código/commit/docstring** —
  não nos guias de processo. ✅
- **`ci.yml`**: 0 ocorrências de `secrets.`, 0 de `build`, `pnpm/action-setup@v4` sem `version:`,
  `node-version-file: .nvmrc` + `cache: pnpm` **nessa ordem**, `--frozen-lockfile`, `concurrency` +
  `cancel-in-progress`, `timeout-minutes: 15`, `fetch-depth: 2`, 1 job `verify`. Bate com o §7.10.
- **`//#lint` não colide**: nenhum workspace declara script `lint`.

---

## Correções aplicadas

| Arquivo | O que mudou |
|---|---|
| `packages/auth/provider.tsx` | Removido `import React,` (0 usos de `React.`) e a suppression `noUnusedImports` cuja razão o novo `tsconfig` invalidou |
| `docs/PAYMENTS.md` | `@repo/payments` passa a ser descrito por `getStripe()`, com o contrato do `null` e a consequência para o build |
| `.claude/skills/payments-flow/SKILL.md` | Passo do cliente reescrito para `getStripe()` dentro do handler + tratamento do `null` |
| `packages/internationalization/server.ts` | Acentuação da razão; **"o corpo e sincrono" → "o corpo é síncrono"** |
| `packages/shared/utils/{index,helpers/index,decorators/index}.ts`, `packages/sdk/src/types/{,entity/,user/}index.ts`, `packages/design-system/components/form/hookform/index.ts` | Acentuação da razão do barril (texto idêntico nos 7) |
| `packages/shared/utils/decorators/formatError.ts` | Acentuação ("métodos", "arbitrária") |
| `packages/shared/utils/helpers/cookies.ts` | Acentuação ("não existe no Safari") |

Só o primeiro item toca código executável; os demais são texto de comentário.

---

## Raio de impacto

| Mudança de contrato | Consumidores | Situação |
|---|---|---|
| `packages/payments`: `stripe` (instância) → `getStripe(): Stripe \| null` | `apps/api/.../webhooks/payments/route.ts` | ✅ atualizado pelo `/develop` |
| | `apps/api/env.ts` | ✅ usa só `@repo/payments/keys`, não afetado |
| | `docs/PAYMENTS.md`, `.claude/skills/payments-flow` | 🔴 estavam desatualizados → **corrigidos aqui** |
| | `packages/payments/ai.ts` | sem importadores; mantém o defeito gêmeo (abaixo) |
| `apps/app`/`apps/web` `LanguageSwitcher`: `export const setCookie` **removido** | nenhum | ✅ `grep setCookie` só acha os 2 call sites e a definição em `@repo/shared` |
| `Container.children` → opcional | todos os `<Container>` existentes | ✅ alargamento de tipo, sem quebra |
| `HookFormInput` → `ReactElement \| null` | formulários de `apps/app`/`apps/web` | ✅ validado no browser |
| `packages/auth/tsconfig.json` → `react-library.json` | nenhum app consome esse tsconfig (só `--noEmit`) | ✅ efeito colateral tratado no achado 1 |

### Achado declarado e deixado fora — `packages/payments/ai.ts:4-5`

`new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY || "" })` em **escopo de módulo** é o gêmeo
exato do defeito que o P10 corrigiu. **Julgamento: fica fora deste corte, e concordo com o `/develop`.**
Razões: (a) Q5 autorizou **uma** mudança de código de produção; (b) `@repo/payments/ai` não tem nenhum
importador — `index.ts` não o reexporta —, então não quebra build algum hoje; (c) a correção não é
mecânica: o consumidor natural do toolkit é um agente, e vale decidir antes se o módulo não é apenas
código morto herdado do upstream. **Ação recomendada**: entrar no `/spec --sync` como item próprio, com a
opção "corrigir com o padrão de 5 linhas **ou** deletar".

---

## Validação visual

`agent-browser` 0.27.0, comandos **estritamente em sequência**. Os três dev servers no ar (app 3000,
web 3001, api 3002). PII filtrada por `qa-` **antes** de qualquer captura na lista de usuários.
Conta usada: `qa-review-ci@example.com` (admin, projeto de dev `next-boilerplate-576d0`).
Screenshots em `docs/features/ci-pipeline/review/screenshots/`.

Escopo: **reconferência dos caminhos de risco depois da passada 2 e das minhas correções** — em especial
tudo que toca sessão/auth, já que editei `packages/auth/provider.tsx`.

| Fluxo | Tema / viewport | Resultado |
|---|---|---|
| app — login `qa-review-ci` → `/pt-br/admin` | dark 1440×900 | ✅ `AuthProvider` monta e autentica **depois** da remoção do import `React` |
| app — troca de idioma pt-br → en | dark | ✅ navega para `/en/admin` e grava `x-locale=en` — `setCookie` de `@repo/shared` funciona |
| app — lista de usuários (`Table` antd) | dark + light + mobile 390×844 | ✅ tema respeitado nos dois; mobile com scroll horizontal e sidebar recolhida |
| app — **dropdown antd com item `danger`** | dark **e** light | ✅ "Editar" com ícone `foreground`, "Excluir" com **texto e ícone** `destructive`. A troca de ordem em `globals.css` não alterou a cascata |
| app — criar usuário, submit vazio | light | ✅ 3 campos com label vermelho, borda destructive e mensagem — `HookForm*` com `return null` e tipo alargado intactos |
| app — breadcrumb "Home › Users › Create User" | light | ✅ rename `page` → `breadcrumb` no `Header.tsx` correto |
| web — home | dark 1440×900 | ✅ renderiza; sessão SSO reconhecida (header mostra "Sair") |

**Console**: zero erro novo. Os presentes são os já catalogados (`<button>` aninhado no
`DropdownMenuTrigger` do Radix) e o aviso `scroll-behavior: smooth` do Next.

**Não repetido**: a bateria completa de 20 screenshots da passada 1 (`develop/screenshots/`) continua
válida — a passada 2 não tocou pixel algum, e minhas correções tocaram 1 arquivo de runtime, cujo caminho
(login) foi reexercitado acima.

---

## Gates

Todos executados **depois** das minhas correções, no working tree final.

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `pnpm check` | `Checked 383 files in 131ms` · **0 erros / 0 warnings** · exit 0 |
| Os 3 gates | `turbo run lint typecheck test --force` | **18 tasks, 18 sucessos** · 16,7 s |
| Cache | 2ª execução consecutiva | **`FULL TURBO`** · 18/18 cached · **141 ms** |
| Hermeticidade | `turbo run lint typecheck test --force --env-mode=strict` | **18/18** · 16,0 s |
| Testes | `pnpm test --force` | **4 tasks** · api **107** · app **135** · web **15** · i18n **2** = **259** |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | **2/2** |
| Typecheck | script em **13** workspaces | **13/13 exit 0** (verificado um a um) |
| Lockfile | `pnpm install --frozen-lockfile` | exit 0 · `Lockfile is up to date` |

As 18 tasks = 1 `//#lint` + 13 `typecheck` + 4 `test`. (`--dry=json` enumera 16 pacotes; só 13 declaram o
script — os 3 removidos no P4.)

### Verificação independente do commit de formatação

Comparei, arquivo a arquivo, o **multiset de caracteres** de `HEAD:<arquivo>` contra o working tree,
descartando whitespace, `,`, `;` e `|` (o que a formatação do Biome adiciona/remove). Dos 52 arquivos
candidatos ao commit de formatação, **51 são idênticos** — ou seja, só reordenação e reformatação, nenhum
token semântico adicionado ou removido.

**O 52º não era formatação**: `apps/web/.../sign-up/components/sign-up-form-client.tsx` teve uma
suppression `noShadow` com `<explanation>` **removida**. Foi **realocado** para o commit de diagnósticos da
`web` — sem isso, uma edição manual viajaria escondida dentro do commit "só formatação".

O mesmo método confirmou que `translations/apps/web/pages/{hero,features}/index.ts` mudaram **apenas** por
vírgula final e ponto e vírgula: **nenhum valor de tradução foi alterado**.

---

## Lacunas de teste (para o `/test`)

- 🔴 **`packages/auth/middleware.ts` sem cobertura e sem consumidor.** É a maior dívida do conjunto: um
  refactor de complexidade 43 num caminho de autenticação, validado só por leitura. `@repo/auth` não tem
  suíte. Casos: rota protegida × pública; `resolveNextMiddleware` com factory (aridade 0) × middleware
  (aridade ≥1) × `undefined`; o `catch` de "Firebase Admin credentials"; e que o `next` **não** é resolvido
  quando a rota é pública e não há `nextMiddleware`.
- 🔴 **`getFirebaseApp` (`packages/auth/client.ts`) sem cobertura.** Três desfechos a fixar: config
  completa → app real; incompleta em `development` → warning + app mock; incompleta em produção → throw.
- 🟡 **`getStripe()` sem teste** — sem chave devolve `null`; com chave devolve instância; chamadas
  repetidas devolvem **a mesma** instância. ⚠️ **Atenção ao achado 9**: a memoização é de módulo, então
  cada caso precisa de `vi.resetModules()` + `await import(...)`, senão os casos contaminam uns aos outros.
- 🟡 **Rota do webhook sem teste.** Quatro caminhos já exercitados à mão: assinatura válida (200 com o
  evento), inválida (500), header ausente (500), não configurado (200 `Not configured`). Mockar
  `@repo/payments`.
- 🟡 **`getCookie` reescrito nas duas cópias, sem cobertura direta.** Casos: espaço à esquerda, nome que é
  prefixo de outro (`x-loc` vs `x-locale`), cookie ausente, valor vazio.
- 🟡 `apps/web/app/sitemap.ts` continua sem teste (era opcional no §8.1) — 5 rotas × 3 locales, barato.
- 🔴 **A prova final do pipeline exige o GitHub**: status check `verify` aparecendo na PR e merge
  bloqueado. Não é reproduzível localmente (o `act` provou o job num container, não a interface).
- 🔴 **Runbook de branch protection não executado** — ação humana, fora da entrega (Q1). Até lá o CI
  **sinaliza mas não bloqueia**.
- As strings pt-br de `apps/web/app/[locale]/sign-{in,up}/validations/` **não** foram congeladas em teste,
  como instruído — seguem sendo bug de i18n em aberto.

---

## Decisões em aberto

1. **Nome da branch.** `ci/feat/github-actions-pipeline` põe um `type` (`ci`) na posição de `project`. O
   corte não tem app/pacote dono. Alternativa aderente à regra ("vários apps → omita o escopo"):
   **`ci/github-actions-pipeline`** ou **`feat/github-actions-pipeline`**.
   → **Recomendo manter** o do plano: é o que foi aprovado e renomear agora não paga.
2. **`permissions:` no `ci.yml`** (achado 11). O job não precisa de escrita; `permissions: contents: read`
   é hardening de 2 linhas. Está **fora** do YAML aprovado no §7.10.
   → **Recomendo adicionar**, mas como o usuário aprovou aquele YAML literal, não mexi.
3. **HTTP 200 no "Not configured"** (achado 7). Trocar por 503 faria a Stripe **repetir** o evento em vez
   de descartá-lo. É mudança de comportamento além do corte.
   → **Recomendo deixar aqui** e abrir item no `/spec --sync` junto com os handlers do webhook (que
   seguem stubs).
4. **`hookform{DateInput,RadioGroup,Switch,Textarea}` em `<></>`** (achado 8). Fechar a inconsistência
   alarga o tipo de retorno na API pública do design system.
   → **Recomendo fora deste corte** (é saneamento de lint, não de CI), como item próprio.
5. **`packages/payments/ai.ts`** — ver §Raio de impacto. → **Recomendo fora**, com item no backlog.

---

## Plano de commits

Ordem por dependência (contrato → consumidor), um commit por app/pacote, mensagens em inglês.
**Nada foi commitado**; a lista abaixo é para o `/review` executar bloco a bloco.

> ⚠️ **Acoplamentos que forçam a forma dos commits**
> - `package.json` da raiz carrega `check`/`fix` (P1) **e** `lint` (P6). Mesmo arquivo ⇒ um commit só
>   (nº 2). O `//#lint` que o consome entra no nº 20.
> - `apps/web/package.json` carrega o script `test` (P3) **e** as dependências de workspace (P5) ⇒ nº 18.
> - O commit **20** (`packages/payments`) deixa `apps/api` importando um símbolo que ainda não existe;
>   o **21** fecha. É a ordem contrato→consumidor que `.claude/rules/git-commits.md` prescreve.

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `chore(claude): drop the vendored skill scripts from the Biome scope` | `biome.jsonc` |
| 2 | `chore: run Biome from the pinned local binary` | `package.json` |
| 3 | `style: apply Biome formatting across the workspace` | os **51** arquivos listados abaixo |
| 4 | `fix(app): remove the orphan module` | `apps/app/midd_teste.ts` (D) |
| 5 | `fix(api): clear the remaining Biome diagnostics` | `apps/api/(shared)/mappers/MapperInterface.ts` · `apps/api/app/(routes)/health/route.ts` · `apps/api/__tests__/{adminGuard,userRepositoryList,usersRoute}.test.ts` · `apps/api/instrumentation-client.ts` (D) |
| 6 | `fix(app): clear the remaining Biome diagnostics` | `apps/app/shared/components/ui/{Header,PageBreadcrumb,Container}.tsx` · `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/page.tsx` · `apps/app/app/[locale]/(authenticated)/(common)/(pages)/page.tsx` · `apps/app/__tests__/{panelState.test.ts,sidebarPersistence.test.tsx}` · `apps/app/postcss.config.mjs` |
| 7 | `fix(web): clear the remaining Biome diagnostics` | `apps/web/app/[locale]/(home)/components/{cases-client,stats}.tsx` · `apps/web/app/[locale]/contact/components/contact-form-client.tsx` · `apps/web/app/[locale]/components/header/index.tsx` · `apps/web/app/[locale]/clientLayout.tsx` · `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx` · `apps/web/postcss.config.mjs` |
| 8 | `refactor(shared): simplify the cookie reader and document the suppressions` | `packages/shared/utils/helpers/cookies.ts` · `packages/shared/utils/{index,helpers/index,decorators/index}.ts` · `packages/shared/utils/decorators/formatError.ts` |
| 9 | `refactor(app): write the locale cookie through the shared helper` | `apps/app/shared/components/ui/LanguageSwitcher.tsx` |
| 10 | `refactor(web): write the locale cookie through the shared helper` | `apps/web/app/[locale]/components/header/language-switcher.tsx` |
| 11 | `refactor(internationalization): simplify the cookie reader and document the suppression` | `packages/internationalization/{utils/cookies.ts,server.ts,keys.ts}` |
| 12 | `refactor(sdk): document the barrel and parameter-property suppressions` | `packages/sdk/src/types/{index,entity/index,user/index}.ts` · `packages/sdk/src/actions/application/health.ts` · `packages/sdk/src/actions/user/user/action.ts` |
| 13 | `refactor(design-system): return null from hidden fields and fix the antd icon cascade` | `packages/design-system/components/form/hookform/{hookformInput,hookformInputPassword,hookformSelect,index}.{tsx,ts}` · `packages/design-system/styles/globals.css` |
| 14 | `refactor(seo): document the JSON-LD suppressions` | `packages/seo/json-ld.tsx` |
| 15 | `refactor(auth): cut the middleware and client complexity` | `packages/auth/{middleware,client,provider}.tsx?` · `packages/auth/components/sign-{in,up}.tsx` |
| 16 | `chore(email): drop the typecheck script from a config-only workspace` | `apps/email/package.json` |
| 17 | `chore(packages): fix the broken typecheck scripts` | `packages/typescript-config/package.json` · `packages/analytics/server.ts` (D) · `packages/sdk/package.json` · `packages/internationalization/{package.json,tsconfig.json}` · `packages/internationalization/next-headers.d.ts` (D) · `packages/auth/{package.json,tsconfig.json}` |
| 18 | `chore(api): run the test suite in the node environment` | `apps/api/{vitest.config.mts,package.json}` |
| 19 | `test(web): cover the SEO base url and locale metadata` | `apps/web/vitest.config.mts` (novo) · `apps/web/__tests__/seo.test.ts` (novo) · `apps/web/package.json` |
| 20 | `chore: sync the lockfile with the workspace manifests` | `pnpm-lock.yaml` |
| 21 | `fix(payments): build the Stripe client lazily so it works without a key` | `packages/payments/{index.ts,keys.ts}` |
| 22 | `fix(api): consume the lazy Stripe client and drop the dead webhook code` | `apps/api/app/(routes)/webhooks/payments/route.ts` |
| 23 | `chore: add lint and typecheck to the turbo task graph` | `turbo.json` |
| 24 | `ci: verify lint, types and tests on every pull request` | `.github/workflows/ci.yml` (novo) |
| 25 | `docs: document the CI pipeline and the branch protection runbook` | `CLAUDE.md` · `apps/web/CLAUDE.md` · `docs/{SETUP,review-checklist,TASK-PIPELINE,AI-WORKFLOW}.md` |
| 26 | `docs: point the payments guide at the lazy Stripe client` | `docs/PAYMENTS.md` |
| 27 | `chore(claude): point the payments skill at the lazy Stripe client` | `.claude/skills/payments-flow/SKILL.md` |
| 28 | `chore(specs): mark the CI pipeline spec as in progress` | `specs/ci-pipeline.md` |
| 29 | `docs(features): ci-pipeline` | `docs/features/ci-pipeline/` (inteiro, incluindo `review/`) |

**PR sugerida**: `ci: verify lint, types and tests on every pull request`.

### Arquivos do commit 3 (formatação, 51)

```
apps/api/(shared)/lib/parse-request-json.ts
apps/api/(shared)/mappers/entity.mapper.ts
apps/api/app/global-error.tsx
apps/api/app/layout.tsx
apps/api/next.config.ts
apps/api/scripts/skip-ci.js
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/page.tsx
apps/app/app/[locale]/(authenticated)/(admin)/admin/paths.ts
apps/app/app/[locale]/(authenticated)/(common)/(pages)/playground/page.tsx
apps/app/app/[locale]/(authenticated)/(common)/sidebar.tsx
apps/app/app/[locale]/(unauthenticated)/layout.tsx
apps/app/app/[locale]/(unauthenticated)/sign-in/page.tsx
apps/app/app/[locale]/(unauthenticated)/sign-up/page.tsx
apps/app/app/global-error.tsx
apps/app/app/page.tsx
apps/app/shared/components/ui/Footer.tsx
apps/app/shared/lib/formatDisplayDateTime.ts
apps/app/vitest.config.mts
apps/web/app/[locale]/(home)/components/cta.tsx
apps/web/app/[locale]/(home)/components/features.tsx
apps/web/app/[locale]/(home)/components/hero.tsx
apps/web/app/[locale]/(home)/components/testimonials-client.tsx
apps/web/app/[locale]/contact/actions/contact.tsx
apps/web/app/[locale]/sign-in/components/sign-in-form.tsx
apps/web/app/[locale]/sign-up/components/sign-up-form.tsx
apps/web/app/[locale]/styles.css
apps/web/app/page.tsx
apps/web/next.config.ts
apps/web/scripts/skip-ci.js
packages/analytics/provider.tsx
packages/design-system/components/form/hookform/hookformDateInput.tsx
packages/design-system/components/form/hookform/hookformSwitch.tsx
packages/design-system/index.tsx
packages/design-system/postcss.config.mjs
packages/design-system/providers/theme.tsx
packages/email/templates/contact.tsx
packages/internationalization/client.ts
packages/internationalization/translations/apps/app/pages/common/index.ts
packages/internationalization/translations/apps/app/pages/navbar/index.ts
packages/internationalization/translations/apps/web/index.ts
packages/internationalization/translations/apps/web/pages/contact/contact.ts
packages/internationalization/translations/apps/web/pages/cta/index.ts
packages/internationalization/translations/apps/web/pages/faq/index.ts
packages/internationalization/translations/apps/web/pages/features/index.ts
packages/internationalization/translations/apps/web/pages/hero/index.ts
packages/next-config/index.ts
packages/security/index.ts
packages/security/keys.ts
packages/security/middleware.ts
tsup.config.ts
turbo/generators/config.ts
```

### Commits realizados

_(a preencher pelo `/review` conforme cada bloco for aprovado)_

---

## Higiene

- Conta de QA criada para esta revisão: `qa-review-ci@example.com` (admin, projeto de dev
  `next-boilerplate-576d0`), deixada no projeto como as demais contas `qa-`. Senha **não** registrada aqui.
- Nenhum screenshot desta etapa contém PII (lista filtrada por `qa-`) nem credencial (campos mascarados).
- Dev servers encerrados; sessão do `agent-browser` fechada. `apps/*/.next/` no disco, ignorado pelo git.
