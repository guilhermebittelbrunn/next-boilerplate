# Handoff — `ci-pipeline`, passada 1 (P0 → P5, fase de saneamento)

> Esta é a **primeira metade** do plano. P6–P10 (`turbo.json`, `.github/`, docs, fix da Stripe) ficam
> para a passada 2. **Nada foi commitado e nenhuma branch foi criada** — o working tree está sujo,
> pronto para o `/review`.

## Placar dos gates

| Gate | Antes (`3089d71`) | Depois | Comando |
|------|------------------|--------|---------|
| **Lint** | 192 erros / 37 warnings, exit 1 | **0 / 0, exit 0** | `pnpm check` |
| **Testes** | 3 tasks · 37 arquivos · 244 testes | **4 tasks · 38 arquivos · 259 testes** | `pnpm test` |
| **Typecheck** | 3 scripts quebrados · 4 pacotes sem script | **13 workspaces com script, 13 passam** | `pnpm --filter <w> typecheck` |
| **Cache do turbo** | — | 2ª execução `FULL TURBO` (120 ms vs 5,3 s) | `pnpm test` 2× |

Testes por workspace: `api` 107 · `app` 135 · `web` **15 (novo)** · `@repo/internationalization` 2.

---

## P0 — Zerar a baseline de lint

### P0.a — excluir `.claude/skills` do Biome
`biome.jsonc` — entrada `!.claude/skills` no bloco `files.includes`, com comentário autocontido
(scripts vendorizados de skill de terceiro). **Efeito medido: 192 → 111 erros**, exatamente o previsto.

### P0.b — auto-fix seguro
`biome check --write ./` (sem `--unsafe`): **72 arquivos corrigidos, 111 → 28 erros**. Só formatação,
ordenação de atributos/imports e ordenação de classes Tailwind. Conferido com `git diff -w`: as únicas
mudanças não-whitespace são reordenação de atributos JSX e de classes Tailwind sem conflito entre si.
`packages/design-system/components/{ui,lib,hooks}` **não** foram tocados (fora do escopo do Biome).

### P0.c — os 28 erros manuais + 37 warnings

**Deleções autorizadas**
- `apps/app/midd_teste.ts` — órfão, 16 linhas comentadas, sem exports nem importador.
- `packages/analytics/server.ts` — código morto que não compila (feito junto do P4).

**Correções por arquivo**

| Arquivo | Regra(s) | O que foi feito |
|---|---|---|
| `apps/api/app/(routes)/webhooks/payments/route.ts` | `noUnusedVariables` ×2, `suppressions/incorrect` | Removida a extração morta de `customerId` nos dois handlers (guard `if (!data.customer)` mantido). Handlers **não** implementados (fora de escopo). Razão real na suppression de `useAwait`. |
| `apps/api/instrumentation-client.ts` | `noEmptySource` | **Apagado** — arquivo de convenção do Next contendo só um comentário, sem export e sem efeito. Ver "Desvios". |
| `apps/api/(shared)/mappers/MapperInterface.ts` | `useConsistentTypeDefinitions` | `interface` → `type`; suppression removida. |
| `apps/api/app/(routes)/health/route.ts` | `suppressions/incorrect` | Suppression de `noForEach` removida — não havia `forEach` no arquivo. |
| `apps/app/shared/components/ui/Header.tsx` | `noShadow` | Callback do `map` renomeado `page` → `breadcrumb` (sombreava a prop `page`); suppression removida. |
| `apps/app/shared/components/ui/PageBreadcrumb.tsx` | `noSvgWithoutTitle` | `aria-hidden="true"` explícito nos 2 chevrons decorativos; suppression removida. |
| `apps/app/.../(admin)/admin/(pages)/page.tsx` · `.../(common)/(pages)/page.tsx` | `noUselessFragments` | `<Container><></></Container>` → `<Container />`; `children` de `Container` passou a opcional. |
| `apps/app/__tests__/panelState.test.ts` | `noMagicNumbers` | `14 * 24 * 60 * 60` decomposto em constantes nomeadas. |
| `apps/web/.../header/language-switcher.tsx` | `noDocumentCookie`, `noMagicNumbers` ×2, `useBlockStatements`, `useConsistentTypeDefinitions` | `setCookie` local **removido** em favor de `setCookie` de `@repo/shared/utils`; TTL em constantes nomeadas; `interface` → `type`. |
| `apps/app/shared/components/ui/LanguageSwitcher.tsx` | 2× `suppressions/incorrect` | Mesma deduplicação; as 2 suppressions de arquivo deixaram de ser necessárias. |
| `apps/web/.../(home)/components/cases-client.tsx` | `noArrayIndexKey`, `noMagicNumbers` | `CASE_LOGO_SLOTS` (lista estável de números) substitui `Array.from({length:15})` + `key={index}`; `1000` → `AUTO_ADVANCE_DELAY_MS`. |
| `apps/web/.../(home)/components/stats.tsx` | `noArrayIndexKey` | `key={item.title}` (títulos únicos por locale — conferido no dicionário). |
| `apps/web/.../contact/components/contact-form-client.tsx` | `noArrayIndexKey` | `key={benefit.title}`. |
| `apps/web/.../header/index.tsx` | `suppressions/incorrect` | `key={idx}` → `key={subItem.title}` (mesmo padrão já usado na linha 281); suppression removida. |
| `apps/web/app/[locale]/clientLayout.tsx` | `suppressions/incorrect` | `token && apiClient.setAuthorizationHeader(token)` → `if (token) { … }`; suppression removida. |
| `apps/{app,web}/postcss.config.mjs` | `noBarrelFile` | Suppression **com razão real** (o PostCSS carrega o arquivo pela convenção de nome; ele só aponta para a config compartilhada). Tentativa de trocar por `import`+`export default` esbarrou em `noExportedImports` — catch-22, suppression é a saída correta. |
| `packages/auth/components/sign-{in,up}.tsx` | `useBlockStatements`, `noSvgWithoutTitle` | Bloco no early return; `aria-hidden` → `aria-hidden="true"` no SVG do Google. |
| `packages/auth/middleware.ts` | `noExcessiveCognitiveComplexity` (43), `suppressions/incorrect` | Extraídos `resolveNextMiddleware`, `redirectToSignIn` e `runNext`; as 3 ternárias aninhadas duplicadas viraram uma função com comentário autocontido sobre o truque de aridade. Suppression de `noNestedTernary` removida. **Chamada do middleware seguinte continua preguiçosa** (por caminho), como antes. |
| `packages/auth/client.ts` | `noExcessiveCognitiveComplexity` (22), `suppressions/incorrect` | `getFirebaseApp` decomposto em `readClientConfig`, `listMissingEnvNames`, `initializeOnce`. Comportamento preservado: config completa → app real; faltando em dev → warning + app mock; faltando em prod → throw. |
| `packages/internationalization/utils/cookies.ts` | `useBlockStatements` ×3, `useForOf`, `useTemplate` | `getCookie` reescrito com `split/map(trimStart)/find` — equivalente ao laço original. |
| `packages/shared/utils/helpers/cookies.ts` | `suppressions/incorrect` ×2 | Mesma reescrita do `getCookie` (suppression de `useForOf` deixou de ser necessária); razão real na suppression de `noDocumentCookie` (a Cookie Store API não existe no Safari). |
| `packages/design-system/components/form/hookform/hookform{Input,InputPassword,Select}.tsx` | `noUselessFragments` | `return <></>` → `return null` no caminho `hidden`; tipo de retorno de `HookFormInput` alargado para `React.ReactElement \| null`. |
| `packages/design-system/styles/globals.css` | `noDescendingSpecificity` | Trocada a ordem das duas regras `.anticon` do dropdown antd. **São mutuamente exclusivas** (`:not(.…-danger)` vs `.…-danger`), então a ordem não altera a cascata — validado visualmente (ver §Validação visual). |
| `packages/seo/json-ld.tsx` | `noDangerouslySetInnerHtml`, `noBarrelFile`, `suppressions/unused` | Removida a suppression inline duplicada; as duas de arquivo ganharam razão real. |
| `apps/api/__tests__/{adminGuard,userRepositoryList,usersRoute}.test.ts`, `apps/app/__tests__/sidebarPersistence.test.tsx` | `suppressions/unused` ×4 | Comentários `biome-ignore` que já não suprimiam nada — apagados. |
| 7 barris (`packages/sdk/src/types/**`, `packages/shared/utils/**`, `packages/design-system/.../hookform/index.ts`) | `noBarrelFile` | Razão real: são a superfície pública do pacote. |

**Nenhum `<explanation>` restou no repositório dentro do escopo do Biome.** Os que sobram estão em
`packages/design-system/components/ui/*`, que está fora do escopo de propósito e **não foi tocado**.

---

## P1 — Comando de lint fixado no lockfile

`package.json` (raiz):

```diff
-  "check": "npx ultracite@latest check",
-  "fix":   "npx ultracite@latest fix",
+  "check": "biome check --no-errors-on-unmatched ./",
+  "fix":   "biome check --write --no-errors-on-unmatched ./",
```

`ultracite@6.0.3` **permanece** em `devDependencies` (fornece os presets que `biome.jsonc:3` estende).

**Prova de equivalência (executada, não estimada).** Com o repo limpo os dois comandos dão
`Checked 383 files` / 0 diagnósticos. Como isso é fraco, injetei um arquivo com 4 defeitos deliberados
(`console.log`, formatação, `useBlockStatements`) e rodei os dois no mesmo commit:

| Comando | Saída | Exit |
|---|---|---|
| `npx ultracite@latest check` | `Checked 384 files` · `Found 4 errors` | 1 |
| `biome check --no-errors-on-unmatched ./` | `Checked 384 files` · `Found 4 errors` | 1 |

Contadores e exit code idênticos; o arquivo-sonda foi removido em seguida.

---

## P2 — `apps/api` em ambiente `node`

- `apps/api/vitest.config.mts`: `environment: "jsdom"` → `"node"`; `plugins: [react()]` e o import de
  `@vitejs/plugin-react` removidos.
- `apps/api/package.json`: `@vitejs/plugin-react` fora das `devDependencies`.

**Gate: 107/107 verdes.** `environment` no relatório do vitest caiu de ~25,9 s para **2 ms**.

---

## P3 — `apps/web` na suíte

**Arquivos novos**
- `apps/web/vitest.config.mts` — `environment: "node"`, aliases `@` e `@repo`, **sem** jsdom e **sem**
  plugin react (exatamente o §7.5).
- `apps/web/__tests__/seo.test.ts` — **15 testes** sobre `getWebBaseUrl` (precedência das 3 fontes,
  `https://` implícito, `http://` preservado, barra final e espaços) e `buildLocaleMetadata`
  (conjunto exato `pt-br`/`en`/`es`/`x-default`, canonical por locale, `x-default` seguindo
  `NEXT_PUBLIC_DEFAULT_LOCALE`, path default, mapa de Open Graph locale, fallback `en_US`).

**`apps/web/package.json`**: script `"test": "NODE_ENV=test vitest run"` + `vitest` explícito em
`devDependencies` (não herdado por hoisting).

**Prova de que o teste é load-bearing** — três mutações no `apps/web/shared/lib/seo.ts`, cada uma
revertida em seguida:

| Mutação | Resultado |
|---|---|
| Inverter a precedência `NEXT_PUBLIC_WEB_URL` ↔ `VERCEL_PROJECT_PRODUCTION_URL` | 🔴 1 teste falha |
| Remover a linha do `x-default` | 🔴 3 testes falham |
| Remover a normalização de barra final | 🔴 1 teste falha |
| Revertido | 🟢 15/15 (`git diff` do arquivo vazio) |

⚠️ Conforme instruído, as strings pt-br hardcoded de `apps/web/app/[locale]/sign-{in,up}/validations/`
**não** foram congeladas em teste — continuam sendo um bug de i18n em aberto, não coberto.

---

## P4 — Saneamento dos `typecheck`

| Workspace | Ação |
|---|---|
| `apps/email` | script `typecheck` **removido** (só versiona `package.json` + `tsconfig.json`) |
| `@repo/typescript-config` | script `typecheck` **removido** (pacote de configs JSON, sem `tsconfig.json` próprio) |
| `@repo/analytics` | `packages/analytics/server.ts` **apagado** — zero importadores, `posthog-node` não instalada, lia 2 chaves que `keys.ts` não declara. O pacote não tem `exports` map, então nada apontava para ele. |
| `@repo/sdk` | script **adicionado** — passou de primeira |
| `@repo/internationalization` | script **adicionado** — ver achado abaixo |
| `@repo/auth` | script **adicionado** — ver achado abaixo |
| `@repo/shared` | **fora do corte** (Q6), como planejado |

**Gate: os 13 workspaces que declaram `typecheck` passam.** Nenhum `skipLibCheck` novo, nenhum
`@ts-ignore`, nenhuma exclusão silenciosa.

### 🔴 Achado 1 — `packages/internationalization/next-headers.d.ts` mentia sobre o Next

O pacote falhava com `TS2305: Module '"next/headers"' has no exported member 'cookies'` mesmo tendo
`next: 16.0.0` como dependência. Causa: um arquivo versionado desde o commit inicial declarava um
**módulo ambiente** `next/headers` expondo só `headers()` — e `declare module` vence os tipos reais do
pacote. Como nenhum app o importa, ele nunca entrava no programa dos apps; só aparecia ao checar o
pacote isoladamente. Ou seja: `server.ts` usa `cookies()`, que a declaração ambiente nem previa.

**Ação: arquivo apagado.** Com isso o pacote passa **com o `tsconfig.json` original, sem nenhuma
alteração de config.**

### 🔴 Achado 2 — `@repo/auth` tinha config e `@types/react` divergentes

Duas causas somadas, 56 erros:
1. `tsconfig.json` estendia `base.json` com `"jsx": "react"` (runtime clássico) — mas os componentes
   não importam `React`, porque os apps os compilam com o runtime automático. Resultado: 48×
   `TS2686 'React' refers to a UMD global`. E `moduleResolution: NodeNext` quebrava imports relativos
   de `@repo/shared` (`TS2835`).
2. `@types/react: ^19.2.13` — **o único workspace fora do pino `19.2.2`** usado por todos os outros.
   Isso instalava uma segunda árvore de `@types/react` (e de `csstype` 3.2.3 vs 3.1.3), produzindo
   erros de "dois tipos com o mesmo nome, não relacionados" em `design-system/components/ui/{input,spinner,label}.tsx`.

**Ações**: `packages/auth/tsconfig.json` passou a estender `react-library.json` (preset do próprio
repo, `jsx: react-jsx`) com `module: ESNext` + `moduleResolution: Bundler` — o mesmo par que
`@repo/sdk` já usava e que faz ele passar. E `@types/react` alinhado em `^19.2.2`. Resultado: **0 erros**.
O tsconfig só é usado para typecheck (`--noEmit`); nenhum app o consome.

---

## P5 — Dependências não declaradas

`apps/web/package.json` ganhou em `dependencies`:

```diff
+    "@repo/internationalization": "workspace:*",
+    "@repo/shared": "workspace:*",
```

Fecha o cache-hit-errado do §3.2 (o `web#typecheck`/`web#test` não invalidava quando esses pacotes
mudavam). `@repo/shared` virou **dependência real de runtime** na mesma passada: o
`language-switcher.tsx` da web agora importa `setCookie` de lá.

`pnpm-lock.yaml` regravado por `pnpm install` (também reflete a saída do `@vitejs/plugin-react` da api,
a entrada de `vitest` na web e o realinhamento de `@types/react` em `@repo/auth`).

---

## Desvios em relação ao plano

1. **`apps/api/instrumentation-client.ts` apagado.** Não estava na lista das 4 deleções autorizadas,
   mas era o segundo `noEmptySource` que o P0.c manda resolver e o plano não dizia como. O arquivo tinha
   só um comentário, sem export — o Next o carrega por convenção, então um módulo de corpo vazio não faz
   nada. Apagar é sem efeito em runtime. `specs/observability-logging.md:32` já o citava como lacuna;
   quando aquela spec for implementada, o arquivo volta com conteúdo.
2. **Deduplicação do `setCookie` nos dois `LanguageSwitcher`.** O plano só pedia "resolver
   `noDocumentCookie`/`noMagicNumbers`". Reusar o `setCookie` de `@repo/shared` (implementação
   byte-equivalente, já existente) resolveu 4 erros na web + 2 warnings no app **e** deixou uma única
   suppression de `noDocumentCookie` no repo, em vez de três cópias.
3. **`Container.children` passou a opcional** em `apps/app/shared/components/ui/Container.tsx`, para que
   as duas páginas-placeholder virem `<Container />` em vez de `<Container>{null}</Container>`.
   Alargamento de tipo, sem quebra para os chamadores existentes.
4. **Refactor do `packages/auth/middleware.ts` e do `getFirebaseApp`** — mais do que "silenciar a regra",
   mas `noExcessiveCognitiveComplexity` não tem correção mecânica e suprimi-la esconderia justamente a
   duplicação tripla que causava o número. Comportamento preservado em ambos.
5. **Mudanças de tsconfig/devDep em `@repo/auth`** (achado 2 acima). Sem elas o gate do P4 —
   "todo script `typecheck` passa" — seria inalcançável com o script adicionado, e o plano §7.6 previa
   exatamente esta bifurcação ("ou corrige ou fica fora deste corte"). Escolhi corrigir por ser barato.

**Nenhum item do P0–P5 ficou por fazer. Nenhum bloqueio.**

---

## Achados novos (para o `/spec --sync`, não para esta tarefa)

- 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com `expires` de 180 dias,
  mas `apps/web/proxy.ts:60` e `apps/app/proxy.ts:87` fazem `cookieStore.set("x-locale", …)` **sem
  `maxAge`** na requisição seguinte, sobrescrevendo por um cookie de sessão. Verificado no browser:
  após trocar o idioma, `expires = -1`. Nada a ver com esta tarefa (o proxy não foi tocado), mas o efeito
  é que a preferência de idioma se perde ao fechar o navegador.
- 🟡 **`@repo/auth` declara `next: 15.1.3`** enquanto os três apps usam `16.0.0` — é a origem do aviso
  `deprecated next@15.5.2` no `pnpm install`. Não mexi: é bump de dependência de runtime, escopo próprio.
- 🟡 **Strings de UI soltas** encontradas de passagem, fora do escopo do lint: `"Switch language"`
  (`sr-only`) nos dois `LanguageSwitcher`, e `"Início"` + `href="/painel"` hardcoded em
  `apps/app/shared/components/ui/PageBreadcrumb.tsx`. Violam a regra de ouro 2.
- 🟡 **`cases-client.tsx` tem um `setTimeout` sem cleanup** no `useEffect` (vaza a cada `current`).
  Pré-existente; não corrigido para manter a passada em saneamento.
- ℹ️ `@types/react@19.0.10` continua instalado por alguma dependência transitiva (3ª cópia). Não
  investigado — não afeta nenhum `typecheck`.

---

## Validação

Todos executados no working tree final:

| Comando | Resultado |
|---|---|
| `pnpm check` | `Checked 383 files` · **0 erros, 0 warnings** · exit 0 |
| `pnpm test --force` | **4 tasks, 4 sucessos** · api 107 · app 135 · web 15 · i18n 2 · 5,3 s |
| `pnpm test` (2ª vez) | `FULL TURBO`, 120 ms |
| `pnpm --filter @repo/internationalization test` | 2/2 (paridade pt-br/en/es) |
| `typecheck` em 13 workspaces | todos exit 0 |

`turbo run lint typecheck` ainda **não** existe — é o P6, passada 2.

---

## Validação visual (`agent-browser`)

Obrigatória porque o P0.b formatou `apps/app`, `apps/web` e `packages/design-system`. Os três dev servers
subiram (`web` 3001, `app` 3000, `api` 3002) e os comandos do `agent-browser` foram executados
**estritamente em sequência**. Screenshots em `docs/features/ci-pipeline/develop/screenshots/`.

**PII**: a lista de usuários foi filtrada por `qa-` **antes** de qualquer captura, e a impersonação foi
trocada para `QA Owner B`. Conta criada para o teste: `qa-ci-admin@example.com` (admin, projeto de dev
`next-boilerplate-576d0`) — deixada no projeto, como as demais contas `qa-` de QAs anteriores.

| Fluxo | Tema / viewport | Screenshot |
|---|---|---|
| web — home completa | light 1440×900 | `web-home-light-full.png`, `web-home-light.png` |
| web — home completa | dark 1440×900 | `web-home-dark-full.png` |
| web — home | dark 390×844 | `web-home-mobile-dark.png` |
| web — pricing | dark | `web-pricing-dark.png` |
| web — contact | dark | `web-contact-dark.png` |
| web — troca de idioma (menu aberto + navegação pt-br→en) | dark | `web-language-menu-dark.png` |
| web — sign-up (vazio + validação) | dark | `web-signup-dark.png`, `web-signup-validation-dark.png` |
| app — sign-in | dark | `app-signin-dark.png` |
| app — home admin | dark | `app-admin-home-dark.png` |
| app — lista de usuários (Table antd) | dark / light / mobile light | `app-admin-users-{dark,light,mobile-light}.png` |
| app — **dropdown antd com item `danger`** | dark | `app-admin-row-menu-dark.png` |
| app — criar usuário (vazio + validação) | dark / light | `app-admin-user-create-{dark,validation-dark,light}.png` |
| app — home do painel comum | dark | `app-common-home-dark.png` |
| app — lista de entidades (estado vazio + banner read-only) | dark | `app-entities-list-dark.png` |

**O que foi confirmado, e não só "abriu":**
- **`globals.css`** (a mudança de maior risco): no dropdown de ações, "Editar" mantém o ícone na cor
  `foreground` e "Excluir" mantém texto **e ícone** em `destructive` — em **light e dark**. A troca de
  ordem das duas regras não alterou a cascata, como esperado por serem mutuamente exclusivas.
- **`cases-client.tsx`**: o carrossel segue mostrando 15 slots numerados de 1 a 15 (`CASE_LOGO_SLOTS`).
- **`stats.tsx` / `contact-form-client.tsx`**: os dois cards e os dois benefícios renderizam — as chaves
  por título não colidem.
- **`HookForm*`**: o caminho de erro renderiza label vermelho, borda destructive e mensagem, tanto na
  web quanto no app — o `return null` e o alargamento do tipo não quebraram nada.
- **`Header.tsx`** (rename `page` → `breadcrumb`): breadcrumb "Início › Usuários › Criar Usuário" correto.
- **`<Container />`**: as duas páginas-placeholder renderizam o painel `bg-muted/50` vazio, como antes.
- **`setCookie` de `@repo/shared`**: trocar o idioma navega para `/en/pricing` e grava `x-locale=en`.

**Console**: zero erro novo. Os que aparecem já estão catalogados em `specs/BACKLOG.md:205`
(id do Radix no `DropdownMenuTrigger`, "Select is changing from uncontrolled to controlled") ou são o
`<a>` dentro de `<a>` / `<button>` dentro de `<button>` do `NavigationMenu` da web — todos pré-existentes,
confirmados por `git diff` nos arquivos envolvidos.

---

## Lacunas conhecidas para o `/review` e o `/test`

**Para o `/review`**
- O diff tem **119 arquivos**. A esmagadora maioria é o P0.b (formatação). O plano de commits do §7.13
  continua válido; o commit de formatação precisa sair **isolado**, sem edição manual junto.
- **Ordem sugerida de leitura**, do que tem risco real para o que não tem:
  `packages/auth/{client,middleware}.ts` → `packages/design-system/styles/globals.css` →
  `packages/{internationalization,shared}/**/cookies.ts` → `apps/*/…/LanguageSwitcher|language-switcher`
  → `packages/auth/{tsconfig,package}.json` → resto.
- Dois commits do §7.13 mudam de forma: o commit 9 (`chore(packages): fix the broken typecheck scripts`)
  agora inclui a deleção de `next-headers.d.ts` e o realinhamento de `@types/react`; o commit 10
  (`chore: declare the missing workspace dependencies`) fica acoplado ao commit da web, porque o
  `language-switcher` passou a importar `@repo/shared`.
- Confirmar que `packages/design-system/components/{ui,lib,hooks}` seguem intocados (é o caso).

**Para o `/test`**
- `apps/web/__tests__/seo.test.ts` é a **única** suíte nova. `apps/web/app/sitemap.ts` continua sem teste
  (era opcional no §8.1) — 5 rotas × 3 locales é barato e load-bearing, bom candidato.
- **Sem cobertura automatizada** para o refactor do `packages/auth/middleware.ts` e do `getFirebaseApp`
  (`packages/auth/client.ts`). `@repo/auth` não tem suíte alguma. Foram validados só por leitura e pelos
  fluxos de login percorridos no browser. **É a maior lacuna desta passada** — o `resolveNextMiddleware`
  (rota protegida vs. pública, factory vs. middleware por aridade, o caminho de catch de "Firebase Admin
  credentials") merece testes de unidade.
- `getCookie` de `@repo/shared` e de `@repo/internationalization` foi reescrito sem cobertura direta.
  Casos a fixar: espaço à esquerda, nome que é prefixo de outro, cookie ausente, valor vazio.
- A validação do fluxo de **criar/editar entidade** foi feita só até o estado vazio da lista: a conta de
  teste é admin, e no painel comum ela cai em impersonação read-only. Um usuário comum com senha
  conhecida destravaria o CRUD completo.
- O teste de paridade de i18n continua verde, mas **nenhuma chave nova** foi criada nesta passada.

---
---

# Handoff — `ci-pipeline`, passada 2 (P6 → P10, o pipeline em si)

> Segunda e **última** metade do plano. A passada 1 (P0–P5) continua acima, intacta.
> **Nada foi commitado e nenhuma branch foi criada** — tudo segue no working tree, para o `/review`.

## Placar dos gates depois da passada 2

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | `Checked 383 files` · **0 erros / 0 warnings** · exit 0 |
| Os 3 gates juntos | `turbo run lint typecheck test --force` | **18 tasks, 18 sucessos**, 26,4 s |
| Cache | 2ª execução consecutiva | **`FULL TURBO`, 18/18 cached, 201 ms** |
| Hermeticidade de env | `turbo run lint typecheck test --force --env-mode=strict` | **18/18 verdes**, 23,2 s |
| Testes | `pnpm test --force` | 4 tasks · api 107 · app 135 · web 15 · i18n 2 = **259** |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 2/2 |
| Lockfile | `pnpm install --frozen-lockfile` | exit 0, `Lockfile is up to date` |
| `api#build` sem chave da Stripe | `turbo run build --filter=api --force` | **passa** (antes: falhava no *collect page data*) |

As 18 tasks são **1 `//#lint` + 13 `typecheck` + 4 `test`**. (`turbo run typecheck --dry` enumera 16
pacotes, mas só 13 declaram o script — os 3 restantes foram removidos no P4.)

---

## P6 — `turbo.json`: `//#lint` e `typecheck`

**`turbo.json`**

```diff
-  "globalDependencies": ["**/.env.*local"],
+  "globalDependencies": ["**/.env.*local", "**/.env"],
   "tasks": {
+    "//#lint":   { "outputs": [], "env": [] },
+    "typecheck": { "dependsOn": [], "outputs": [], "env": [] },
     "build": { … },
-    "test": { "dependsOn": ["^test"] },
+    "test": { "dependsOn": ["^test"], "env": [] },
```

**`package.json` (raiz)** — `"lint": "pnpm run check"`. Delegar em vez de repetir a linha do Biome mantém
uma fonte única: `pnpm check`, `pnpm lint` e `turbo run lint` executam literalmente o mesmo processo.
Nenhum workspace declara script `lint`, então não há colisão com o `//#lint`.

### `inputs` do `//#lint`: verificado, e **não** declarado

O plano (§7.8) pedia para conferir antes de presumir. `turbo run lint --dry=json` mostra que o default de
uma task da raiz já tem **816 inputs**, cobrindo o repositório inteiro — inclusive `biome.jsonc`,
`turbo.json`, `package.json` e todos os `package.json` de workspace. Declarar
`inputs: ["$TURBO_DEFAULT$", "biome.jsonc"]` seria redundante, então **o `inputs` ficou de fora**.
Efeito colateral correto: qualquer arquivo do repo invalida o cache do lint — que é exatamente o escopo
do que o Biome varre.

### `globalDependencies: **/.env` — provado, não presumido

Anexei uma linha ao `apps/api/.env`, rodei `turbo run lint typecheck test` e as **18 tasks saíram de
cache** (`0 cached, 18 total`). Restaurado o arquivo byte a byte, a execução seguinte voltou a
`FULL TURBO`. O furo do §6.5 está fechado.

---

## P7 — Env por task (rota A)

`env: []` em `//#lint`, `typecheck` e `test`; `envMode` global permanece `loose` e o `build` fica
intocado, como decidido em Q7. Gate: `--env-mode=strict` verde nas 18 tasks.

---

## P8 — `.github/workflows/ci.yml`

Arquivo novo, 1 job (`verify`), exatamente o YAML do §7.10. Os dois únicos comentários do arquivo
explicam por que `pnpm/action-setup` não tem `version:` e por que o `setup-node` vem **depois** dele.

**Critérios verificáveis conferidos por grep no arquivo entregue:**

| Critério | Resultado |
|---|---|
| nenhum `${{ secrets.* }}` | ✅ zero ocorrências |
| `build` ausente | ✅ nenhuma ocorrência da palavra |
| `pnpm/action-setup@v4` sem `version:` | ✅ |
| `node-version-file: .nvmrc` + `cache: pnpm`, nesta ordem | ✅ |
| `--frozen-lockfile` · `concurrency` + `cancel-in-progress` · `timeout-minutes: 15` · `fetch-depth: 2` | ✅ |

### 🔴 Lockfile: conferido, e **estava** sincronizado

Risco levantado no enunciado (`--frozen-lockfile` derrubar o CI no dia 1 por causa das mudanças de
`package.json` da passada 1). Medido em dois passos: `pnpm install --lockfile-only` **não altera um byte**
do `pnpm-lock.yaml` (`diff -q` idêntico), e `pnpm install --frozen-lockfile` sai 0 com
`Lockfile is up to date, resolution step is skipped`. A passada 1 já havia regravado o lockfile.

### ✅ O workflow foi executado de verdade, não só lido

**`act` estava disponível** (0.2.85, Docker rodando). `act pull_request -j verify
--container-architecture linux/amd64` executou o job inteiro num container `ubuntu:act-latest`:
`pnpm/action-setup` → `setup-node` (Node do `.nvmrc`, cache do pnpm salvo com sucesso) →
`pnpm install --frozen-lockfile` → `pnpm turbo run lint typecheck test` → **18 tasks, 18 sucessos** →
`🏁 Job succeeded`. Ou seja: a sintaxe do YAML, a resolução das 3 actions, a ordem dos steps e o comando
final estão provados num runner Linux.

**Ressalva honesta:** o `act` faz bind do diretório do host, então o `pnpm install` daquele run encontrou
`node_modules` já populado — ele validou o lockfile, mas não foi uma instalação do zero. Por isso a prova
foi complementada abaixo.

### ✅ Ambiente limpo, sem nenhum segredo — o sinal de pronto `:104`

Cópia do working tree para `/tmp` **sem** `node_modules`, `.next`, `.turbo`, `.git` e **sem nenhum
`.env`** (confirmado por `find`), com `STRIPE_*` removidas do ambiente:

```
pnpm install --frozen-lockfile            → 10,6 s, exit 0
pnpm turbo run lint typecheck test        → 18 tasks, 18 sucessos, 24,1 s, exit 0
pnpm turbo run lint typecheck test (2ª)   → FULL TURBO, 111 ms, exit 0
```

**Um clone sem segredo algum roda o pipeline até o fim.** O diretório temporário foi apagado.

### ✅ Os 4 defeitos deliberados do §8.2 derrubam o gate

Executados na mesma cópia descartável, um de cada vez, cada um revertido em seguida:

| Defeito | Resultado |
|---|---|
| (a) `console.log` num arquivo novo | 🔴 `//#lint` falha, exit 1 (15/18 tasks) |
| (b) `const x: number = "string"` em `@repo/sdk` | 🔴 `@repo/sdk:typecheck` — `error TS2322`, exit 2 |
| (c) `expect(1).toBe(2)` em `apps/web/__tests__/` | 🔴 `web:test` — 1 failed / 15 passed, exit 1 |
| (d) chave removida **só** do `es` em `translations/apps/web/pages/hero` | 🔴 `parity.test.ts` — `[globalTranslations] es faltando: apps.web.pages.hero.announcement` |

O (d) é o cenário literal do sinal de pronto da spec, e é pego pelo teste de paridade.

### 🟡 Observação de comportamento (não é defeito, é decisão a tomar depois)

`turbo run lint typecheck test` **aborta as tasks restantes na primeira falha** (default `--continue=false`).
No probe (b) o `//#lint` quebrou junto e o typecheck nem chegou a rodar — foi preciso isolar com
`turbo run typecheck` para observar o `TS2322`. Consequência prática: uma PR com lint **e** teste quebrados
mostra só o lint, e o autor descobre o teste no push seguinte. `--continue` resolveria, mas divergiria do
comando local, contra o critério "o comando local e o do CI são o mesmo". **Deixado como está**; registrado
como decisão em aberto.

---

## P9 — Documentação

| Arquivo | O que mudou |
|---|---|
| `CLAUDE.md` (§"Comandos essenciais") | `pnpm turbo run lint typecheck test` no bloco de comandos; parágrafo curto explicando que as 3 são tasks do turbo com `env: []`, que `lint` é task da **raiz**, e que essa é literalmente a linha do CI. `pnpm check` deixou de ser descrito como "Ultracite/Biome". |
| `docs/SETUP.md` | Seção nova **"CI — GitHub Actions"** antes de "Conductor": tabela do que roda/quando/com quê, três consequências (comando idêntico dos dois lados, `build` fora de propósito, `--frozen-lockfile` como gate) e o **runbook de branch protection** em 5 passos, com o teste de verificação (PR com `console.log` tem de bloquear o merge). |
| `docs/review-checklist.md` | Bloco **"O que a máquina já cobre"** no topo, com a tabela lint/typecheck/test↔paridade e o aviso de que o `build` **não** está no CI. Item de testes ganhou a nota de que teste quebrado agora bloqueia o merge, não só o build. |
| `docs/TASK-PIPELINE.md` | Parágrafo "O CI é o gate final, não o `/review`" — o que muda é o **foco** da revisão humana, não a obrigação de rodar antes de commitar. |
| `docs/AI-WORKFLOW.md` | Fluxo informal passa a mandar rodar `pnpm turbo run lint typecheck test`; seção do harness ganha a nota de que o hook de branch e a disciplina local só existem no clone com ferramental de IA — quem garante em toda PR é o `ci.yml`. |
| `apps/web/CLAUDE.md` | Seção **"Testes"** nova: onde ficam, como rodar, `environment: "node"` sem jsdom/react, os aliases `@`/`@repo`, o aviso de que `turbo build` depende de `test`, e a proibição explícita de congelar em teste as strings pt-br de `sign-{in,up}/validations/`. |

**`specs/ci-pipeline.md` e `specs/BACKLOG.md` não foram tocados** (é do `/spec --sync`). Nenhum texto novo
cita `plan.md`, `handoff.md`, `STATE.md`, `docs/features/` ou o fluxo de agents.

---

## P10 — Cliente Stripe preguiçoso

**`packages/payments/index.ts`** — `export const stripe = new Stripe(…)` em escopo de módulo virou
`export const getStripe = (): Stripe | null`, memoizado, que devolve `null` quando não há chave. Mesmo
espírito de `packages/security/index.ts:16-18`. O único comentário do arquivo é a regra autocontida (o SDK
rejeita chave vazia, então o cliente só pode nascer quando houver chave).

**Importadores conferidos antes de mudar a forma do export** — `grep "@repo/payments"` em `apps/` e
`packages/` devolve exatamente 3 pontos: `apps/api/.../webhooks/payments/route.ts` (o `stripe` e o
`type Stripe`), `apps/api/env.ts` (só `@repo/payments/keys`, não mexido) e o `package.json` da api. Não há
consumidor no `apps/app` nem no `apps/web`.

**`apps/api/app/(routes)/webhooks/payments/route.ts`** — `const stripe = getStripe()` no topo do `POST`, e
o guard existente virou `if (!(stripe && env.STRIPE_WEBHOOK_SECRET))`, respondendo o mesmo
`{ message: "Not configured", ok: false }` de antes. O `type Stripe` continua importado como tipo.

### Prova nos dois sentidos — executada

**(a) Sem chave da Stripe, o build passa do `/webhooks/payments`.** A/B real, com os dois arquivos
guardados em `git stash` e devolvidos em seguida:

| Código | `turbo run build --filter=api --force` |
|---|---|
| **antes** (HEAD) | 🔴 `Error: Neither apiKey nor config.authenticator provided` → `Failed to collect page data for /webhooks/payments` |
| **depois** | 🟢 `Compiled successfully` · `Generating static pages (13/13)` · `/webhooks/payments` listada · **3 tasks, 3 sucessos** |

E com o `apps/api/.env` **removido inteiro** (clone limpo de verdade), o build agora falha em
`Firebase Admin credentials are not configured…` no `/auth/sign-up` — ou seja, exatamente a parada
esperada e prevista pelo plano, e **não** mais na Stripe. É por isso que o `build` segue fora do CI.

**(b) Com a chave presente, o webhook continua funcionando.** `next build` + `next start -p 3002` com
`STRIPE_SECRET_KEY=sk_test_…` e `STRIPE_WEBHOOK_SECRET=whsec_…`, e três POSTs em
`/webhooks/payments` com o corpo assinado em HMAC-SHA256 (mesmo esquema `t=…,v1=…` da Stripe):

| Requisição | Resposta |
|---|---|
| assinatura **válida** | **200** `{"result":{"id":"evt_ci_probe",…,"type":"checkout.session.completed"},"ok":true}` |
| assinatura inválida | 500 `{"message":"something went wrong","ok":false}` |
| sem header `stripe-signature` | 500 `{"message":"something went wrong","ok":false}` |

Ou seja: `getStripe()` devolveu um cliente real e `constructEvent` verificou a assinatura de ponta a ponta.
**Controle negativo**: o mesmo servidor reiniciado **sem** as variáveis responde **200**
`{"message":"Not configured","ok":false}` — degrada em no-op, não explode. Nenhuma chamada de rede à
Stripe é feita em nenhum dos caminhos.

> ⚠️ Detalhe descoberto na medição, **pré-existente e não corrigido**: em `NODE_ENV=development` o
> `apps/api/env.ts` usa `skipValidation: true`, e o `@t3-oss/env-nextjs` nesse modo devolve só o
> `runtimeEnv` local — sem as chaves herdadas via `extends`. Consequência: `env.STRIPE_WEBHOOK_SECRET` é
> `undefined` em `next dev` **mesmo com a variável exportada**, e o webhook responde "Not configured".
> Foi por isso que a prova (b) precisou de `next start`. Nada a ver com o P10; registrado como achado.

---

## Desvios em relação ao plano (passada 2)

1. **`inputs` do `//#lint` não foi declarado.** O plano previa `["$TURBO_DEFAULT$", "biome.jsonc"]` *"se
   `$TURBO_DEFAULT$` não cobrir"*. A verificação pedida (`--dry=json`) mostrou que cobre — 816 inputs,
   `biome.jsonc` incluído. Declarar seria redundante.
2. **`"lint": "pnpm run check"`** em vez de repetir a linha do Biome no `package.json` da raiz. Evita duas
   cópias do comando que o P1 acabou de unificar.
3. **`packages/payments/ai.ts` NÃO foi corrigido**, apesar de ter o gêmeo exato do defeito
   (`new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY || "" })` em escopo de módulo). Motivo:
   o módulo **não tem nenhum importador** (`index.ts` não o reexporta), então não quebra build nenhum hoje,
   e o corte autorizava **uma** mudança de código de produção. Registrado abaixo como achado.
4. **Nenhum outro desvio.** P6–P10 saíram como planejados.

---

## Achados novos da passada 2 (para o `/spec --sync`, não para esta tarefa)

- 🔴 **`packages/payments/ai.ts:4-5` tem o mesmo defeito que o P10 corrigiu** — `StripeAgentToolkit`
  instanciado em escopo de módulo com `keys().STRIPE_SECRET_KEY || ""`. Não explode hoje porque nada
  importa `@repo/payments/ai`; explodiria no primeiro fork que importasse. A correção é o mesmo padrão de
  5 linhas — ou a deleção, se o toolkit for código morto herdado do upstream.
- 🟡 **`env.ts` da api perde as chaves de `extends` em desenvolvimento.** Com `skipValidation: true` o
  `@t3-oss/env-nextjs` devolve só o `runtimeEnv` local, então `env.STRIPE_WEBHOOK_SECRET` (e qualquer
  outra vinda de `auth()`, `core()`, `email()`, `payments()`) é `undefined` em `next dev`. Isso torna o
  webhook da Stripe **inalcançável em desenvolvimento**, inclusive via `dev:with-stripe`.
- 🟡 **`turbo run` aborta na primeira falha**, então uma PR com dois tipos de defeito só mostra um por vez
  (ver P8 acima).
- ℹ️ `apps/api/vercel.json` tem `ignoreCommand: node scripts/skip-ci.js`, que pula o build quando o commit
  contém `[skip ci]`. O `ci.yml` **não** honra esse marcador — um commit com `[skip ci]` pula o deploy da
  Vercel mas roda o CI do GitHub. É o comportamento desejado (verificação não deve ser pulável), mas vale
  saber que os dois "skip" não são o mesmo.

---

## Validação visual — **não se aplica a esta passada**

P6–P10 **não tocam nenhum pixel**. A lista completa do que a passada 2 alterou são 11 arquivos:
`turbo.json`, `package.json` da raiz, `.github/workflows/ci.yml` (novo), `packages/payments/index.ts`
(`server-only`, sem consumidor no front), `apps/api/app/(routes)/webhooks/payments/route.ts` (rota de API,
sem UI) e 6 arquivos de documentação (`CLAUDE.md`, `apps/web/CLAUDE.md`, `docs/SETUP.md`,
`docs/review-checklist.md`, `docs/TASK-PIPELINE.md`, `docs/AI-WORKFLOW.md`). **Zero componente, zero
estilo, zero rota de front.** (O `git diff` do working tree é maior porque ainda carrega a passada 1.)

A validação visual completa (20 screenshots, light/dark/mobile nos dois apps) foi feita na **passada 1**,
que era onde de fato havia risco de regressão visual (o auto-fix do Biome). Ela **não** foi repetida aqui,
por não haver o que revalidar.

O que substituiu a validação visual como prova de comportamento foi o **exercício em runtime do P10**: build
de produção da api, servidor real no ar e três POSTs assinados no webhook, com controle negativo (seção P10
acima).

---

## Lacunas conhecidas para o `/review` e o `/test`

**Para o `/review`**
- Arquivos da passada 2: `turbo.json`, `package.json` (raiz), `.github/workflows/ci.yml` (novo),
  `packages/payments/index.ts`, `apps/api/app/(routes)/webhooks/payments/route.ts`, `CLAUDE.md`,
  `apps/web/CLAUDE.md`, `docs/{SETUP,review-checklist,TASK-PIPELINE,AI-WORKFLOW}.md`.
- **O único risco real está em `packages/payments/index.ts` + a rota do webhook** — é a única mudança de
  código de produção do corte inteiro. Comece por aí.
- Plano de commits: o §7.13 continua válido. Os commits 12 (`chore: add lint and typecheck to the turbo
  task graph`) e 13 (`ci: verify lint, types and tests on every pull request`) ganham, respectivamente, o
  script `lint` do `package.json` da raiz e o arquivo `.github/workflows/ci.yml`. O commit 11
  (`fix(payments): …`) agora inclui **também** a rota da api que consome o export — não dá para separar sem
  deixar um commit que não compila.

**Para o `/test`**
- 🔴 **A prova real do pipeline é uma PR vermelha e uma verde no GitHub**, e isso não pode ser feito
  localmente: exige branch remota, PR aberta e o runner do GitHub. O `act` provou o job num container e os
  4 defeitos deliberados provaram os gates, mas **o comportamento do check na interface da PR (status
  check aparecendo com o nome `verify`, merge bloqueado) continua não verificado**. É a maior lacuna.
- 🔴 **O runbook de branch protection não foi executado** — é ação humana no GitHub, explicitamente fora da
  entrega (Q1). Enquanto não for feito, o CI **sinaliza mas não bloqueia**.
- 🟡 **`packages/payments` não tem suíte.** `getStripe()` merece teste de unidade: sem chave devolve `null`;
  com chave devolve instância; chamadas repetidas devolvem **a mesma** instância (memoização). Hoje só está
  coberto pelo exercício manual descrito acima.
- 🟡 **A rota do webhook não tem teste.** Os três caminhos exercitados à mão (assinatura válida / inválida /
  ausente) e o caminho "não configurado" são candidatos diretos, mockando `@repo/payments`.
- 🟡 `apps/web/app/sitemap.ts` continua sem teste (era opcional no §8.1) — segue valendo como candidato
  barato.
- As lacunas da passada 1 (`packages/auth/middleware.ts`, `getFirebaseApp`, os dois `getCookie`)
  **continuam abertas** e continuam sendo a maior dívida de teste do conjunto.

**Resíduos no disco (não versionados)**: as medições de build deixaram `apps/api/.next/`. Ignorado por
`.gitignore`; `pnpm clean` remove. Nenhum processo ficou rodando e o `apps/api/.env` foi restaurado
byte a byte depois de cada experimento.
