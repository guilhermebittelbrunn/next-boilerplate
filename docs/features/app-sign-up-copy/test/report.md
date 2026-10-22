# Relatório do `/test`: app-sign-up-copy

Rodada autônoma do `/cycle`, em 2026-10-21, na branch `fix/auth-forms-and-global-error-theme`. Nada foi commitado e
nenhuma branch foi criada. O working tree também carrega a `web-auth-forms` e a `global-error-theme`, já testadas; elas
não foram retestadas aqui, só entraram nas suítes.

Resultado: 8 de 8 critérios ✅, nenhum ❌, nenhum 🔒. Não achei defeito de produção. Não criei teste novo.

## 1. Cobertura

| comando | escopo | resultado |
|---------|--------|-----------|
| `pnpm --filter app test` | `apps/app` | 117 arquivos, 1001 testes, exit 0 |
| `pnpm --filter web test` | `apps/web` | 26 arquivos, 207 testes, exit 0 |
| `pnpm --filter @repo/internationalization test` | paridade pt-br/en/es + `apiErrors` | 7 arquivos, 67 testes, exit 0 |
| `pnpm --filter app typecheck` / `pnpm --filter web typecheck` | | exit 0 / exit 0 |
| `pnpm test` (raiz, com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | turbo, `test` + `test:emulator` | 15/15 tasks, 4 do cache, exit 0, 1m24s. `api` 1455, `api:test:emulator` 207, `app` 1001, `web` 207, `email` 205, `design-system` 171, `auth` 132, `internationalization` 67, `shared` 56, `security` 45, `analytics` 34, `next-config` 32, `payments` 22, `e2e` 16, `sdk` 11 |
| `git grep -n "signUp\.noAccount\|signUp\.enterWithYourAccount" -- apps/app` | consumidores das chaves antigas | nada encontrado, exit 1 |

Sem `--force`: nada me fez suspeitar do cache. Não remedi o `pnpm check`. O `/review` mediu 972 arquivos limpos, e
esta etapa não alterou nenhum arquivo do repo fora de `docs/features/app-sign-up-copy/test/` e do `STATE.md`.

## 2. Critérios de aceite, item a item

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | O cadastro pergunta se a pessoa já tem conta antes do link | ✅ | e2e nos 3 idiomas + unit (`authPagesCopy`, `signUpFormApi`) |
| 2 | O link do cadastro preserva o `?redirect=` e leva ao login | ✅ | e2e com clique real + unit (`signUpFormApi`) |
| 3 | O subtítulo do cadastro convida a criar conta | ✅ | e2e nos 3 idiomas + unit (`authPagesCopy`) |
| 4 | A descrição da página de cadastro está certa nos 3 idiomas | ✅ | `curl` do HTML servido + DOM no navegador + unit (`authPagesRedirect`) |
| 5 | O login em es tem o "¿" nas duas apps | ✅ | e2e na app e na landing + unit (`authPagesCopy`) |
| 6 | O login em pt-br e en não muda, e a descrição do login é a mesma | ✅ | e2e na app e na landing + `curl` + `git show HEAD` da folha da landing |
| 7 | Tema e largura | ✅ | e2e, claro e escuro, 1280 px e 375 px |
| 8 | Testes e gates | ✅ | comandos da seção 1 |

O texto completo dos critérios, no formato §9.1, está em `test/criterios-aceite.md`.

## 3. Decisões de custo de teste

- `SignUpFormClient.tsx` e a folha `translations/apps/app/pages/signUp`: não criei teste. O `authPagesCopy.test.ts` já
  prova o dicionário nos três idiomas, e o caso novo do `signUpFormApi.test.tsx` prova que o componente lê as chaves
  novas. O handoff deixou o caso de componente só em pt-br; repetir em en e es mediria o mesmo componente com outro
  objeto, e o e2e viu a tela nos três.
- Os dois `page.tsx`: não criei teste. O caso por referência (`toBe`) do `authPagesRedirect.test.tsx` prova o
  namespace. O que ele não prova, o `<head>` real com o `createMetadata` de verdade, conferi com `curl` no HTML servido.
  Um teste Vitest disso renderizaria o metadata do Next fora do Next e provaria pouco além do que o `curl` mostrou.
- As folhas de login (`app/pages/signIn` e `web/pages/signIn`): mudou um valor em cada uma. O bloco do "¿" do
  `authPagesCopy.test.ts` cobre as duas.
- Nenhum teste da faixa cara. O app de pé desta rodada foi o e2e com `agent-browser`, e nada dele ficou no repo.

## 4. Verificar no `/test` (lista do `review.md`)

| item | veredito | o que medi |
|------|----------|-----------|
| 1. F2, `<head>` do cadastro nos 3 idiomas | **confirmado** | `curl` do HTML servido em `/pt-br/sign-up`, `/en/sign-up` e `/es/sign-up`: `<meta name="description" content="Crie sua conta"/>`, `"Create your account"` e `"Crea tu cuenta"`, e `og:description` com os mesmos valores. No navegador, `document.querySelector('meta[name="description"]').content` e o `og:description` deram os mesmos três valores. Título da aba: "Cadastrar \| next-boilerplate", "Sign Up \| next-boilerplate", "Registrarse \| next-boilerplate" |
| 2. F1, texto do bloco pergunta + link, subtítulo, `?redirect=` com clique | **confirmado** | `textContent` do `div.text-center.text-sm`: "Já tem uma conta? Entrar", "Already have an account? Sign In", "¿Ya tienes una cuenta? Iniciar sesión". O `<span>` da pergunta termina em espaço nos três (`"Já tem uma conta? "`, `"Already have an account? "`, `"¿Ya tienes una cuenta? "`). Subtítulo: "Crie sua conta para começar", "Create your account to get started", "Crea tu cuenta para empezar". Em `/pt-br/sign-up?redirect=/pt-br/account`, o `href` era `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount`; cliquei no link e a URL final foi `http://localhost:3000/pt-br/sign-in?redirect=%2Fpt-br%2Faccount`, com o `<h1>` "Entrar" e o link "Cadastrar" de volta para `/pt-br/sign-up?redirect=%2Fpt-br%2Faccount` |
| 3. F3 e F4, "¿No tienes una cuenta? Registrarse" em `/es/sign-in` | **confirmado** | App (3000) e landing (3001): bloco com "¿No tienes una cuenta? Registrarse", `<span>` igual a `"¿No tienes una cuenta? "`, link "Registrarse" para `/es/sign-up` |
| 4. F5, login pt-br e en sem mudança, `meta` do login igual | **confirmado** | App: "Não tem uma conta? Cadastrar" e "Don't have an account? Sign Up", subtítulos "Entre com sua conta para continuar" e "Enter with your account to continue". Landing: os mesmos dois textos. `curl` no login da app: `description` e `og:description` "Faça login na sua conta", "Sign in to your account", "Inicia sesión en tu cuenta". `git show HEAD:` da folha `web/pages/signIn` traz exatamente esses três valores em `meta.description`, então o `<head>` do login não mudou com a troca de namespace |
| 5. Claro, escuro e 375 px no F1 e no F3 | **confirmado** | Seção 5. A frase coube numa linha em todos os casos medidos, incluindo o es do cadastro (o mais longo, "¿Ya tienes una cuenta? Iniciar sesión") a 375 px |

## 5. Evidências e2e

Os screenshots ficaram em `docs/features/app-sign-up-copy/test/e2e/` (`01` a `07`). O `.gitignore` descarta essa pasta
(`git check-ignore` confirmou); a prova é o texto abaixo. Medi com `getComputedStyle` e `getBoundingClientRect`. O
tema veio do `set media` do navegador, porque o `ThemeProvider` usa `defaultTheme="system"`, e a classe `dark` ou
`light` do `<html>` acompanhou a mídia em todos os casos.

### 5.1 Cores e contraste

Igual nas duas apps e nas duas telas:

| tema | fundo do `<body>` | pergunta (`text-muted-foreground`) | link (`text-primary`) |
|------|-------------------|------------------------------------|------------------------|
| claro | `lab(100 0 0)` | `lab(46.64 0 0)`, contraste aproximado de 5,1:1 | `lab(7.78 0 0)`, cerca de 17,9:1 |
| escuro | `lab(2.75 0 0)` | `lab(66.13 0 0)`, cerca de 7,6:1 | `lab(98.26 0 0)`, cerca de 19:1 |

Calculei o contraste a partir do L\* (luminância relativa pela fórmula CIE), contra o fundo da página. O card tem fundo
próprio do token `--card`, que não medi à parte. Todos os valores passam de 4,5:1.

### 5.2 Largura

| tela | viewport | tema | linhas do link (`getClientRects`) | pergunta e link na mesma linha | `scrollWidth` | link dentro do card |
|------|----------|------|-----------------------------------|--------------------------------|---------------|---------------------|
| app `/pt-br/sign-up` | 1280 | claro e escuro | 1 | sim | 1265 | sim |
| app `/en/sign-up` | 1280 | claro | 1 | sim | 1265 | sim |
| app `/es/sign-up` | 1280 | claro | 1 | sim | 1265 | sim |
| app `/pt-br/sign-up` | 375 | escuro | 1 | sim (top 667 nos dois) | 375 | link em 232 a 272 px |
| app `/en/sign-up` | 375 | escuro | 1 | sim | 375 | link em 251 a 295 px |
| app `/es/sign-up` | 375 | claro e escuro | 1 | sim | 375 | link em 222 a 307 px |
| app `/es/sign-in` | 375 | escuro | 1 | sim (top 638) | 375 | link em 229 a 303 px, card de 24 a 351 px |
| landing `/es/sign-in` | 375 | escuro | 1 | sim (top 648) | 360 | link em 221 a 295 px, card de 16 a 344 px |
| landing `/es/sign-in`, `/pt-br/sign-in`, `/en/sign-in` | 1280 | claro | 1 | sim | 1265 | sim |

O `scrollWidth` de 1265 a 1280 px é a barra de rolagem vertical. Nenhum caso teve rolagem horizontal.

### 5.3 Observação sobre a ferramenta

Logo depois do clique no link do cadastro, o `agent-browser get url` devolveu a URL antiga uma vez, porque a navegação
do `next/link` é no cliente e terminou depois do `wait --load networkidle`. O snapshot seguinte já mostrava o login, e
o `get url` repetido deu a URL nova. Não é defeito do produto.

## 6. Ambiente do e2e

| porta | antes | o que fiz | depois |
|-------|-------|-----------|--------|
| 3000 `app` | livre | subi `pnpm --filter app dev` (PID 88029, `next-server` 88070, `cwd` em `fredericton/apps/app`) | livre |
| 3001 `web` | livre | subi `pnpm --filter web dev` (PID 88030, `next-server` 88071, `cwd` em `fredericton/apps/web`) | livre |
| 3002, 3003, 9099, 8080, 9199, 4001, 4400, 4500 | livres | nada; as telas renderizam sem API e sem emulador. O `test:emulator` do `pnpm test` da raiz sobe e derruba os emuladores sozinho | livres |

Derrubei pela árvore de PIDs (`pnpm` → `pnpm` → `next dev` → `next-server`), do filho para o pai, e confirmei com
`lsof -ti tcp:<porta>` vazio em todas as portas da tabela. Fechei o navegador com `agent-browser close`. Não reutilizei
nenhum serviço do usuário.

Não usei build de produção: nada no e2e levantou suspeita de artefato do `next dev`, e o `<head>` foi medido no HTML
servido.

## 7. O que falta testar / lacunas

| lacuna (handoff e review) | veredito |
|---------------------------|----------|
| Nenhum teste cobre o `<head>` real (`createMetadata` mockado como identidade) | **fechada** pelo `curl` do HTML servido (seção 4, item 1). Continua sem teste automatizado, de propósito (seção 3) |
| O caso de componente roda só em pt-br | **fechada** pelo e2e nos três idiomas. O teste continua só em pt-br, e aceito isso pela seção 3 |
| A metade da landing (`web/pages/signUp` e `sign-up-form-client.tsx`) com a copy do login | **fora de escopo** (§1.4 do plano). Não medi o cadastro da landing |
| `components.header.noAccount` es sem "¿" | **fora de escopo** (D6 do plano). Chave sem consumidor |
| `packages/auth/components/sign-in.tsx:125` com "Don't have an account?" fixo no JSX, componente sem importador | **fora de escopo**, achado 🟢 do `review.md` para o `/spec --sync` |

## 8. Estado de dev alterado

Nenhum. Não criei conta, não gravei dado no Firestore nem no Auth e não usei credencial. Nada vai para o
`docs/PRE-PRODUCTION.md`.

Harness temporário: as duas sondas JavaScript e os logs das suítes ficaram em `/tmp/qa-asuc/`, fora do repo, e apaguei
a pasta inteira no fim. Nenhum arquivo do repo foi alterado fora de `docs/features/app-sign-up-copy/test/` e do
`STATE.md`.
