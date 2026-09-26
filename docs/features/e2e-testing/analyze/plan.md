# Plano: testes E2E e acessibilidade automatizada

- **Spec de origem:** [`spec.md`](../spec.md) (arquivada em 2026-09-25; nasceu em `specs/e2e-testing.md`) (problema, evidência de mercado e corte de MVP já decididos lá).
- **Rodada:** autônoma do `/cycle`. Nenhuma pergunta foi feita ao usuário; as decisões seguem a escada
  spec → padrão do repo → menor raio de impacto e estão listadas no fim, cada uma com a alternativa descartada.
- **Dependências novas aprovadas pelo usuário em 2026-09-24:** `@playwright/test`, `@axe-core/playwright` e
  `@vitest/coverage-v8`, todas como `devDependencies`. Nenhuma outra entra.

---

## Etapa 1. Análise

### 1. Contexto

Resumo em uma frase: uma suíte Playwright pequena exercita os fluxos que todo fork herda (cadastro,
login, CRUD do `entity`, troca de painel e a landing) contra o emulador do Firebase, roda no CI a cada PR
que alcança o produto, verifica acessibilidade com axe nas telas percorridas e passa a existir um número
de cobertura consolidado do repositório.

Por que agora: o `depends_on` da spec está satisfeito. O CI existe (`.github/workflows/ci.yml:19-39`) e o
emulador com seed também (`package.json:14-15`, `firebase.json:9-21`, `apps/api/scripts/seed-emulator.mjs`).
Hoje a única garantia de que login e cadastro funcionam é a passada manual do `/test`, e duas regressões
recentes só apareceram nela (overflow de 429 px em 375 px na PR #23, perda da query string no deep link na
PR #24).

**Objetivos (o corte de MVP da spec, item a item):**

| # | Item do corte | Como este plano entrega |
|---|---------------|-------------------------|
| C1 | Fluxos críticos do navegador ao banco, contra o emulador e o seed | Workspace `apps/e2e` com Playwright; 5 arquivos de fluxo (seção 8) |
| C2 | Rodam no CI a cada PR, bloqueiam o merge e trazem evidência | Job `e2e` no `ci.yml`, trace/vídeo/screenshot e relatório HTML como artefato. O bloqueio depende de branch protection, que é passo manual (seção 9.1) |
| C3 | a11y automática nas telas percorridas, só violações graves, com lista de exceções | `@axe-core/playwright` chamado em cada tela dos fluxos, falhando em `critical`/`serious`, com `allowlist.ts` |
| C4 | Cobertura medida e consolidada, sem limiar | `vitest.config.mts` na raiz com `test.projects` + coverage v8; job `coverage` publica o resumo por workspace |
| C5 | Convivência com o `agent-browser` escrita | `CLAUDE.md` (regra 11), `docs/review-checklist.md` §7, `docs/AI-WORKFLOW.md` e `docs/SETUP.md` |

**Fora de escopo** (copiado do "Fora do corte" da spec, mais o que este plano também deixa de fora):

- Substituir a validação visual do `agent-browser`. A suíte não julga tema, alinhamento nem legibilidade.
- Regressão visual por comparação de imagem.
- Assinatura Stripe de ponta a ponta.
- Sharding, limiar de cobertura que bloqueia merge e cobertura medida em teste de navegador.
- Teste manual de teclado e leitor de tela.
- Testes de `firestore.rules`/`storage.rules` com `@firebase/rules-unit-testing`. A spec cita a lacuna
  mas não a põe no corte, e a dependência não foi aprovada.
- Os idiomas `en` e `es` e o viewport mobile na suíte. A paridade de chaves já tem teste
  (`packages/internationalization/__tests__/parity.test.ts`), e o mobile continua com o `/test`.
- Rodar os apps em modo produção (`next build && next start`) no CI (decisão D4).
- Qualquer mudança de código de produto em `apps/app`, `apps/web`, `apps/api` ou `packages/*`. Os
  seletores usam papel, rótulo e texto do dicionário; o que não tem nome acessível entra na allowlist de
  a11y e vira achado (seção 6).

**Apps impactados:** nenhum código de app muda. Muda a raiz (`package.json`, `vitest.config.mts`,
`.gitignore`, `.github/workflows/ci.yml`, `scripts/`), nasce o workspace `apps/e2e` e mudam cinco
documentos. `turbo.json` fica como está.

- Área do painel: comum e admin, só como alvo dos testes.
- Modo de produto: a suíte roda no default do `.env.example` (`NEXT_PUBLIC_PRODUCT_MODE=subscription`,
  `apps/app/.env.example`). O modo `simple` fica fora.
- Assinatura: N/A.
- Dependências externas: nenhuma conta, nenhum secret. Firebase só emulado; Stripe, Resend e Arcjet
  ficam com chave vazia, e os três já degradam para no-op sem chave (`packages/payments/keys.ts:10-21`,
  `packages/email/keys.ts:44-54`, `packages/security/index.ts:42-44`).
- Genérico ou específico: genérico. Os fluxos cobertos são os que todo fork herda sem mudança.

### 1.1 Fontes

- `specs/e2e-testing.md` inteira, inclusive a pergunta riscada com a aprovação das dependências.
- `specs/research/engineering-baseline.md` (práticas 2, 5 e 17; coletada em 2026-08-21, revalidar depois
  de 2027-02-21). As linhas que pesam aqui: Playwright com `webServer` e trace na falha apontando para o
  emulador (`:90-91`); cobertura com `projects` e v8 na raiz, porque relatório por workspace não soma
  (`:93-95`); axe falhando em `critical`/`serious` com allowlist inicial (`:117-120`).
- `docs/SETUP.md:113-180` (execução local, CI, runbook de branch protection) e `:224-290` (emulador, seed,
  armadilhas).
- `docs/features/ci-pipeline/analyze/plan.md` (E2E ficou fora de lá de propósito, `:50-53`; `build` fora do
  CI porque exige service account).
- `docs/features/firebase-emulator-seed/` (handoff e report).
- Estado da proteção da `main`, medido agora: `gh api repos/guilhermebittelbrunn/next-boilerplate/branches/main/protection`
  → `404 Branch not protected`; `.../rulesets` → `[]`. O repositório é público.

Referências não lidas: nenhuma.

---

### 2. Dados (Firestore)

Nenhuma coleção nova e nenhum campo novo. A suíte lê e grava só no emulador:

- **Estado inicial:** `pnpm seed` apaga todas as contas do Auth e todos os documentos do Firestore do
  emulador e repovoa (`seed-emulator.mjs:89-104`). São três contas com `emailVerified: true` e sem campo
  `onboarding` (`:21-25`, `:115`), e seis `entity`: quatro de `user@example.com`, incluindo uma desabilitada,
  e duas de `user2@example.com` (`:32-87`). A senha comum das três está em `seed-emulator.mjs:17` e em
  `docs/SETUP.md:241`. Este plano não a repete.
- **O que a suíte grava:** uma conta nova por execução do fluxo de cadastro (`e2e-signup-<timestamp>@example.com`)
  e uma `entity` criada, editada e excluída no mesmo teste. Como o seed roda no início de cada execução, o
  que sobrar de uma execução anterior some.
- **Trava contra dado real:** o seed já recusa rodar sem os dois hosts do emulador ou com project id fora de
  `demo-*` (`apps/api/scripts/emulatorTarget.mjs:26-45`). A suíte reusa essas duas funções, sem
  reimplementar a regra, para validar o ambiente dos três apps antes de subir qualquer servidor (seção 10.4).
- Soft delete, `BaseRepository`, índices: N/A.

### 3. Contrato `@repo/sdk`

N/A. Nenhum DTO, action ou tipo muda.

### 4. API

N/A como código. A API sobe em `next dev` com o bloco do emulador e passa a ser exercitada de verdade.
Dois fatos da API condicionam a suíte:

- **CORS aceita só `localhost`.** Sem `CORS_ORIGIN`, a API libera `http://localhost:3000` e `:3001`
  (`apps/api/(shared)/lib/cors.ts:9,40`). `baseURL` com `127.0.0.1` recebe `403 AUTH_FORBIDDEN_ORIGIN`. Os apps
  usam `localhost` e os emuladores `127.0.0.1`.
- **Build da API não passa sob o emulador.** `apps/api/env.ts:13-15` exige os três `FIREBASE_ADMIN_*` fora
  de `development` (`:46`), e `docs/SETUP.md:284-286` registra isso. Por isso a suíte usa `next dev` (D4).

Readiness: `GET /health/ready` responde 200 só quando o banco responde
(`apps/api/app/(routes)/health/ready/route.ts`). O Playwright espera por essa URL, então a API só conta
como pronta quando já enxerga o emulador.

### 5. Front-end

Nenhum arquivo de `apps/app` ou `apps/web` muda. O que a suíte precisa saber deles, com a origem:

- **Rotas com prefixo de locale.** `/pt-br/...`; sem locale, o proxy redireciona para o default
  (`apps/app/proxy.ts:167-176`). Sem sessão, qualquer rota fora das públicas vai para
  `/{locale}/sign-in?redirect=<pathname>` (`:186-191`).
- **Pós-login:** admin vai para `/{locale}/admin`, comum para `/{locale}`
  (`apps/app/shared/lib/postLoginNavigation.ts:80-128`); com `?redirect=`, o destino é o redirect.
- **Cadastro no app** (`sign-up/components/SignUpFormClient.tsx:141-184`) leva ao onboarding, porque o perfil
  novo nasce com `{ step: "profile", completedAt: null }` (`apps/api/(shared)/lib/user-merge.ts:52`) e o
  layout comum desvia (`(common)/layout.tsx:38-41`). O passo `profile` pede `displayName` e não pode ser
  pulado; o passo `preferences` tem o botão "Pular" (`OnboardingProfileStep.tsx:54-70`,
  `OnboardingPreferencesStep.tsx:58-72`).
- **Troca de painel** (`apps/app/shared/components/ui/PanelNavbarControls.tsx:260-281`): um Select de ambiente
  sem nome acessível, com as opções "Administração"/"Painel do usuário", e um Select de usuário com
  `aria-label`. Ir para o painel comum personifica o primeiro usuário comum e deixa a tela em somente
  leitura (`ImpersonationReadOnlyNotice`).
- **CRUD de `entity`:** botão "Novo" na lista, formulário com `name` (obrigatório) e `type`
  (`EntityFormFields.tsx:91-167`), menu de ações por linha cujo gatilho é um `<div>` sem papel nem nome
  (`packages/design-system/components/ui/action-menu.tsx:103-110`) e exclusão confirmada por Popconfirm
  ("Sim"). Com o bucket vazio, o campo de foto é uma URL, não upload.
- **Landing** (`apps/web/app/[locale]/(home)/components/hero.tsx:33-49`): o CTA secundário "Cadastrar" aponta
  para `/{locale}/sign-up` da própria web quando `NEXT_PUBLIC_APP_URL` está vazio, que é o caso do
  `apps/web/.env.example`.
- **Localização por rótulo:** não existe `data-testid` em código de produto (só em mocks de
  `apps/app/__tests__`). `HookFormInput`, `HookFormTextarea`, `HookFormSelect`, `HookFormSwitch` e
  `HookFormRadioGroup` associam rótulo e controle, então `getByLabel`/`getByRole(..., { name })` funcionam.
  `HookFormInputPassword` não associa (o `id` vai para um `<div>`, `hookformInputPassword.tsx:65-88`); ali o
  seletor é `input[name="password"]`.
- **Textos:** os seletores leem o texto do dicionário `pt-br` via
  `@repo/internationalization/translations/global` (export em `packages/internationalization/package.json`),
  nunca literal solto. Uma mudança de copy não quebra a suíte, e uma chave removida quebra o `typecheck`.
- **Tema:** o app e a web seguem `prefers-color-scheme` quando não há cookie de tema
  (`packages/design-system/providers/theme.tsx:10-12`, `apps/app/app/layout.tsx:30-33`), então
  `colorScheme: "dark"` do Playwright produz o tema escuro.
- **Banner de cookies:** só aparece quando há medição configurada (`packages/analytics/server.ts:15-30`).
  Sem `NEXT_PUBLIC_GA_MEASUREMENT_ID`, não cobre nenhum clique.

i18n: nenhuma chave nova. A suíte só lê chaves existentes.

### 6. Autorização e segurança

- A suíte prova, de ponta a ponta, duas regras que hoje só têm teste unitário: rota autenticada sem sessão
  redireciona para o sign-in preservando o destino, e usuário comum em `/admin` volta para `/{locale}`
  (`apps/app/lib/server/requireAdmin.ts:17-19`).
- Impersonação: o fluxo de troca de painel confere o aviso de somente leitura.
- **Credencial:** nenhum secret no CI. As contas do seed são publicadas na documentação e só existem no
  emulador. O `.claude/dev-credentials.local.md` não é tocado.
- **Os `.env` locais apontam para o projeto real.** Os três `apps/*/.env` desta máquina têm
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`/`FIREBASE_ADMIN_PROJECT_ID` de um projeto real, service account
  preenchido e nenhum host de emulador; o da web tem `ARCJET_KEY`. A suíte nunca herda esses valores: monta
  o ambiente de cada app a partir do `.env.example`, zera toda chave que só existe no `.env` local e recusa
  subir se o resultado não for alvo de emulador (seção 10.4). O Next lê `process.env` antes dos arquivos
  `.env`, inclusive valor `""`, então esse ambiente explícito vence.
- **Arcjet:** com chave, `detectBot` em modo LIVE provavelmente bloquearia o Chromium headless
  (`apps/app/proxy.ts:131-137`) e o rate limit de 20 req/60 s atingiria sign-in e sign-up. A suíte força
  `ARCJET_KEY=""`.

**Achados fora do escopo** (vão para o backlog pelo `/review`, não são corrigidos aqui):

- A1. O CTA primário da landing tem o texto "Entrar" e leva a `/{locale}/contact` (`hero.tsx:33-34`). A suíte
  não afirma esse comportamento, para não fixar um defeito.
- A2. Elementos sem nome acessível que a suíte precisa acionar: o botão de mostrar/ocultar senha
  (`hookformInputPassword.tsx`), o Select de ambiente (`PanelNavbarControls.tsx:260-281`) e o gatilho do
  `ActionsMenu` (`action-menu.tsx:103-110`, que também não é alcançável por teclado). Os dois primeiros
  devem aparecer como violação `critical`/`serious` do axe e entram na allowlist inicial; o terceiro não é
  detectável pelo axe porque não tem papel.

### 7. Testes (Vitest)

A entrega é, ela própria, infraestrutura de teste. O que ganha teste unitário é a lógica pura da suíte, no
nível mais barato:

| Arquivo | Nível | Prova |
|---------|-------|-------|
| `apps/e2e/__tests__/stackEnv.test.ts` | unit (Vitest, `node`) | o ambiente montado zera chave que só existe no `.env` local, força os hosts do emulador e o project id `demo-*`, e lança quando o resultado não é alvo de emulador |
| `apps/e2e/__tests__/a11yFilter.test.ts` | unit | a filtragem de violações: `minor`/`moderate` não falham; `critical`/`serious` falham; exceção só casa com rota + regra + alvo exatos; exceção que não casa nada é reportada como obsoleta |

Para esses dois testes unitários existirem, `apps/e2e` ganha um `vitest.config.mts` e o script `test`, o que
o põe na linha `pnpm turbo run lint typecheck test` (são 11 tasks de teste em vez de 10). O `include` do
config fica restrito a `__tests__/**/*.test.ts`, para que o Vitest nunca colete os `*.spec.ts` do Playwright.

O teste de ponta a ponta (Playwright) exige processo externo de pé, e aqui o objeto do teste é justamente
a integração: navegador, sessão do Firebase Auth emulado, cookie `access-token`, proxy, API e Firestore
juntos. Nenhum unitário prova que o login ainda funciona depois de um refactor em `packages/auth`.

### 8. O que o `/test` vai percorrer

Esta entrega não muda nenhuma tela, então a passada com `agent-browser` em light/dark/mobile e três idiomas
não se aplica (regra de ouro 11 vale para diff que toca UI; este não toca). O `/test` executa a suíte e
mede as afirmações abaixo.

**Fluxos cobertos pela suíte (MVP):**

| Arquivo | Teste | Resultado esperado |
|---------|-------|--------------------|
| `landing.spec.ts` | home da web renderiza e o CTA "Cadastrar" leva ao formulário de cadastro | `GET /pt-br` na web mostra o título do hero; clicar no link "Cadastrar" da seção do hero leva a `/pt-br/sign-up` com o campo de e-mail visível. axe na home e no cadastro |
| `signUp.spec.ts` | conta nova atravessa o onboarding e chega ao painel | e-mail novo + senha → `/pt-br/onboarding` com "Passo 1 de 2" → `displayName` + "Continuar" → "Pular" → `/pt-br` com o menu lateral do painel comum. axe no cadastro, nos dois passos e na home |
| `signIn.spec.ts` | usuário comum entra e cai em `/pt-br` | sessão criada; menu "Entidades" visível |
| | admin entra e cai em `/pt-br/admin` | título da home do admin visível |
| | senha errada mantém no sign-in com a mensagem traduzida | URL continua `/pt-br/sign-in`; a mensagem vem do dicionário (chave a ler no mapeamento de erro do provider de auth) |
| | deep link sem sessão volta ao destino depois do login | `/pt-br/entities` → `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities` → login → `/pt-br/entities` |
| `entityCrud.spec.ts` | criar, editar e excluir uma `entity` | lista mostra "Acme Franchise" (seed); "Novo" → nome `E2E <timestamp>` + tipo → "Salvar" → linha na lista; ações → "Editar" → nome novo → "Salvar" → linha com o nome novo; ações → "Excluir" → "Sim" → linha some. axe na lista, na criação e na edição |
| `panelSwitch.spec.ts` | admin vai ao painel do usuário e volta | `/pt-br/admin` → Select de ambiente → "Painel do usuário" → `/pt-br` com o aviso de somente leitura → "Administração" → `/pt-br/admin`. axe na home do admin e na home personificada |
| | usuário comum em `/pt-br/admin` volta para `/pt-br` | redirect server-side |
| `a11yDark.spec.ts` | as telas estáticas dos fluxos com `colorScheme: "dark"` | um teste por rota: home e cadastro da web; sign-in e sign-up do app; home comum, lista, criação de `entity`; home do admin e lista de usuários. Falha em `critical`/`serious` fora da allowlist |

Total: 9 testes de fluxo, mais um por rota no `a11yDark.spec.ts` (9) e o projeto de setup.

**Como produzir cada estado:** tudo vem do seed, que o projeto `setup` roda no começo de cada execução.
Nenhum estado de erro precisa de requisição forçada; senha errada basta.

**O que não dá para observar sem infra externa (vira 🔒, não ❌):**

- O merge bloqueado de verdade por um check vermelho. Exige branch protection (seção 9.1).
- O job `e2e` rodando no GitHub Actions. Só acontece depois do push da branch, que é do `/review` com o "sim"
  do usuário. O `/test` prova localmente o mesmo comando que o job executa.

### 9. Critérios de aceite (para o `/test` converter no formato §9.1)

1. `pnpm e2e` com os emuladores parados sobe emulador, API, app e web, roda o seed e fecha verde. Com as portas
   3000/3001/3002 ocupadas por um `pnpm dev`, falha com mensagem que nomeia a porta, sem reaproveitar o
   servidor (que pode estar com o `.env` real).
2. Com o `apps/api/.env` desta máquina (projeto real), `pnpm e2e` não toca o projeto real: o `lsof` da API
   mostra conexão só com `127.0.0.1:8080`/`9099`, e nenhuma conta nova aparece fora do emulador.
3. Adulterar o ambiente montado para um project id sem `demo-` faz a config do Playwright recusar antes de
   subir qualquer servidor, com a mensagem de `refuseSeedReason`.
4. Os 9 testes de fluxo da seção 8 passam, cada um com a URL e o texto esperados.
5. Quebrar o login de propósito (por exemplo, o `SignInForm` deixa de chamar o submit) faz `signIn.spec.ts`,
   `entityCrud.spec.ts` e `panelSwitch.spec.ts` falharem. Revertido, volta ao verde.
6. Uma falha gera `playwright-report/` e `test-results/<teste>/trace.zip` com screenshot e vídeo, e o trace
   mostra a rede e o console do momento da falha.
7. Tirar o `label` do campo `description` em `EntityFormFields.tsx` (campo sem `placeholder`, que o axe aceitaria como nome), temporariamente, faz a verificação de a11y falhar
   com a regra `label`, nomeando rota e alvo. Revertido, volta ao verde.
8. Uma violação `minor` ou `moderate` não reprova. Cada entrada da allowlist tem rota, regra, alvo e motivo,
   e uma entrada que não casa mais nada aparece como obsoleta na anotação do teste sem reprovar.
9. `pnpm coverage` imprime o total e gera `coverage/coverage-summary.json` e `coverage/index.html`. Rodar duas
   vezes seguidas dá o mesmo total. `node scripts/coverage-summary.mjs` imprime uma tabela markdown com uma
   linha por workspace e o total.
10. `pnpm turbo run lint typecheck test` continua verde e continua sem browser: `apps/e2e#typecheck` e
    `apps/e2e#test` aparecem, e nenhuma task sobe servidor.
11. O `ci.yml` tem os jobs `verify` (inalterado), `changes`, `e2e` e `coverage`. Uma PR que só mexe em
    `docs/`, `specs/`, `.claude/` ou `*.md` pula `e2e` e `coverage` (job pulado conta como sucesso para check
    obrigatório). Push em `main` roda sempre. Critério de leitura do YAML; a execução real é 🔒 até o push.
12. `CLAUDE.md`, `docs/review-checklist.md` §7, `docs/AI-WORKFLOW.md` e `docs/SETUP.md` dizem, sem ambiguidade,
    que a suíte E2E é rede de regressão e que a passada com `agent-browser` continua obrigatória em entrega de
    front-end.
13. `docs/PRE-PRODUCTION.md` §9 e o runbook de `docs/SETUP.md` pedem `verify` **e** `e2e` como checks
    obrigatórios.

### 9.1 Pré-requisitos manuais de infra (o `/develop` não satisfaz; o `/test` não reprova por eles)

| # | Pendência | Quem | Onde fica escrito | Estado medido |
|---|-----------|------|-------------------|---------------|
| P1 | Ruleset/branch protection na `main` exigindo `verify` e `e2e` | dono do repositório, no GitHub | `docs/PRE-PRODUCTION.md` §9 e runbook em `docs/SETUP.md:157-180` (ambos atualizados pelo `/develop`) | `protection` → 404, `rulesets` → `[]` em 2026-09-24 |
| P2 | O check `e2e` só aparece na busca do ruleset depois de rodar uma vez numa PR | dono do repositório | mesmo runbook, passo 1 | depende do primeiro push desta branch |
| P3 | Fork privado paga minutos de Actions: o job `e2e` leva minutos por PR, contra ~1 min do `verify` | cada fork | `docs/SETUP.md`, seção de CI | repositório de referência é público |

Secrets do CI: **nenhum**. Não há P para isso.

Pré-requisito local (não é infra, é setup de máquina, e vai para `docs/SETUP.md`): JDK 21, que o emulador já
exige (`docs/SETUP.md:273-280`), e um `pnpm --filter e2e exec playwright install chromium` na primeira vez.

---

## Etapa 2. Blueprint técnico

### 10.1 Onde a suíte vive

```
apps/e2e/
  package.json            name "e2e", private
  tsconfig.json           extends @repo/typescript-config/base.json, allowJs (importa o .mjs do seed)
  vitest.config.mts       include: ["__tests__/**/*.test.ts"], environment node, testTimeout 20_000
  playwright.config.ts
  support/
    stackEnv.ts           monta o ambiente de cada servidor e recusa alvo que não seja emulador
    seedAccounts.ts       e-mails das contas do seed e a senha (mesmo valor de seed-emulator.mjs:17)
    dictionary.ts         export const ptBr = globalTranslations["pt-br"]
    urls.ts               APP_URL, WEB_URL, API_URL (localhost), EMULATOR_* (127.0.0.1)
    a11y.ts               expectAccessible(page, testInfo, { route })
    a11yFilter.ts         função pura: violações → { failing, staleExceptions }
  a11y/
    allowlist.ts          exceções iniciais, uma por rota + regra + alvo, com motivo
  tests/
    global.setup.ts       seed + login de comum e admin → .auth/common.json, .auth/admin.json
    landing.spec.ts
    signUp.spec.ts
    signIn.spec.ts
    entityCrud.spec.ts
    panelSwitch.spec.ts
    a11yDark.spec.ts
  __tests__/
    stackEnv.test.ts
    a11yFilter.test.ts
```

Por que `apps/e2e`: entra no `pnpm-workspace.yaml` sem editar o arquivo (`apps/*`), ganha `typecheck` na
linha do CI e o escopo de commit `e2e`. O script do Playwright se chama `e2e`, não `test`, para que
`turbo run test` e `turbo build` (que depende de `test`, `turbo.json:18`) nunca subam browser.

### 10.2 `apps/e2e/package.json`

```jsonc
{
  "name": "e2e",
  "private": true,
  "type": "module",
  "scripts": {
    "e2e": "playwright test",
    "e2e:report": "playwright show-report",
    "test": "NODE_ENV=test vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "git clean -xdf .turbo node_modules playwright-report test-results .auth"
  },
  "devDependencies": {
    "@axe-core/playwright": "<versão atual, exata>",
    "@playwright/test": "<versão atual, exata>",
    "@repo/internationalization": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/node": "^24.9.1",
    "typescript": "^5.9.3",
    "vitest": "^4.0.3"
  }
}
```

Versões exatas (sem `^`) para `@playwright/test`: a chave do cache do browser no CI e o binário baixado
dependem da versão. Em 2026-09-24 o npm publica `@playwright/test@1.63.0` e `@axe-core/playwright@4.13.0`;
o `/develop` fixa o que estiver publicado quando instalar.

### 10.3 `playwright.config.ts` (esqueleto)

```ts
import { defineConfig, devices } from "@playwright/test";
import { buildStackEnv } from "./support/stackEnv";
import { API_URL, APP_URL, WEB_URL } from "./support/urls";

const isCi = Boolean(process.env.CI);
const repoRoot = new URL("../..", import.meta.url).pathname;

// Throws before any server starts when one of the three environments is not an emulator target.
const env = {
    api: buildStackEnv("api"),
    app: buildStackEnv("app"),
    web: buildStackEnv("web"),
};

export default defineConfig({
    testDir: "./tests",
    fullyParallel: false,
    workers: 1,
    forbidOnly: isCi,
    retries: isCi ? 1 : 0,
    failOnFlakyTests: isCi,
    timeout: 60_000,
    expect: { timeout: isCi ? 15_000 : 10_000 },
    reporter: isCi
        ? [["github"], ["list"], ["html", { open: "never" }]]
        : [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: APP_URL,
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        navigationTimeout: 60_000,
    },
    projects: [
        { name: "setup", testMatch: /global\.setup\.ts/ },
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            dependencies: ["setup"],
        },
    ],
    webServer: [
        {
            command: "pnpm emulators",
            cwd: repoRoot,
            url: "http://127.0.0.1:4400/emulators",
            reuseExistingServer: true,
            timeout: 180_000,
            stdout: "pipe",
        },
        {
            command: "pnpm --filter api dev",
            cwd: repoRoot,
            url: `${API_URL}/health/ready`,
            env: env.api,
            reuseExistingServer: false,
            timeout: 180_000,
            stdout: "pipe",
        },
        { /* app: pnpm --filter app dev, url `${APP_URL}/pt-br/sign-in`, env.app, idem */ },
        { /* web: pnpm --filter web dev, url `${WEB_URL}/pt-br`, env.web, idem */ },
    ],
});
```

Pontos de atenção:

- `reuseExistingServer: false` nos três apps, local e CI. Um `pnpm dev` já de pé pode estar com o `.env`
  real; reaproveitar esconderia isso. O emulador pode ser reaproveitado porque, por definição, é emulado e
  o seed confere o project id.
- O Playwright espera `webServer` antes de rodar projetos, então o `setup` roda o seed com tudo de pé.
- `failOnFlakyTests` com `retries: 1`: um teste que só passa na segunda tentativa reprova o job, mas o
  relatório o marca como `flaky`. É isso que separa "quebrou" de "passa quase sempre", a lacuna estrutural
  que a spec descreve.
- Proibido `page.waitForTimeout`. Toda espera é asserção web-first (`toHaveURL`, `toBeVisible`) ou
  `expect.poll`.
- A URL do hub (`:4400/emulators`) é a aposta; se ela responder antes de Auth e Firestore estarem prontos, o
  `/develop` troca por `http://127.0.0.1:8080` e confere o 9099 no `setup`. Registrar no handoff o que
  mediu.

### 10.4 `support/stackEnv.ts` (esqueleto)

```ts
import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import {
    readEmulatorTarget,
    refuseSeedReason,
} from "../../api/scripts/emulatorTarget.mjs";

type StackApp = "api" | "app" | "web";

const LOCAL_ENV_FILES = [".env", ".env.local", ".env.development", ".env.development.local"];

const EMULATOR_BLOCK = {
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-next-boilerplate",
};

// Empty rather than absent: when the admin project id is missing, the auth keys fall back to
// the public project id and then treat the service account as half configured.
const FORCED_EMPTY = [
    "FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", "ARCJET_KEY", "ONBOARDING_ENABLED",
];

export function buildStackEnv(app: StackApp, root = defaultAppsRoot()): Record<string, string> {
    // 1. chaves de .env.example com os valores dele
    // 2. toda chave que só aparece nos arquivos locais → ""
    // 3. FORCED_EMPTY → "" ; EMULATOR_BLOCK por cima
    // 4. refuseSeedReason(readEmulatorTarget(result)) → throw new Error(reason)
}
```

- `FIRESTORE_EMULATOR_HOST` vai para os três apps, não só para a API; o app e a web não usam Firestore, e a
  chave a mais não muda nada neles, mas faz a checagem do passo 4 valer para todos.
- `ONBOARDING_ENABLED=""` mantém o onboarding ligado, que é o default de um clone (`apps/app/.env.example:29-32`).
- `NEXT_PUBLIC_APP_URL` da web continua o do `.env.example` (vazio), para o CTA levar ao cadastro da web.
- A lista `FORCED_EMPTY` sai das variáveis que `packages/auth/client.ts:40-43,67-73` e `packages/auth/keys.ts`
  leem. Se o client receber `NEXT_PUBLIC_FIREBASE_*` preenchido, ele usa a config real mesmo conectado ao
  emulador (`client.ts:95-96`) e as contas caem no project id errado.

### 10.5 `tests/global.setup.ts`

1. Roda `pnpm --filter api seed` com `env: { ...process.env, ...buildStackEnv("api") }` via `execFileSync`. O
   `--env-file-if-exists=.env` do script não sobrescreve variável já definida, então o `.env` real não entra.
2. Faz login pela UI como `user@example.com` e salva `page.context().storageState({ path: ".auth/common.json", indexedDB: true })`;
   o mesmo para `admin@example.com` em `.auth/admin.json`. O `indexedDB: true` importa porque o SDK manda o
   ID token do Firebase client como bearer (`AuthRequestPanelContext.tsx:80-82`) e o Firebase guarda a
   sessão do client no IndexedDB. Se não bastar, o fallback é um fixture que faz login por teste; o
   `/develop` registra qual caminho funcionou.

Os specs que partem logados usam `test.use({ storageState: ".auth/common.json" })`. `signIn.spec.ts`,
`signUp.spec.ts` e `landing.spec.ts` partem sem sessão.

### 10.6 Acessibilidade

```ts
// support/a11y.ts
export async function expectAccessible(page: Page, testInfo: TestInfo, { route }: { route: string }) {
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
    const { failing, staleExceptions } = filterViolations(results.violations, route, A11Y_ALLOWLIST);
    await testInfo.attach(`axe-${route}`, { body: JSON.stringify(results.violations, null, 2), contentType: "application/json" });
    for (const entry of staleExceptions) testInfo.annotations.push({ type: "a11y-stale-exception", description: `${entry.ruleId} @ ${entry.route}` });
    expect(failing, formatViolations(failing)).toEqual([]);
}
```

```ts
// a11y/allowlist.ts
export type A11yException = {
    route: string;        // "/pt-br/sign-in"
    ruleId: string;       // "button-name"
    target: string;       // seletor do axe (node.target.join(" ")), casado por igualdade
    reason: string;       // por que não foi corrigido nesta entrega
};
export const A11Y_ALLOWLIST: A11yException[] = [ /* preenchida com a primeira execução */ ];
```

- Falham só `impact` `critical` e `serious`. As demais ficam no anexo JSON do relatório.
- A exceção casa por rota + regra + alvo. Uma exceção de `button-name` no botão de senha do sign-in não
  esconde um `label` novo num campo da mesma tela, que é o sinal de pronto "campo sem rótulo acessível é
  apontado automaticamente".
- Se o alvo que o axe devolve contiver id gerado (Radix usa `radix-:r1:`), o `/develop` casa por um trecho
  estável e documenta no motivo. Casar só por rota + regra está vetado.
- Antes do axe no tema escuro, o helper espera `html` ter a classe `dark` (next-themes aplica depois da
  hidratação).
- A allowlist nasce com o que a primeira execução encontrar. Cada entrada é listada no `develop/handoff.md`
  e vira achado no backlog pelo `/review` (A2 já antecipa duas).

### 10.7 Cobertura

`vitest.config.mts` na raiz (novo):

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        projects: ["apps/*/vitest.config.mts", "packages/*/vitest.config.mts"],
        coverage: {
            provider: "v8",
            reportsDirectory: "coverage",
            reporter: ["text-summary", "json-summary", "html"],
            include: ["apps/*/**/*.{ts,tsx}", "packages/*/**/*.{ts,tsx}"],
            exclude: [
                "**/__tests__/**", "**/*.config.*", "**/*.d.ts", "**/.next/**",
                "**/node_modules/**", "apps/e2e/**",
            ],
        },
    },
});
```

- Raiz `package.json`: `"coverage": "NODE_ENV=test vitest run --coverage"` e `"e2e": "pnpm --filter e2e e2e"`;
  devDependency `"@vitest/coverage-v8": "4.0.3"`, exata, porque o peer dela é `vitest: 4.0.3` exato e é essa
  a versão resolvida hoje (`node_modules/.pnpm/vitest@4.0.3...`). Quem subir o `vitest` sobe as duas juntas;
  `docs/SETUP.md` registra isso.
- Com `include` preenchido, arquivo que nenhum teste importa conta como 0%. O número é menor e honesto.
- Os configs por workspace ficam como estão. Com `projects`, eles não podem estender o config raiz
  (`engineering-baseline.md:94`), e não precisam.
- `apps/e2e/vitest.config.mts` entra no glob `apps/*`, então os dois testes unitários da suíte também rodam
  no `pnpm coverage`. O código de `apps/e2e` fica fora da medição (`exclude`), porque é ferramenta de teste e
  não produto.
- O que o `/develop` confere: o `jsdom` e o `@vitejs/plugin-react` do projeto `apps/app` resolvem quando o
  Vitest roda a partir da raiz. Se não resolverem, registrar e ajustar o config raiz, não os configs
  por workspace.
- `scripts/coverage-summary.mjs` (novo, Node puro): lê `coverage/coverage-summary.json`, agrupa por
  `apps/<x>`/`packages/<y>` e imprime uma tabela markdown (linhas, statements, funções, branches) com o total.

### 10.8 `.github/workflows/ci.yml` (pseudo-diff)

```yaml
 jobs:
   verify:
     # inalterado
+
+  changes:
+    name: changes
+    runs-on: ubuntu-latest
+    timeout-minutes: 5
+    outputs:
+      product: ${{ steps.scope.outputs.product }}
+    steps:
+      - uses: actions/checkout@v7
+        with:
+          fetch-depth: 2
+      # On a pull request the checkout is the merge commit, so HEAD^1 is the base tip.
+      - id: scope
+        run: |
+          if [ "${{ github.event_name }}" != "pull_request" ]; then
+            echo "product=true" >> "$GITHUB_OUTPUT"
+          elif git diff --name-only HEAD^1 HEAD | grep -qvE '^(docs/|specs/|\.claude/)|\.md$'; then
+            echo "product=true" >> "$GITHUB_OUTPUT"
+          else
+            echo "product=false" >> "$GITHUB_OUTPUT"
+          fi
+
+  e2e:
+    name: e2e
+    needs: changes
+    if: needs.changes.outputs.product == 'true'
+    runs-on: ubuntu-latest
+    timeout-minutes: 25
+    steps:
+      - uses: actions/checkout@v7
+      - uses: pnpm/action-setup@v6
+      - uses: actions/setup-node@v7
+        with: { node-version-file: .nvmrc, cache: pnpm }
+      - uses: actions/setup-java@<major atual>
+        with: { distribution: temurin, java-version: "21" }
+      - run: pnpm install --frozen-lockfile
+      - uses: actions/cache@<major atual>
+        with:
+          path: ~/.cache/firebase/emulators
+          key: firebase-emulators-${{ hashFiles('pnpm-lock.yaml') }}
+      - id: playwright-version
+        run: echo "version=$(pnpm --filter e2e exec playwright --version | awk '{print $2}')" >> "$GITHUB_OUTPUT"
+      - id: playwright-cache
+        uses: actions/cache@<major atual>
+        with:
+          path: ~/.cache/ms-playwright
+          key: playwright-${{ steps.playwright-version.outputs.version }}
+      - if: steps.playwright-cache.outputs.cache-hit != 'true'
+        run: pnpm --filter e2e exec playwright install --with-deps chromium
+      - if: steps.playwright-cache.outputs.cache-hit == 'true'
+        run: pnpm --filter e2e exec playwright install-deps chromium
+      - run: pnpm e2e
+      - if: failure()
+        uses: actions/upload-artifact@<major atual>
+        with:
+          name: e2e-evidence
+          path: |
+            apps/e2e/playwright-report
+            apps/e2e/test-results
+            *-debug.log
+          retention-days: 14
+
+  coverage:
+    name: coverage
+    needs: changes
+    if: needs.changes.outputs.product == 'true'
+    runs-on: ubuntu-latest
+    timeout-minutes: 15
+    steps:
+      - checkout, pnpm/action-setup, setup-node, pnpm install --frozen-lockfile (como no verify)
+      - run: pnpm coverage
+      - run: node scripts/coverage-summary.mjs >> "$GITHUB_STEP_SUMMARY"
+      - uses: actions/upload-artifact@<major atual>
+        with: { name: coverage, path: coverage, retention-days: 14 }
```

- `verify` não muda, e a linha `pnpm turbo run lint typecheck test` continua sendo o gate que roda igual
  local e no CI. O E2E fica fora dela porque precisa de JDK, browser, emulador e três servidores, e uma
  task do turbo com `env: []` não teria as variáveis de que o Next precisa; `cache: false` tiraria o
  benefício do turbo de qualquer jeito.
- Job pulado por `if` reporta sucesso, então `e2e` pode ser check obrigatório sem travar PR de documentação.
- `permissions: contents: read` do topo do workflow vale para os jobs novos. `upload-artifact` e
  `$GITHUB_STEP_SUMMARY` não precisam de escrita no repositório.
- `CI=true` já vem do runner, e é ele que liga `retries`, `forbidOnly` e `failOnFlakyTests`.
- Majors das actions novas (`setup-java`, `cache`, `upload-artifact`): o `/develop` usa a major atual de cada
  uma, conferida no GitHub, no mesmo critério do commit `77c2939` (runtime Node 20 descontinuado).

### 10.9 `.gitignore` (acréscimo)

```
# Playwright
apps/e2e/playwright-report/
apps/e2e/test-results/
apps/e2e/blob-report/
apps/e2e/.auth/
```

O `.gitignore` já ignora `coverage` em qualquer nível. Sem o acréscimo, o Biome lint varre os relatórios
(ultracite usa `vcs.useIgnoreFile`, `node_modules/ultracite/config/core/biome.jsonc:527`).

### 10.10 Documentação (pseudo-diffs)

- `CLAUDE.md`, regra de ouro 11: uma frase no fim: "A suíte E2E (`pnpm e2e`, Playwright) roda no CI como
  rede de regressão dos fluxos críticos e não substitui essa passada: ela confere que o fluxo funciona, não
  julga tema, responsivo nem layout." Nos comandos essenciais, `pnpm e2e` e `pnpm coverage`.
- `docs/review-checklist.md` §7: linha nova na tabela, `CI | lint · typecheck · test · E2E (Playwright) ·
  cobertura | log e artefatos do job`, e uma frase sobre a fronteira com o `agent-browser`.
- `docs/AI-WORKFLOW.md:123` e a tabela equivalente: trocar "e2e com `agent-browser`" por "passada de browser
  com `agent-browser`", para não confundir com a suíte Playwright.
- `docs/SETUP.md`: seção "Testes E2E (Playwright)" depois de "CI": o que cobre, como rodar local (JDK 21,
  `playwright install chromium`, portas livres, `pnpm e2e`, `pnpm --filter e2e e2e:report`), por que ignora o
  `.env` local, como ler a evidência no CI, a regra de allowlist e de instabilidade. Seção "Cobertura" com
  `pnpm coverage` e a nota do peer exato. Tabela do CI ganha os três jobs novos. Runbook de branch
  protection: passo 3 seleciona `verify` e `e2e`.
- `docs/PRE-PRODUCTION.md` §9: o item passa a pedir `verify` e `e2e`, com o estado remedido.

### 10.11 Ordem de implementação e commits

Não há SDK, API de produto nem i18n novo. A ordem segue a dependência:

1. `chore: add coverage provider and root vitest projects` (raiz: `package.json`, `pnpm-lock.yaml`,
   `vitest.config.mts`, `scripts/coverage-summary.mjs`).
2. `test(e2e): add playwright workspace with stack env guard` (`apps/e2e/package.json`, `tsconfig.json`,
   `vitest.config.mts`, `playwright.config.ts`, `support/`, `__tests__/`, `.gitignore`, raiz `package.json`
   script `e2e`, `pnpm-lock.yaml`).
3. `test(e2e): cover sign-up, sign-in, entity crud, panel switch and landing` (`tests/*.spec.ts`,
   `global.setup.ts`).
4. `test(e2e): add axe checks with initial allowlist` (`support/a11y.ts`, `a11yFilter.ts`, `a11y/allowlist.ts`,
   `a11yDark.spec.ts`, chamadas nos specs).
5. `ci: run e2e and coverage jobs on product changes` (`.github/workflows/ci.yml`).
6. `docs: document e2e suite, coverage and the agent-browser boundary` (`CLAUDE.md`, `docs/SETUP.md`,
   `docs/review-checklist.md`, `docs/AI-WORKFLOW.md`, `docs/PRE-PRODUCTION.md`).
7. `docs(features): e2e-testing` (último).

O `/review` ajusta tipo e escopo; o que está acima é proposta.

### 10.12 Env nova

Nenhuma variável nova em app. `CI` é lida pela config do Playwright e vem do runner. Um fork não configura
nada para a suíte rodar; para ela bloquear merge, precisa do P1.

---

## Decisões adotadas sem perguntar

| # | Decisão | Alternativa descartada | Por quê |
|---|---------|------------------------|---------|
| D1 | E2E pula PR que só mexe em `docs/`, `specs/`, `.claude/` ou `*.md`; roda nas demais e em todo push na `main` | Rodar só quando o diff toca `apps/` ou `packages/design-system` (texto literal da recomendação da spec) | A intenção da spec é "PR de documentação não espera navegador". Mudança em `packages/auth`, `packages/sdk`, no lockfile ou no `firebase.json` quebra login sem tocar `apps/` |
| D2 | Filtro por job `changes` + `if` no job | `paths:` no gatilho do workflow ou workflow separado | Com `paths`, o check obrigatório fica "esperando" para sempre numa PR de docs; job pulado por `if` conta como sucesso |
| D3 | Fluxos: os da recomendação da spec, mais deep link com redirect e comum barrado no `/admin` | Só os cinco da recomendação | Os dois extras custam um teste cada e cobrem regressões reais (query string perdida na PR #24; autorização espelhada) |
| D4 | `next dev` para os três apps, local e CI | `next build && next start` | O build da API exige service account (`apps/api/env.ts:13-15,46`). Credencial fictícia nunca foi testada e o CI é, por decisão do `ci-pipeline`, sem secrets. O custo é a primeira compilação de cada rota, absorvida com timeouts maiores |
| D5 | Workspace `apps/e2e`, script `e2e` | Pasta `e2e/` na raiz com deps no `package.json` raiz | `apps/*` já é workspace; ganha `typecheck` no gate sem editar `pnpm-workspace.yaml`. Na raiz não haveria typecheck (`tsconfig.json` da raiz não é usado por task) |
| D6 | E2E fora da linha `pnpm turbo run lint typecheck test`, em job próprio | Task `e2e` no turbo dentro do gate | Precisa de JDK, browser, emulador e servidores; com `env: []` o Next não receberia o ambiente, e `cache: false` anula o turbo. O gate barato continua em ~1 min e sem browser |
| D7 | `retries: 1` + `failOnFlakyTests` no CI | `retries: 0`, ou retry sem reprovar | Teste instável reprova, mas aparece marcado como `flaky`. É o mecanismo que falta hoje segundo a spec ("nenhum gate distingue teste que passa de teste que passa quase sempre") |
| D8 | `workers: 1` | Paralelismo do Playwright | Emulador único e `next dev` compilando sob demanda; a suíte tem ~20 testes e o sharding está fora do corte |
| D9 | a11y em light nas telas dos fluxos e em dark nas telas estáticas | Só light | Contraste no tema escuro é a classe de defeito que este repo mais entregou (D2 de `billing-subscription`, 1,97:1; o rótulo no dark corrigido em `label.tsx`). O custo é ~1 s por tela |
| D10 | Allowlist inicial em vez de corrigir componentes | Corrigir já o botão de senha e o Select de ambiente | A spec pede lista de exceções para não travar no dia 1, e a correção atinge `packages/design-system` e i18n, fora do corte. Cada exceção vira achado |
| D11 | Seletores por papel, rótulo e texto do dicionário `pt-br`; zero `data-testid` | Acrescentar `data-testid`/`aria-label` no código dos apps | Mantém a entrega sem diff de produto e testa o que o usuário vê. Os dois elementos sem nome ficam atrás de helpers com seletor estrutural |
| D12 | Só `pt-br`, só desktop | Três idiomas e mobile | Paridade de chaves já é testada; mobile e idiomas continuam com o `agent-browser` no `/test` |
| D13 | O ambiente dos servidores vem do `.env.example` com chaves locais zeradas, e a suíte recusa alvo não-emulador reusando `emulatorTarget.mjs` | Confiar no `.env` local, ou exigir que o dev edite o `.env` | Os `.env` desta máquina apontam para um projeto real. Reusar a função do seed mantém uma regra só |
| D14 | Apps nunca reaproveitam servidor já de pé; emulador pode | `reuseExistingServer: !CI` | Um `pnpm dev` de pé pode estar com o `.env` real, e reaproveitar tornaria a trava de D13 inútil |
| D15 | Seed rodado pelo projeto `setup` a cada execução | Exigir `pnpm seed` manual antes | Estado de partida sempre igual. O custo é apagar o estado do emulador local, que já é efêmero por desenho (`docs/SETUP.md:247-250`) |
| D16 | Cobertura por `vitest.config.mts` na raiz com `projects` e v8, em job próprio sem limiar | Coverage por workspace mesclado depois, ou rodar dentro do `verify` | Relatório por workspace não soma (`engineering-baseline.md:93-95`) e mesclar exigiria dependência não aprovada. Dentro do `verify` mudaria a linha do gate |
| D17 | `@vitest/coverage-v8` fixada em `4.0.3` | `^4.0.3` | O peer da versão é `vitest: 4.0.3` exato |
| D18 | `actions/setup-java` para o JDK 21 | Apontar `JAVA_HOME` para o `JAVA_HOME_21_X64` da imagem do runner | Action oficial do GitHub, como `checkout` e `setup-node`; não depende do conteúdo da imagem |
| D19 | Artefatos só em falha (e2e) e sempre (coverage), 14 dias | Sempre, 90 dias | Evidência de falha é o que se consulta; cobertura é o número comparável entre execuções |
| D20 | Frontmatter da spec: `status: in-progress`, `feature: e2e-testing` e `updated` | Mudar só `status` e `updated` | O contrato de `specs/README.md` diz que `feature` recebe o slug quando a spec entra em execução, como em `specs/observability-logging.md` |

---

## Perguntas em aberto

Cada uma já tem a opção adotada; nenhuma bloqueia o `/develop`.

1. **Em quais PRs o E2E roda?** Opções: (a) toda PR; (b) só quando toca `apps/` ou `packages/design-system`;
   (c) toda PR que não seja só documentação. **Adotada: (c).** Mudanças em `packages/auth`, no SDK ou no
   lockfile quebram login sem tocar `apps/`, e (b) deixaria essas passarem.
2. **Corrigir já as violações de a11y que entrarem na allowlist?** Opções: (a) allowlist agora e correção
   depois, via backlog; (b) corrigir nesta entrega o botão de senha e o Select de ambiente, com chaves nos
   três idiomas. **Adotada: (a),** como a spec recomenda. A (b) é pequena e fecha o A2 de uma vez, se você
   preferir.
3. **Rodar os apps em modo produção no CI?** Opções: (a) `next dev`; (b) `build` + `start` com credencial
   fictícia do Admin SDK, hoje não testada. **Adotada: (a).** A (b) aproxima do que roda na Vercel e fica
   para uma spec própria, se a instabilidade de compilação sob demanda aparecer.
4. **O `/test` passa a rodar `pnpm e2e` em toda entrega de front-end?** Opções: (a) não, o CI é o dono da
   execução recorrente; (b) sim, antes da passada com `agent-browser`. **Adotada: (a)** nesta entrega (o
   `analista-qa` não muda). A (b) antecipa a quebra antes do push, ao custo de alguns minutos por `/test`.
5. **Tornar `coverage` check obrigatório?** Opções: (a) não, só informativo; (b) sim. **Adotada: (a).** Sem
   limiar, o job só falha quando um teste falha, e isso o `verify` já pega.
