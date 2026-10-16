# Revisão: link de documentação e menu mobile da web

Escopo revisado: `apps/web/env.ts`, `apps/web/app/[locale]/components/header/index.tsx`,
`apps/web/__tests__/docsUrlEnv.test.tsx`, `apps/web/__tests__/headerMobileMenu.test.tsx`, `apps/web/package.json`,
`apps/web/CLAUDE.md`, `pnpm-lock.yaml` e `docs/SETUP.md`. Ficaram de fora o `specs/BACKLOG.md` (auditoria do
backlog, commit próprio) e tudo da tarefa `api-auth-webhook-error-codes`, que divide a branch e terá revisão
própria.

Rodada autônoma do `/cycle`. A revisão não aplicou nenhuma correção de código: o diff não tem defeito confirmável
por leitura. Nenhum commit, nenhum `git add`, nenhuma branch criada ou renomeada.

## Branch

| Item | Valor |
|------|-------|
| Atual | `guilhermebittelbrunn/cycle-2-features-implement` |
| Regex do `/review` sobre a atual | `BRANCH INVALIDA` (prefixo `guilhermebittelbrunn` não é projeto, e falta o `type`) |
| Upstream | nenhum (`git rev-parse @{u}` falha) |
| Commits à frente de `origin/main` | nenhum |
| Nome recomendado | `fix/web-docs-link-and-api-error-codes` |
| Regex sobre o recomendado | `branch OK` |
| Ação tomada | nenhuma, por instrução do orquestrador: a sessão do Conductor está presa à branch atual e quem decide é o usuário |

Por que esse nome: a branch vai receber duas tarefas, uma em `apps/web` e outra em `apps/api`. Com mais de um app,
a regra de `.claude/rules/git-commits.md` manda omitir o `project` (`<type>/<title>`). As duas tarefas corrigem
defeito (o link que nunca aparecia e o menu que não fechava aqui; o contrato de erro fora do padrão na outra),
então o `type` é `fix`. A revisão da segunda tarefa pode ajustar o título.

Como a branch não tem remoto nem commit próprio, renomear com `git branch -m fix/web-docs-link-and-api-error-codes`
é seguro. A alternativa é `git switch -c fix/web-docs-link-and-api-error-codes` a partir da atual. Nenhum commit
pode sair antes dessa decisão.

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- Branch atual com nome inválido (ver seção "Branch"). Fica para o usuário decidir antes do primeiro commit.

### 🟢 Sugestão / nit

- `apps/web/app/[locale]/components/header/index.tsx:332`, `:359`: ao seguir um link do painel, o link focado sai
  do DOM junto com o painel e o foco vai para o `body`. Numa navegação para outra rota isso é o comportamento
  comum do App Router. Seguindo "Início" estando na home (a rota não muda), quem usa teclado fica sem foco
  visível. Não corrigi: devolver o foco ao botão do menu muda comportamento e é vizinho do D6 do plano (Escape,
  clique fora, `aria-controls`). Vai para o `/test` medir e, se confirmado, entra no mesmo achado de backlog do D6.
- `packages/design-system/package.json:25` declara `"radix-ui": "latest"`. Medido nesta revisão: qualquer
  `pnpm install` que precise resolver (bastou acrescentar as três devDependencies da web) sobe o `radix-ui` de
  1.6.7 para 1.8.1 no lockfile, com cerca de 1.380 linhas de diff sem relação com a tarefa. A edição manual do
  lockfile evitou essa deriva, mas a próxima instalação vai trazê-la. Fora do escopo; achado para o backlog.
- `.claude/skills/write-tests/SKILL.md:8` diz que todo `vitest.config.mts` usa `environment: "jsdom"`. A web usa
  `node` como ambiente global (`apps/web/vitest.config.mts:9`) e só o arquivo que declara
  `// @vitest-environment jsdom` roda em jsdom. Fora do escopo; achado para o backlog.
- `apps/web/app/[locale]/components/footer.tsx:85`, `:110` decidem "externo" com `includes("http")`, e o header
  com `startsWith("http")`. Para os valores reais (`/<locale>/...` e a URL da documentação) o resultado é o mesmo.
  O footer não está no diff; não mexi.

### ✅ OK

- `apps/web/env.ts:24`, `:34`: a variável entra no `client` e no `runtimeEnv` com `|| undefined`, como o
  `NEXT_PUBLIC_APP_URL`. Com `skipValidation: true` em `apps/web/env.ts:36` e em `packages/next-config/keys.ts`, o
  `z.url()` do `core()` não roda, e o `""` do `.env.example` vira ausência (regra de string vazia da
  `cycle-policy` §3).
- Modo degradado, por leitura: sem a variável, `FULL_BAR_FROM.lg` (`header/index.tsx:38-43`) devolve exatamente as
  quatro strings de classe de `HEAD`, o `cn` não reordena classes sem conflito, e os `Link` internos recebem
  `rel`/`target` `undefined`, que não vão para o HTML. Isso confirma por leitura o "HTML idêntico byte a byte" que o
  handoff mediu com `renderToString`.
- Classes `xl:*` escritas por inteiro no código (`header/index.tsx:44-49`), então o Tailwind v4 consegue gerá-las.
  Se ele de fato gerou, só o build mostra (item V1 abaixo).
- `onClick={closeMenu}` não chama `preventDefault`, então o `next/link` segue navegando. No link de documentação o
  `target="_blank"` faz o `next/link` deixar o clique com o navegador, e o painel fecha na aba original.
- Comentário de `header/index.tsx:35-36`: restrição de layout, autocontido, sem citar plano nem etapa.
- `isExternal` no escopo do módulo, reaproveitado pela barra e pelo painel, sem mudar o comportamento do painel.
- i18n: nenhuma string nova em JSX. O rótulo vem de `components.header.docs`, que já existe nos três idiomas.
- T1 e T2 mocam nas bordas, importam `vitest` explicitamente e não usam `toBeInTheDocument`. O T1 lê o `env.ts`
  real, que é o ponto da tarefa. O jsdom fica restrito ao arquivo do T2 e o ambiente global segue `node`.
- Contagem de reprovações no código anterior (handoff: 10 de 14), conferida por leitura: os 6 casos do T1 com a
  variável preenchida dependem do `env.ts` novo; os casos 1, 2 e 3 do T2 dependem do `onClick`; o caso "com o
  link" do T2 depende de `xl:hidden` e do `target` na barra. Os 4 restantes passam nos dois códigos.
- `docs/SETUP.md:72`: a web é a única consumidora (único `env.ts` que declara a variável), header e footer abrem em
  aba nova, e a barra cheia começa em 1280 px com o link. As três afirmações batem com o código. `docs/FORKING.md:364`
  já dizia "web, header e footer" e agora está correto.
- `apps/web/CLAUDE.md`: a exceção nova descreve o que o T2 faz.
- Raio de impacto: nenhum contrato público mudou. Os consumidores de `env.NEXT_PUBLIC_DOCS_URL` são
  `header/index.tsx` e `footer.tsx`, que já liam a chave. Os testes `headerMenuButton`, `headerInteractiveNesting`
  e `brandSurfaces` mocam `@/env` com a chave e não conferem classe de breakpoint.

## Lockfile

O handoff conferiu o lockfile só com `--frozen-lockfile --offline`. Esta revisão mediu com rede, numa cópia em
`/tmp/bogota-lockcheck` (só os `package.json`, o `pnpm-workspace.yaml`, o `.npmrc` e o lockfile), sem tocar no
`node_modules` do workspace:

| Medição | Resultado |
|---------|-----------|
| `pnpm install --lockfile-only --ignore-scripts` partindo do lockfile de `HEAD` com o `apps/web/package.json` novo | O importer `apps/web` gerado pelo pnpm é idêntico ao editado à mão (as três entradas, com as mesmas strings de versão e de peer) |
| O mesmo comando, mesma base | O pnpm também refaz outras resoluções: `radix-ui` 1.6.7 → 1.8.1 (especificador `latest`) e o peer `@babel/core` do `geist`, cerca de 1.380 linhas sem relação com a tarefa |
| `pnpm install --lockfile-only` com o lockfile de `HEAD` e o `package.json` de `HEAD` | diff vazio, ou seja, a deriva só aparece quando há resolução |
| `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts` com o lockfile editado | exit 0, arquivo inalterado |

Conclusão: o lockfile editado é o que o pnpm produz para esta mudança, sem a deriva do `radix-ui`, e passa no
`--frozen-lockfile` que o CI usa. Nenhuma correção.

## Correções aplicadas

Nenhuma. O diff não tem defeito confirmável lendo o código, e os nits acima mudam comportamento ou estão fora do
diff.

## Verificar no `/test`

Afirmações do handoff que a leitura não fecha, da mais arriscada para a menos.

| # | Afirmação | Repro sugerido |
|---|-----------|----------------|
| V1 (F2) | Com a variável no build, a barra cheia cabe a 1280 e 1440 px com a marca no centro e quatro itens à esquerda; de 1024 a 1279 aparece o botão do menu. A §1.3 do plano estima ~90 px de folga a 1280, sem descontar barra de rolagem que ocupa espaço. | `NEXT_PUBLIC_DOCS_URL=https://docs.example.com pnpm --filter web build && pnpm --filter web start`; a 1024, 1279, 1280 e 1440 px, nos 3 idiomas, visitante e logado, claro e escuro: `document.documentElement.scrollWidth === clientWidth`, centro da marca contra o centro do viewport, e largura da lista da esquerda a 1280 (estimativa ~429 px). Conferir também se o CSS servido contém `xl:grid-cols-[1fr_minmax(0,auto)_1fr]`. |
| V2 (F4) | Seguir um link do painel fecha o menu na navegação real do Next, com o `Header` persistindo no layout. O T2 prova o `onClick` no jsdom, não a navegação. | 390 e 768 px: abrir o menu, seguir "Contato" e conferir na página nova `aria-expanded="false"` e o painel fora do DOM. Repetir com "Preços" (subitem), com "Início" estando na home (a rota não muda) e com Tab até um link e Enter. No caso de "Início", anotar onde fica o foco (nit da seção de achados). |
| V3 (F3) | Com `NEXT_PUBLIC_DOCS_URL=""` no build, nada muda em relação à PR #45. A leitura confirma as classes; o build com a string vazia não foi medido. | Build com `NEXT_PUBLIC_DOCS_URL=""`: três itens à esquerda, barra cheia a partir de 1024, sem rolagem lateral, marca no centro, nenhum link de documentação no header nem no footer. |
| V4 (F1) | "Documentação" abre em aba nova na barra, no painel e no footer, e o painel fecha na aba original. | No build B1, conferir `href`, `target="_blank"` e `rel="noopener noreferrer"` nas três superfícies, nos 3 idiomas; clicar no painel a 390 px e ver a aba nova abrir e o painel fechar na original. |
| V5 (F6) | O header com o link passa no axe-core. | axe no `header` a 390 (menu aberto e fechado) e 1280, em es e pt-br, claro e escuro. |
| V6 | Suíte da web 116/116 e T1/T2 reprovando no código anterior. Número do handoff, não remedido aqui. | `pnpm --filter web test` e `pnpm test` na raiz. |
| V7 (F5) | Abaixo de 1024 px muda só o fechamento do menu. A leitura confirma: abaixo de `lg` as classes são as mesmas nos dois modos. | Prioridade baixa; cabe na mesma passada de V2. |

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---------------------|----------|
| Nenhum teste automatizado mede largura ou layout | Continua aberta, por desenho: é do `agent-browser` no `/test` (V1, V3). |
| T2 roda só em pt-br | Fora de escopo: o fechamento do menu não depende do idioma, e o texto nos três idiomas está coberto pelo T1. |
| Estado logado fora do T2 | Fora de escopo: o fechamento não depende da sessão, e `headerInteractiveNesting.test.tsx` cobre o header logado com a variável. O layout logado entra em V1. |

Nenhuma lacuna nova.

## Decisões em aberto

1. Nome da branch. Recomendação: renomear a atual para `fix/web-docs-link-and-api-error-codes`
   (`git branch -m`), já que não tem remoto nem commit. Decisão do usuário, depois da revisão da segunda tarefa.
2. D5 e D6 do plano (variável sem consumidor em `apps/app/.env.example:74` e `apps/api/.env.example:86`; Escape,
   clique fora e `aria-controls` no menu) seguem como achados de backlog, sem mudança nesta revisão. O nit de foco
   e o `radix-ui: latest` entram junto.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Typecheck | `pnpm --filter web typecheck` | exit 0 |
| Lint/format | `pnpm check` | exit 0, 887 arquivos, nenhuma correção |
| Paridade de i18n | não rodado | nenhum arquivo de `packages/internationalization` está no diff desta tarefa |
| Lockfile | ver seção "Lockfile" | importer idêntico ao gerado pelo pnpm; `--frozen-lockfile` aceita |

A suíte de testes não foi rodada aqui (é do `/test`).

## Plano de commits (só desta tarefa)

O plano combinado com `api-auth-webhook-error-codes` e com o `docs(specs)` do backlog sai na revisão da segunda
tarefa. Ordem de dependência: nenhum commit em `packages/sdk` nem em `packages/internationalization`; a parte da web
vem depois dos commits da `apps/api` da outra tarefa, e os `docs(features)` ficam por último.

1. `fix(web): read NEXT_PUBLIC_DOCS_URL into the typed env`
   - `apps/web/env.ts`
   - `apps/web/__tests__/docsUrlEnv.test.tsx`
2. `test(web): add jsdom and testing-library for interaction tests`
   - `apps/web/package.json`
   - `pnpm-lock.yaml`
   - `apps/web/CLAUDE.md`
3. `fix(web): fit the docs link in the header and close the mobile menu on navigation`
   - `apps/web/app/[locale]/components/header/index.tsx`
   - `apps/web/__tests__/headerMobileMenu.test.tsx`
4. `docs: NEXT_PUBLIC_DOCS_URL is read by the web only`
   - `docs/SETUP.md`
5. `docs(features): web-docs-link-and-mobile-menu`
   - `docs/features/web-docs-link-and-mobile-menu/`

O commit 2 vem antes do 3 porque o T2 importa `@testing-library/react`. O `header/index.tsx` leva a barra, a aba
nova e o fechamento do menu num commit só, porque separar exigiria `git add -p`. O plano sugeria `chore` no commit
2; usei `test`, porque as dependências e a exceção do `CLAUDE.md` existem só para a suíte.

Varredura de segredo em `docs/features/web-docs-link-and-mobile-menu/`: nenhuma senha, token, chave ou e-mail fora
de `example.com`.

Commits realizados: _(preenchido pelo orquestrador)_
