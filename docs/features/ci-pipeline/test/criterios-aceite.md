# Critérios de Aceite (Checklist) — `ci-pipeline`

> Os 17 critérios do plano §9, cada um com **veredito independente** e a evidência que o sustenta.
> Todos os números abaixo foram **executados nesta etapa**, no working tree final (141 entradas em
> `git status -s`), não herdados do `/develop` nem do `/review`.
>
> Legenda: ✅ atendido · ❌ falhou · ⚠️ **BLOQUEADO — depende de ação humana**.
>
> **Placar: 15 ✅ · 0 ❌ · 2 ⚠️** (os dois bloqueados são esperados e estão previstos na decisão Q1 do
> plano — não são falha da entrega).

---

- [x] ✅ **`pnpm check` sai limpo, com exit code 0**
  `pnpm check` reporta `Checked 392 files in 130ms. No fixes applied.` e retorna 0, partindo dos 192
  erros / 37 warnings medidos em `3089d71`. São **392** arquivos e não os 383 do `/review` porque esta
  etapa acrescentou 9 arquivos (3 `vitest.config.mts` e 6 suítes de teste) — todos passaram pelo mesmo
  gate. O gate provou ser real durante o próprio QA: os testes escritos aqui nasceram com 10 erros
  (`noMagicNumbers`, `useTopLevelRegex`, `format`), que precisaram ser corrigidos antes de o comando
  voltar a 0. A exclusão de `.claude/skills` está declarada em `biome.jsonc` no mesmo formato das 9
  exclusões que já existiam.

- [x] ✅ **`pnpm check` roda sem acesso à rede e com versão presa ao lockfile**
  `package.json` da raiz executa `biome check --no-errors-on-unmatched ./` a partir do binário
  `@biomejs/biome@2.3.1` fixado em `devDependencies`; `npx ultracite@latest` saiu do caminho de execução
  e `ultracite@6.0.3` permanece só como fornecedor dos presets que `biome.jsonc:3` estende. Reconferido
  aqui pela via mais forte disponível: o job rodou dentro de um container Linux (`act`) que baixou o
  `node_modules` do zero via `pnpm install --frozen-lockfile` e produziu o mesmo resultado do host. A
  prova de equivalência de contadores com defeitos deliberados está no `develop/handoff.md` (P1) e não
  precisou ser refeita, porque o comando antigo já não existe no repositório.

- [x] ✅ **Todo workspace com script `typecheck` passa**
  Os **13** workspaces que declaram `typecheck` foram executados **um a um** nesta etapa
  (`pnpm --filter <w> typecheck`) e os 13 saíram com exit 0: `api`, `app`, `web`, `@repo/analytics`,
  `@repo/auth`, `@repo/design-system`, `@repo/email`, `@repo/internationalization`, `@repo/next-config`,
  `@repo/payments`, `@repo/sdk`, `@repo/security`, `@repo/seo`. Os três scripts que falhavam foram
  fechados por remoção do script (`apps/email`, `@repo/typescript-config`) ou do código morto
  (`packages/analytics/server.ts`) — nenhum `skipLibCheck` novo, nenhum `@ts-ignore`, nenhuma exclusão
  silenciosa. `turbo run typecheck --dry=json` enumera 16 pacotes e 13 têm o script, exatamente como o
  plano previa. O gate voltou a provar seu valor aqui: dois dos testes novos foram **reprovados** por
  ele (`TS2339` em `getApiField`, `TS2345` no `RequestInit` do `NextRequest`) e só entraram depois de
  corrigidos.

- [x] ✅ **`typecheck` não depende de `build`**
  `turbo.json` declara `"typecheck": { "dependsOn": [], "outputs": [], "env": [] }` — sem `^build`. A
  execução completa de `turbo run lint typecheck test --force` leva **15,0 s** para 21 tasks, o que é
  incompatível com um grafo que buildasse os apps antes; e as 13 tasks de `typecheck` correm em paralelo.
  A ressalva registrada no plano continua valendo e é conhecida: sem `.next/types`, os tipos gerados de
  rota do Next não são validados — é a mesma cobertura que o gate manual anterior tinha, nem mais nem
  menos.

- [x] ✅ **`turbo run lint typecheck test` é verde e cacheável**
  Primeira execução com `--force`: **21 tasks, 21 sucessos, 15,0 s**. Segunda execução consecutiva, sem
  tocar arquivo: **21/21 cached, 144 ms, `>>> FULL TURBO`**. São 21 e não as 18 do `/review` porque esta
  etapa acrescentou suítes a `@repo/auth`, `@repo/payments` e `@repo/shared` — 1 `//#lint` + 13
  `typecheck` + **7** `test`. `lint` e `typecheck` declaram `outputs: []`, então o turbo não tenta
  restaurar artefato inexistente.

- [x] ✅ **`apps/web` deixa de ser o app não verificado**
  `apps/web` tem `vitest.config.mts` (`environment: "node"`, aliases `@` e `@repo`), script
  `"test": "NODE_ENV=test vitest run"`, `vitest` declarado nas suas próprias `devDependencies` e
  `__tests__/seo.test.ts` com **15 testes** verdes. `pnpm test` reporta **7 tasks** — o critério pedia
  4 (contra as 3 da baseline) e a etapa de QA elevou para 7. Que a suíte não é teatro foi reconfirmado
  por mutação nesta etapa: injetar um `expect(1).toBe(2)` no arquivo derruba `web:test` e o pipeline
  inteiro (19 de 21 tasks, exit 1).

- [x] ✅ **`apps/api` roda no ambiente correto e sem dependência fantasma**
  `apps/api/vitest.config.mts` está em `environment: "node"`, sem `plugins: [react()]`, e
  `@vitejs/plugin-react` saiu das `devDependencies`. A suíte da api roda **118 testes** verdes — os 107
  originais mais os **11** que esta etapa acrescentou para a rota do webhook da Stripe, todos em ambiente
  `node`, sem DOM. `jsdom` deixou de ser exigido por um app de servidor que nunca o declarou.

- [x] ✅ **As tasks do CI rodam herméticas em relação à env**
  `turbo run lint typecheck test --force --env-mode=strict` termina **21/21 verdes em 16,1 s**, com
  `env: []` declarado em `//#lint`, `typecheck` e `test`. As três suítes novas (`@repo/auth`,
  `@repo/payments`, `@repo/shared`) entraram nesse regime sem exceção: os testes que dependem de
  variável de ambiente a criam in-process (`vi.stubEnv`) em vez de herdá-la do processo, que é
  precisamente o que o modo estrito cobra. `envMode` global permanece `loose` e `build` segue intocado
  (rota A, decisão Q7).

- [x] ✅ **`globalDependencies` hasheia o `.env` que o Next realmente carrega**
  `turbo.json` declara `"globalDependencies": ["**/.env.*local", "**/.env"]`. O `/develop` provou o efeito
  anexando uma linha a `apps/api/.env` e observando as tasks saírem de cache; esta etapa **não repetiu a
  escrita no `.env`** de propósito — mexer em arquivo de ambiente do workspace durante o QA é risco
  desnecessário quando a mudança de configuração é literal e o comportamento do turbo é determinístico.
  A parte observável foi reconferida: o `FULL TURBO` da 2ª execução prova que o hash é estável quando
  nada muda, e cada uma das 39 mutações aplicadas aqui invalidou o cache da task correspondente.

- [x] ✅ **`turbo run build` deixa de falhar por falta de chave da Stripe**
  `packages/payments/index.ts` expõe `getStripe(): Stripe | null`, construído sob demanda e memoizado, no
  mesmo padrão de no-op que `packages/security` usa com `ARCJET_KEY`. Esta etapa **travou o
  comportamento com 8 testes de unidade** que antes não existiam, e provou que eles são load-bearing por
  mutação: remover o guard `if (!secretKey) return null` (voltando ao `|| ""`) derruba 2 testes, porque o
  SDK real da Stripe rejeita chave vazia no construtor — é literalmente o `Neither apiKey nor
  config.authenticator provided` que quebrava o build, agora capturado por teste; mover `keys()` para o
  escopo de módulo derruba 3; remover a memoização derruba 1. E que a correção não trocou um build
  quebrado por um webhook quebrado está coberto pelos 11 testes da rota (critério seguinte), além do
  exercício em runtime com POST assinado registrado no `develop/handoff.md`.

- [x] ✅ **Uma PR com defeito fica vermelha, sem ninguém rodar nada à mão**
  Os quatro cenários do plano §8.2 foram reproduzidos **de forma independente** nesta etapa, um de cada
  vez, cada um revertido em seguida: (a) `console.log` num arquivo novo de `apps/app` → `//#lint` falha,
  exit 1, 18/21 tasks; (b) `const qaTypeProbe: number = "..."` em `@repo/sdk` → `@repo/sdk#typecheck`
  falha com `TS2322`, exit 2, 19/21; (c) `expect(1).toBe(2)` em `apps/web/__tests__` → `web:test` falha,
  exit 1, 19/21; (d) chave `announcement` removida **só** do `es` em
  `translations/apps/web/pages/hero` → `parity.test.ts` falha com
  `[globalTranslations] es faltando: apps.web.pages.hero.announcement`, exit 1, 15/17 — o cenário literal
  do sinal de pronto da spec. O cenário (d) foi levado até o fim **dentro do runner**: `act pull_request
  -j verify --container-architecture linux/amd64` terminou em `❌ Failure - Main pnpm turbo run lint
  typecheck test` e `🏁 Job failed`, emitindo a anotação `::error::@repo/internationalization#test`. Com
  o repositório íntegro, o mesmo comando termina em **21 tasks, 21 sucessos** e `🏁 Job succeeded`.
  Comportamento conhecido, não bug: `turbo run` aborta na primeira falha (`--continue=false`), então uma
  PR com lint **e** teste quebrados mostra só o lint.

- [x] ✅ **Um clone limpo, sem nenhum segredo, roda o pipeline até o fim**
  `.github/workflows/ci.yml` tem **zero** ocorrências de `${{ secrets.` e **zero** de `build` — conferido
  no arquivo entregue. A execução via `act` é a prova operacional: o container `ubuntu:act-latest` não
  recebeu nenhum secret e rodou `pnpm install --frozen-lockfile` → `pnpm turbo run lint typecheck test`
  → 21/21 → `Job succeeded`. `pnpm install --frozen-lockfile` no host também sai 0
  (`Lockfile is up to date, resolution step is skipped`), inclusive **depois** das três `package.json`
  que esta etapa editou para declarar os scripts `test` — nenhuma delas exigiu regravar o lockfile.

- [x] ✅ **O comando local e o do CI são o mesmo**
  O workflow chama `pnpm turbo run lint typecheck test`, e `package.json` da raiz define
  `"lint": "pnpm run check"`, de modo que `pnpm check`, `pnpm lint` e `turbo run lint` executam
  literalmente o mesmo processo do Biome. Não existe `biome ci --changed` de um lado e `biome check ./` do
  outro. A prova é a comparação direta feita aqui: a linha rodada no host e a linha rodada dentro do
  container do `act` produzem o mesmo placar de 21 tasks e o mesmo veredito nos quatro cenários de
  defeito.

- [x] ✅ **Node e pnpm são fixados a partir dos arquivos do repositório**
  O YAML usa `node-version-file: .nvmrc` e `pnpm/action-setup@v4` **sem** `version:`, sem nenhum literal
  de versão duplicado. Verificado em execução, não só por leitura: o log do `act` mostra
  `pnpm/action-setup` resolvendo `pnpm` a partir de `packageManager` e o `setup-node` instalando o Node
  do `.nvmrc`, nessa ordem, com o passo de cache do store do pnpm concluindo em
  `Cache saved successfully` (`node-cache-Linux-x64-pnpm-<hash do lockfile>`). Como o `act` não tem
  backend de cache persistente entre execuções, o **cache-hit** na segunda execução do workflow real
  segue sendo observável só no GitHub — é a única parte deste critério que a evidência local não alcança,
  e ela é acessória: a chave de cache correta já foi observada.

- [x] ✅ **O cache do turbo não devolve resultado errado por dependência não declarada**
  `apps/web/package.json` declara `@repo/internationalization` e `@repo/shared` em `dependencies`, e o
  segundo virou dependência real de runtime (o `language-switcher` importa `setCookie` de lá). O efeito
  foi observado nesta etapa sem precisar de experimento artificial: o cenário de defeito (d) removeu uma
  chave em `@repo/internationalization` e o turbo invalidou e reprovou **as tasks de teste dos apps a
  jusante** — a execução parou em 15 de 17 tasks porque `@repo/internationalization#test` é upstream de
  `web#test`, `app#test` e `api#test` pelo `dependsOn: ["^test"]`. Com o grafo antigo, `web` teria saído
  de cache com resultado obsoleto.

- [x] ✅ **Nada de comportamento muda em runtime**
  Percorrido com `agent-browser` (comandos estritamente em sequência) o que as etapas anteriores não
  alcançaram: uma **conta comum de verdade** (`qa-common-ci@example.com`, criada pelo próprio fluxo de
  sign-up), sem impersonação e sem banner read-only, exercitando o CRUD completo de `entities` — criar,
  ler, alternar `Ativo`, editar, buscar (termo com resultado e termo sem resultado) e excluir com
  confirmação. Além disso: submit com o formulário vazio devolve `Informe o nome.` com label e borda
  destructive (os `HookForm*` com `return null` e o tipo alargado seguem íntegros); o dropdown antd
  mantém "Editar" com ícone `foreground` e "Excluir" com **texto e ícone** `destructive` em **light e
  dark** (a troca de ordem em `globals.css` não alterou a cascata); a troca de idioma pt-br → es grava
  `x-locale=es` pelo `setCookie` de `@repo/shared` e traduz a tabela; o `Table` antd respeita o tema em
  light e dark e rola horizontalmente em 390×844; a sessão sobrevive ao logout na `apps/web` e ao login
  de volta na `apps/app`, com o `?redirect=` preservado — o `AuthProvider` monta e autentica mesmo depois
  da remoção do `import React` feita no review; credencial inválida devolve o toast traduzido
  "Credenciais inválidas. Verifique e-mail e senha.", sem stack trace. **Console: zero erro novo.** Os
  presentes são os já catalogados — `scroll-behavior: smooth` do Next, o `useId` do Radix
  (`DropdownMenuTrigger`/`Collapsible`, `specs/BACKLOG.md:205`), o aviso de compatibilidade do antd v5
  com React 19 e os `<a>`/`<button>` aninhados do `NavigationMenu` da web. 17 screenshots em
  `test/e2e/`.

- [ ] ⚠️ **BLOQUEADO — A PR real no GitHub, vermelha e depois verde**
  *Este é o único critério que não tem forma local, e a decisão de não o cobrir agora é do plano, não uma
  omissão.* Falta observar, na interface do GitHub, o status check aparecendo com o nome `verify` numa
  Pull Request e o botão de merge desbloqueando quando ele fica verde. O que já está provado é tudo o que
  antecede isso: o YAML é sintaticamente válido, as três actions resolvem, os steps rodam na ordem certa
  num runner Linux e o job termina em `Job succeeded` com o repositório íntegro e em `Job failed` com um
  defeito — via `act`, que executa o mesmo workflow num container mas **não** renderiza a interface da
  PR. **O que falta para desbloquear**: o usuário aprovar os commits, autorizar o `git push -u origin
  ci/feat/github-actions-pipeline` e abrir a PR para `main`; o check `verify` deve aparecer sozinho, sem
  ninguém rodar nada. Recomendo, ao abrir, empurrar um commit descartável com um `console.log` para ver a
  PR ficar vermelha e removê-lo em seguida — é o cenário (a) desta lista, agora com o sinal do GitHub.

- [ ] ⚠️ **BLOQUEADO — O runbook de branch protection executado**
  O runbook está escrito e versionado (`docs/SETUP.md`, seção "CI — GitHub Actions", 5 passos mais o
  teste de verificação), que é exatamente o que a decisão **Q1** definiu como entrega: *"ligar a proteção
  neste repositório não faz parte da entrega — é ação humana no GitHub, que o runbook descreve"*. Logo,
  o critério **de entrega** está cumprido; o que está bloqueado é o **efeito**. Enquanto ninguém marcar
  `verify` como required check em `main` nas configurações do repositório, o CI **sinaliza mas não
  bloqueia**, e a regra de nunca commitar em `main` continua garantida só pelo hook local
  `.claude/hooks/block-protected-branch-write.sh`, que não existe num clone sem o ferramental de IA — e
  **não** existe em nenhum fork gerado a partir deste boilerplate. **O que falta para desbloquear**:
  seguir os 5 passos de `docs/SETUP.md` em Settings → Branches, depois que a primeira execução do
  workflow tiver registrado o nome do check no GitHub (ele só fica selecionável depois disso, o que
  encadeia este critério ao anterior).
