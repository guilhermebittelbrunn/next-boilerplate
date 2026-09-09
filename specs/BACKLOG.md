# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção **Entregues** abaixo. Ciclo de vida: [`README.md`](README.md).

> **Última auditoria:** 2026-09-02 (`/spec --sync`, pós-pipeline de `api-hardening`, **reconciliada com
> a 3ª rodada**) · anteriores: 2026-09-01 3ª rodada (pós-merge da PR #5) · 2026-09-01 2ª · 2026-09-01 1ª ·
> 2026-08-31 · **rodada de origem:** semeadura inicial (2026-08-21).
>
> ### Este arquivo é o merge de duas auditorias do mesmo dia
>
> Duas rodadas de `/spec --sync` correram em paralelo sem saber uma da outra, e este índice é a
> reconciliação das duas:
>
> - a **3ª rodada** fechou `ci-pipeline`, virou a **PR #6** e **está mergeada em `main`**
>   (`44e3f23`). A spec saiu de `specs/` e vive em
>   [`docs/features/ci-pipeline/spec.md`](../docs/features/ci-pipeline/spec.md);
> - a **4ª rodada** (esta) auditou `api-hardening` de ponta a ponta.
>
> **Sobre `ci-pipeline`, a decisão da 3ª rodada prevalece e não é reaberta aqui.** Esta auditoria havia
> recomendado segurar o fechamento até a branch protection existir; a decisão foi fechar, está mergeada,
> e uma auditoria não reverte decisão de produto já tomada. O que sobrevive é o **registro da lacuna**:
> ver [`ci-pipeline` — fechada com um item em aberto](#ci-pipeline--fechada-com-um-item-em-aberto).
>
> ### A entrega de `api-hardening` **está commitada e pushada** — a medição mudou de figura
>
> Quando esta rodada começou, a entrega existia só no working tree, e o índice dizia isso em letras
> garrafais. **Não é mais o caso.** Os **17 commits** estão em `api-hardening-flow`, a branch está no
> remoto e a **PR #8** (`feat: harden the API edge with security headers, CORS allowlist and rate
> limits`) está **aberta**.
>
> Consequência honesta: **o argumento central que sustentava o "não arquivar" morreu.** Ele era "a
> entrega existe em um único lugar e pode sumir num `git checkout`". A evidência agora é de primeira
> classe — histórico e remoto. A decisão foi **reavaliada do zero** e **mantida**, por uma razão
> diferente e menor. Ver [Por que a spec ainda não foi arquivada](#por-que-a-spec-ainda-não-foi-arquivada).
>
> As tabelas de veredito abaixo foram levantadas **lendo o código**, não o `handoff.md`, e continuam
> válidas: o conteúdo auditado é byte a byte o que foi commitado. Onde o texto disser "working tree",
> leia "o que hoje está nos 17 commits".
>
> ### O que mudou nesta rodada
>
> 1. **`api-hardening` implementada de ponta a ponta.** Os **5 itens do corte** estão no código e os
>    **4 "Sinais de pronto"** atendidos — item a item, com ref de arquivo/linha, em
>    [Onde está `api-hardening`](#onde-está-api-hardening). **Permanece `in-progress`.**
> 2. **`ci-pipeline` saiu do backlog** pela PR #6. O item humano que restava — branch protection — segue
>    **em aberto e sem dono**, e agora é registro de arquivo morto: nenhum `/spec --sync` futuro vai
>    reconciliá-lo. Reconferido nesta rodada: `gh api …/branches/main/protection` → **404**,
>    `gh api …/rulesets` → **`[]`**. O que **melhorou** desde a 3ª rodada: o workflow acumula **5
>    execuções, todas `success`** (2 em `pull_request`, 2 em `push` para `main`).
> 3. **Gates re-medidos por esta auditoria** — ver [Gates](#gates--medidos-nesta-auditoria).
> 4. **Achados: 4 resolvidos, 1 anchor corrigido, 5 novos.** Caíram os 3 de escopo de `api-hardening`
>    (`CORS_ORIGIN`, `isRateLimit()` sem regra, `apps/api` sem `@repo/security`) **e o 🟠 do Node 20**,
>    que a 3ª rodada registrou como aberto e a **PR #7 já havia corrigido** — ver
>    [Achados](#achados-da-varredura-que-não-viraram-spec).
> 5. **Uma deriva corrigida** no texto da spec (`apps/web` × analytics) — ver [Deriva](#deriva).
> 6. **Nova ordem:** com `ci-pipeline` entregue e `api-hardening` fora da fila do `/analyze`, o **#1 é
>    [`transactional-emails`](transactional-emails.md)** — justificado no grafo de `depends_on`, não na
>    ordem herdada. Ver [Ordem recomendada](#ordem-recomendada).
>
> **Nota sobre a evidência visual.** Desde `7dd4439` os screenshots são gitignored
> (`docs/features/**/screenshots/`, `docs/features/**/test/e2e/`). Este índice **nunca** citou prints
> como evidência — cita a descrição do que foi validado, que continua versionada no markdown de cada
> etapa. Nada a ajustar; registrado para que a próxima rodada não vá procurá-los.

## Contadores

Sobre as **17 specs que seguem em `specs/`**. Duas foram entregues e arquivadas: `firestore-admin-access`
(2026-08-31) e `ci-pipeline` (2026-09-01). **Recontados do zero contra o disco em 2026-09-02**, lendo o
frontmatter de cada arquivo — não somando os dois lados do merge.

| status | qtd |
|--------|-----|
| `proposed` | 15 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 2 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência (em `specs/`):** `produto` 8 · `dx` 4 · `confianca` 5.
**Por esforço (em `specs/`):** P 0 · M 14 · G 3.

**A fila `approved` está vazia.** A única `in-progress` é `api-hardening`, e ela está fora da fila do
`/analyze`: o que falta nela não é código, é o merge da PR #8. A próxima a virar tarefa nova é
`transactional-emails`, hoje `proposed` — ou seja, **depende de você aprová-la** antes do `/analyze`.

## Gates — medidos nesta auditoria

Re-executados por esta rodada, com `--force` onde havia cache. **Não são os números do `/test`
copiados** — coincidem, e a coincidência é o resultado. `pnpm check` foi re-rodado **depois** dos 17
commits e o número não se moveu.

| comando | resultado |
|---------|-----------|
| `pnpm check` | **404 arquivos · 0 erros · 0 warnings** (`No fixes applied`) |
| `pnpm turbo run lint typecheck test --force` | **22 tasks, 22 successful, 0 cached** |
| `pnpm test` (root, gateia o `build`) | **8 tasks · 54 arquivos · 421 testes**, todos verdes |

Quebra por workspace do `pnpm test` — **este detalhe é novo**, o `/test` só reportou o total:

| workspace | arquivos | testes |
|-----------|---------:|-------:|
| `api` | 19 | 152 |
| `app` | 23 | 153 |
| `web` | 3 | 22 |
| `@repo/security` | 3 | 31 |
| `@repo/auth` | 2 | 29 |
| `@repo/shared` | 1 | 15 |
| `@repo/internationalization` | 2 | 11 |
| `@repo/payments` | 1 | 8 |
| **total** | **54** | **421** |

As 22 tasks do gate = 1 `//#lint` + 13 `typecheck` + 8 `test`. `@repo/security#test` é a suíte nova desta
entrega (era 21 antes).

## Onde está `api-hardening`

**Status: `in-progress`. Não arquivada.** O corte está inteiro no código, e o código está commitado e
pushado; o que falta é o merge em `main`.

### Os 5 itens do corte de MVP

Conferidos lendo o código — não o `handoff.md`. O que foi auditado é byte a byte o conteúdo dos 17
commits de `api-hardening-flow`.

| item do corte | evidência | veredito |
|---------------|-----------|----------|
| Os três apps respondem com cabeçalhos de segurança, **com CSP ativa** | `packages/security/middleware.ts:146-160` (`applySecurityHeaders`, que injeta na resposta que o proxy já possui em vez do `createMiddleware`, incompatível com as decisões de locale/sessão/CORS) + 3 consumidores reais: `apps/api/proxy.ts:23,51-53`, `apps/app/proxy.ts:107` e `apps/web/proxy.ts:69-73`. Duas políticas distintas: `buildApiOptions()` (`:110-139`, `defaultSrc 'none'` — a API só serve JSON) e `buildBrowserAppOptions()` (`:60-104`). O CSP desligado de `middleware.ts:14`, que a spec citava, **não existe mais** | ✅ **implementado** |
| A origem aceita deixa de ter coringa como padrão, passa pelo env tipado e falha cedo em produção | Coringa extinto: `apps/api/(shared)/lib/cors.ts:67-81` devolve a origem **validada** da allowlist, nunca `*`; sem match, `apps/api/proxy.ts:93-95` recusa com `AUTH_FORBIDDEN_ORIGIN`/403. Env tipado: `apps/api/env.ts:21` (`CORS_ORIGIN: z.string().optional()`), lido em `proxy.ts:19` como `env.CORS_ORIGIN` — **zero** `process.env.CORS_ORIGIN` restante fora do gate de boot. Falha cedo: `apps/api/instrumentation.ts:17-21` lança em produção sem a variável. Fora de produção cai numa allowlist de `localhost:3000/3001` (`cors.ts:8,39`), **não** num coringa | ✅ **implementado** *(com ressalva no [achado (a)](#achados-da-varredura-que-não-viraram-spec): o gate lança mas não encerra o processo)* |
| As rotas públicas de autenticação ganham limite, com 429 e indicação de quando tentar de novo | `apps/api/proxy.ts:31-39` (as 3 rotas) → `:103-111` → `packages/security/index.ts:39-79`, com `slidingWindow` **de fato registrado** (`:50-54`, 20/60s). O 429 sai em `proxy.ts:77-88` com `error.code = AUTH_RATE_LIMITED` e `Retry-After`, e o header é **legível por script cross-origin** graças a `Access-Control-Expose-Headers` (`cors.ts:59,78`) — sem isso o browser o esconderia | ✅ **implementado** *(ressalva material, não regressão: o **formulário** de login não passa pela API — ver [limitação](#a-limitação-que-api-hardening-não-cobre))* |
| O limite é **opt-in**: sem a variável, o app sobe e funciona | `packages/security/index.ts:32,43-44` — sem `ARCJET_KEY`, `checkRateLimit` devolve `{ allowed: true, enforced: false }` antes de instanciar o Arcjet. `packages/security/keys.ts:9-15` trata string vazia como ausente (era o 🔴 do `/develop`: `ARCJET_KEY=""`, o valor que os `.env.example` distribuem, reprovava `startsWith("ajkey_")` e virava 500 em toda requisição). `"not-a-key"` continua lançando — há teste fixando | ✅ **implementado** |
| Um pedido bloqueado é observável e não some em silêncio | `apps/api/proxy.ts:41-49` (`logBlocked`: linha única, prefixo `[security]`, `reason`/`path`/`method`, **sem IP, header ou body**), chamado na recusa de origem (`:63`) e na de limite (`:107`). Complementa `instrumentation.ts:23-27`, que avisa **uma vez no boot** que o limite está desligado | ✅ **implementado** *(o ramo `"bot"` de `RateLimitBlockReason` é inalcançável por esta via: `checkRateLimit` só registra `slidingWindow`, sem `detectBot`. Detecção de bot vive em `secure()`, que a `apps/api` não chama — ver achados)* |

### Os 4 "Sinais de pronto"

| sinal | evidência | veredito |
|-------|-----------|----------|
| Origem não autorizada é recusada e o coringa não aparece em produção | `proxy.ts:93-95` + `cors.ts:47-52,67-72`. `curl` em 5 cenários no `/review` (allowlist real, sem coringa, sem reflexão de origem arbitrária); `apps/api/__tests__/corsOrigin.test.ts` + `corsOriginEnv.test.ts` fixam. `Vary: Origin` sai **inclusive** na resposta sem origem e no 403 (`cors.ts:71`), as duas que não carregam permissão — senão um cache compartilhado as replicaria | ✅ |
| Login além do limite devolve 429 com espera, e a tela mostra mensagem traduzida nos 3 idiomas | `AUTH_RATE_LIMITED` nos 3 idiomas em `packages/internationalization/translations/packages/shared/utils.ts` (pt-br/en/es, paridade verde em 11 testes). Toast visto na tela nos 3 idiomas no `/test`, com `Retry-After: 12` lido por script. Medição com chave Arcjet real no `/develop`: **20 passam, da 21ª em diante 429** | ✅ *(o texto diz "aguarde um instante", sem o número — `FormattedError.retryAfterSeconds` existe e **ninguém o renderiza**; ver achados)* |
| Os três apps trazem cabeçalhos com CSP ativa e nenhuma tela quebra (claro/escuro/mobile) | Zero `Refused to …` em 13 telas × light/dark × desktop/390×844 × pt-br/en/es, em dev **e** em `next build && next start`. Os 3 defaults do nosecone que matariam o login estão tratados de propósito e com o porquê no código: COOP `same-origin-allow-popups` (`middleware.ts:56`), COEP desligado (`:57`) e `frame-src`/`child-src` com o `authDomain` (`:99-100`). 18 mutações no código de produção, 18 mortas — 3 delas em runtime | ✅ *(ressalva de desenho, **não** desvio: na `apps/web` a CSP é **Report-Only** — `apps/web/proxy.ts:64,72`. É exatamente a recomendação da própria spec na sua pergunta em aberto: "somente-relatório na primeira entrega da `apps/web`, bloqueando nos demais apps". Report-Only **relata** e não bloqueia; a landing rodou com **zero violações reportadas**)* |
| Um fork sem a variável de contagem sobe, funciona, e deixa claro que o limite está desligado | `packages/security/index.ts:43-44` (NO-OP) + `instrumentation.ts:23-27` (aviso de boot). Medido ao vivo no `/review` e no `/test`: 25 POSTs em `/auth/sign-in/google` com o limitador desligado → **zero 429**, e o aviso impresso **uma única vez** | ✅ |

### Por que a spec ainda não foi arquivada

Os 5 itens estão no código, os 4 sinais estão atendidos, e agora **os commits existem**. A decisão foi
reavaliada do zero depois disso — e a maior parte do argumento original caiu.

**O que caiu.** Três das quatro razões dependiam de a entrega não estar commitada: que a evidência era de
working tree e portanto de segunda classe; que 31 arquivos podiam sumir num `git checkout`, deixando o
backlog a descrever como entregue algo inexistente (a **regressão** da `/spec-audit` §5); e que arquivar
agora desincronizaria um plano de commits que você ainda ia aprovar bloco a bloco. **Nenhuma das três
sobrevive**: o histórico existe, está no remoto, e o plano foi executado — inclusive com os 2 arquivos de
teste que esta auditoria apontou como ausentes do plano (`securityPolicySources.test.ts` na `app` e na
`web`), hoje versionados.

**O que resta, e é o suficiente — uma coisa só: a entrega não está em `main`.**

O `README.md` define `specs/` como "**apenas o que não foi entregue**", e o sentido operacional de
"entregue" neste repositório é o que um fork recebe ao clonar. **Um fork que clonar `main` hoje ainda
responde `Access-Control-Allow-Origin: *`.** Enquanto for assim, tirar a spec da lista do que falta é
escrever no índice uma coisa que o `main` desmente. Isso não é formalismo: é a diferença entre o backlog
descrever o core e descrever uma branch.

**O precedente confirma a linha, e agora são dois casos.** As duas specs já arquivadas tiveram o código
em `main` no momento do arquivamento: `firestore-admin-access` pela PR #4 (`3089d71`) e `ci-pipeline` pela
PR #5 (`5b56702`), com a PR #6 fazendo o arquivamento **depois**. Não há precedente de spec arquivada a
partir de uma branch aberta — e a PR #8 está **`CONFLICTING`** neste momento, o que torna o merge um
evento real e não uma formalidade.

**A régua permissiva da PR #6 também não fecha o caso.** A #6 redefiniu `done` como "o pipeline da feature
terminou e saiu do backlog", com um item do corte em aberto. Mesmo por essa régua `api-hardening` não
qualifica hoje: `docs/features/api-hardening/STATE.md:17` ainda marca `review` como `in-progress`, e o
próprio `/test` exige um **passe humano do login com Google antes do merge** (🔴 M3, ~2 min) cujo modo de
falha é silencioso — o popup fecha e nada acontece, sem mensagem e sem log. A renovação do ID token após
1h (⚠️ M4) segue não exercitada. A decisão sobrevive às duas definições de `done` em disputa no
repositório.

**A condição exata que falta — uma só:**

> **A PR #8 mergeada em `main`.** Feito isso, `/spec --sync` fecha em uma linha:
> `git mv specs/api-hardening.md docs/features/api-hardening/spec.md`, com `status: done` e a data — o
> mesmo movimento que a PR #6 fez para `ci-pipeline`.

**A rota alternativa, registrada por honestidade.** A `/spec-audit` §4.1 diz que o arquivo movido pertence
ao commit `docs(features): <slug>` daquela feature — o que, lido ao pé da letra, colocaria o `git mv`
**dentro da PR #8**, e não numa rodada posterior. É defensável, e o preço de fazê-lo é acrescentar um
rename a uma PR que hoje não mergeia. Se você preferir esse caminho, é um `git mv` e uma linha de
frontmatter; a recomendação continua sendo esperar o merge, porque ele é o evento que torna a afirmação
verdadeira para quem clona.

### A limitação que `api-hardening` **não** cobre

Registrada aqui porque é a diferença entre o que o corte promete e o que um leitor apressado vai supor:

🔴 **O limite de requisições não protege o formulário de login.** O login por e-mail/senha das duas
front-ends usa `useAuth().signIn` → `packages/auth/client.ts` → `identitytoolkit.googleapis.com`
**direto do browser**, sem tocar a `apps/api`. O corte entrega limite na **superfície da API**
(`/auth/sign-in`, `/auth/sign-up`, `/auth/sign-in/google`) — e as duas primeiras **não têm consumidor
nenhum no repositório**, o que as torna mais suspeitas, não menos: são POST público sem guard que queimam
a cota da Identity Toolkit do fork. O item do corte diz "as rotas públicas de autenticação", e é
literalmente o que foi entregue; só não é o que a frase sugere. Rate limit no `/api/auth/session` das
front-ends ficou **fora do corte** de propósito.

## `ci-pipeline` — fechada com um item em aberto

Arquivada em [`docs/features/ci-pipeline/spec.md`](../docs/features/ci-pipeline/spec.md) pela **PR #6**,
mergeada em `main` (`44e3f23`). O corte ficou em **3 de 5 itens implementados e 2 parciais**; a evidência
item a item, os dois lados da decisão de status e os gates re-executados estão na spec arquivada, em
"Estado da entrega".

**O que este índice precisa continuar dizendo:** `main` **não tem branch protection**, então o CI
**sinaliza e não bloqueia** — a PR #5 foi mergeada sem gate. Reconferido nesta rodada, em 2026-09-02:
`gh api …/branches/main/protection` → **404 `"Branch not protected"`** e `gh api …/rulesets` → **`[]`**
(as duas portas de bloqueio do GitHub, as duas fechadas). Ligar exigindo o check `verify`
(`docs/SETUP.md:122-133`) custa minutos e já está destravado, e **resolve também** o item 2 de
[`e2e-testing`](e2e-testing.md), que herda a mesma pendência.

**O que melhorou desde a 3ª rodada, e vale registrar porque remove a última desculpa técnica:** o
workflow deixou de ser recém-nascido. São **5 execuções, todas `success`** — 2 em `pull_request` e 2 em
`push` para `main` —, `gh workflow list --all` devolve `CI active 347941676`, e o `ci.yml` está em
`origin/main`. O pré-requisito que o runbook avisava (o GitHub só oferece o check na busca depois de
tê-lo visto executar) está **amplamente satisfeito**. O `apps/web` na suíte, item 5 do corte, cresceu de
15 para **22 testes** por causa de `api-hardening`.

Como a spec saiu de `specs/`, **nenhum `/spec --sync` futuro vai reconciliá-la contra o código**. Este
parágrafo, a linha em [Entregues](#entregues) e o "Estado da entrega" da spec arquivada são o único
registro vivo da lacuna.

## Ordem recomendada

A ordem respeita `depends_on` e prioriza o que **desbloqueia** e o que **fica mais caro depois**.

| # | id | por que agora |
|---|----|---------------|
| — | [`api-hardening`](api-hardening.md) | 🚧 **`in-progress`, fora da fila do `/analyze`.** Corte inteiro no código, 17 commits pushados, **PR #8 aberta** (hoje `CONFLICTING`). Falta o merge em `main` + o passe manual do login Google. Ver [Onde está `api-hardening`](#onde-está-api-hardening). |
| 1 | [`transactional-emails`](transactional-emails.md) | **Promovida ao topo, e a razão não é herança da fila — é o grafo de `depends_on` medido.** É a **raiz da cadeia bloqueada mais profunda do backlog**, 5 specs: `transactional-emails` → `auth-recovery-verification` → `account-settings` → {`account-security-mfa`, `data-rights-lgpd`} (+ `teams-organizations` pendurada direto nela). Uma spec de esforço M destranca cinco. E a dependência **não** é burocrática: o corte de `auth-recovery-verification:43` exige "e-mail traduzido no seu idioma" numa "tela do próprio app — **não** pela página padrão do Firebase", e a página hospedada do Firebase não traduz nem respeita a marca. Estado no código, reconferido hoje: `packages/email/templates/` tem **um único** arquivo (`contact.tsx`), com copy em inglês literal dentro do JSX (`:32-39`), fora do dicionário; o único consumidor é `apps/web/app/[locale]/contact/actions/contact.tsx:3-4`. |
| 2 | [`auth-recovery-verification`](auth-recovery-verification.md) | Commodity absoluta (10/10 no painel) e ausente: `sendPasswordResetEmail`, `sendEmailVerification` e `updatePassword` retornam **zero ocorrências** em `apps/` + `packages/`. Um fork não pode ir a produção sem "esqueci minha senha" — hoje o único caminho é resetar à mão no console do Firebase. |
| 3 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | **Subiu de #4 para #3, e o argumento ficou mais forte pela terceira auditoria consecutiva.** Reconferido hoje: `firebase.json` tem **só** `firestore.rules` + `firestore.indexes.json` — **nenhum bloco `emulators`**. Agora o repositório tem **421 testes rodando a cada PR de verdade** (não mais "roda se alguém rodar") e **nenhum deles toca o banco ou as rules**: a única prova de que o `deny-all` funciona continua sendo um `curl` manual de uma auditoria. `api-hardening` acabou de somar ~90 testes e nenhum chega ao Firestore. Cada spec nova que mexe em coleção (`cursor-pagination`, `audit-log`, `account-settings`, `data-rights-lgpd`, `file-upload-storage`) herda essa cegueira. **Com `ci-pipeline` fechada, virou o gargalo único de `e2e-testing`.** |
| 4 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira" por construção. O `BaseRepository` já está no Admin SDK, que é a API sobre a qual o cursor será escrito. Depois de haver dados em produção, a correção quebra contrato do SDK. Cruza com a dívida do `update()` (abaixo), que precisa de `orderBy` estável em `createdAt`. |
| 5 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem. A mutação sob impersonação já foi bloqueada; o **registro** continua inexistente. |
| 6 | [`cookie-consent`](cookie-consent.md) | O Google Analytics carrega hoje **sem qualquer consentimento prévio**. **Nota nova de `api-hardening`:** a CSP da `apps/app` só libera as origens do GA quando `NEXT_PUBLIC_GA_MEASUREMENT_ID` começa com `G-` (`apps/app/proxy.ts:26-28`), então a política já tem o gancho de onde pendurar o Consent Mode. |
| 7 | [`file-upload-storage`](file-upload-storage.md) | Nenhuma integração de storage existe; desbloqueia avatar e anexos. **Nota nova:** a CSP passou a nomear origens de imagem explicitamente (`img-src` com `lh3.googleusercontent.com`), então storage novo exige entrada na política — barato agora, chato depois. |
| 8 | [`account-settings`](account-settings.md) | A sidebar tem 4 links de Settings apontando para `#`, e **todas** as rotas de usuário são admin-only: ninguém consegue editar a si mesmo. |
| 9 | [`billing-subscription`](billing-subscription.md) | ⚠️ A documentação descreve como pronto o que não existe (ver Achados). Monetização é 9/10 no painel. **Pré-requisito barato:** o 🔴 de `packages/payments/ai.ts` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. **Nota nova:** quando o checkout da Stripe for ao navegador, a CSP da `apps/app` terá de liberar `js.stripe.com` e o `frame-src` do checkout; o ponto de extensão existe (`buildBrowserAppOptions`, `SecurityHeadersInput`). |
| 10 | [`onboarding-flow`](onboarding-flow.md) | Maior desequilíbrio valor/prevalência do painel: 3/10 entregam, e é onde o usuário decide se fica. |
| 11 | [`observability-logging`](observability-logging.md) | Sem logger estruturado e sem coleta de erro. **O custo de plugar caiu outra vez:** `api-hardening` criou o primeiro log deliberado do repositório (`apps/api/proxy.ts:41-49`, prefixo `[security]`, sem PII) — existe agora um formato a padronizar em vez de um campo vazio. E o "log estruturado e alerta sobre os bloqueios" está explicitamente **fora do corte** de `api-hardening`, apontando para cá. |
| 12 | [`data-rights-lgpd`](data-rights-lgpd.md) | Obrigação legal com prazo. Depende da área de conta existir; fica mais cara a cada coleção nova. |
| 13 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel estão literalmente vazias — é a primeira tela de todo fork. |
| 14 | [`e2e-testing`](e2e-testing.md) | 🔒 **Segue bloqueada, mas por uma razão só agora.** `ci-pipeline` fechou; o gargalo restante é `firebase-emulator-seed` (#3). Ver [Dependências](#dependências-e-bloqueios). |
| 15 | [`account-security-mfa`](account-security-mfa.md) | Prevalência baixa (MFA 3/10, sessões 1/10). Valor médio, mas fecha a superfície de autenticação. **Ganhou um vizinho:** o 🔴 de revogação de sessão (abaixo) segue de pé e é o mesmo território. |

### O que **não** foi escolhido para #1, e por quê

- **`firebase-emulator-seed`** foi o concorrente real, e perdeu por pouco: destrava **1** spec
  (`e2e-testing`, esforço G, valor médio) contra as **5** de `transactional-emails`. Seu valor é real e
  crescente, mas é infraestrutura de teste — o retorno é diferido. Ficou em #3, acima de `cursor-pagination`.
- **`billing-subscription`** tem o maior valor bruto do backlog (monetização, 9/10), e mesmo assim não vai
  ao topo: arrasta o 🔴 do `packages/payments/ai.ts` e o webhook que é casca, e a doc que mente sobre ela
  precisa ser corrigida antes — três pendências que não são a spec.
- **`cookie-consent`** é a única com cara de obrigação legal imediata (GA sem consentimento **hoje**), mas
  destrava zero specs e a exposição real de um boilerplate sem usuários é baixa. Subiu implicitamente ao
  ganhar o gancho da CSP, não desceu.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-02 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | 🔒 **bloqueada — e agora por uma dependência só. Mudança real de estado nesta rodada.** `ci-pipeline` **fechou** (arquivada pela PR #6, com o item da branch protection em aberto), então das duas dependências **resta uma**: `firebase-emulator-seed`, `proposed` e intocada — medido hoje, `firebase.json` declara apenas `firestore.rules` e `firestore.indexes.json`, **sem bloco `emulators`**. Sem ela os fluxos E2E escreveriam num Firebase real, disputando dados entre execuções. **Promover `firebase-emulator-seed` é o que move esta spec**; o status do CI deixou de ser limitante. Segundo laço, inalterado: o item 2 do corte de `e2e-testing` (`e2e-testing.md:70-71`) diz "bloqueiam o merge quando quebram" e herda **a mesma** pendência de branch protection que `ci-pipeline` deixou em aberto — ligar a proteção uma vez resolve para as duas, e agora é a única forma de fechar aquele item órfão. |
| [`auth-recovery-verification`](auth-recovery-verification.md) · [`teams-organizations`](teams-organizations.md) | `transactional-emails` | 🔒 bloqueada — é o que põe `transactional-emails` em **#1**. A cadeia continua: `auth-recovery-verification` destrava `account-settings`, que destrava `account-security-mfa` e `data-rights-lgpd`. |
| [`account-settings`](account-settings.md) | `auth-recovery-verification`, `file-upload-storage` | 🔒 bloqueada — nenhuma das duas entregue |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | 🔒 bloqueadas em cadeia (2 níveis abaixo de `transactional-emails`) |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) · [`firebase-emulator-seed`](firebase-emulator-seed.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |

**Nenhuma spec `approved` está bloqueada** — porque não há nenhuma `approved`. As 15 `proposed` que
lideram a fila (`transactional-emails`, `firebase-emulator-seed`, `cursor-pagination`) têm `depends_on`
satisfeito ou vazio e podem ir ao `/analyze` no momento em que você aprová-las.

## Fora da fila ativa

Specs que não entram na ordem acima. Ficam em `specs/` como memória institucional — é o que impede o
`/spec` de repropor a mesma coisa na rodada seguinte.

| id | status | motivo |
|----|--------|--------|
| [`teams-organizations`](teams-organizations.md) | `deferred` (2026-08-22) | Esforço G e nenhum fork pediu escopo por organização. **A implementação foi adiada; a decisão, não** — ver a seção abaixo e o motivo registrado na spec. Reabrir exige argumento novo, tipicamente o primeiro fork B2B real. |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | 🔒 `account-settings` |
| [`account-settings`](account-settings.md) | Área de conta e preferências do usuário | produto | alto | M | `proposed` | 🔒 `auth-recovery-verification`, `file-upload-storage` |
| [`api-hardening`](api-hardening.md) | Endurecimento da borda da API: headers/CSP, rate limit e CORS | confianca | alto | M | **`in-progress`** | — |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` (entregue) |
| [`auth-recovery-verification`](auth-recovery-verification.md) | Recuperação de senha e verificação de e-mail | produto | alto | M | `proposed` | 🔒 `transactional-emails` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`cookie-consent`](cookie-consent.md) | Consentimento de cookies e Consent Mode | confianca | alto | M | `proposed` | — |
| [`cursor-pagination`](cursor-pagination.md) | Paginação por cursor no BaseRepository e no SDK | dx | alto | M | `proposed` | ✅ `firestore-admin-access` (entregue) |
| [`dashboard-home`](dashboard-home.md) | Home do painel com widgets | produto | médio | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | 🔒 `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | ✅ `ci-pipeline` (entregue) · 🔒 `firebase-emulator-seed` |
| [`file-upload-storage`](file-upload-storage.md) | Upload de arquivos e storage | produto | alto | M | `proposed` | — |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | Emulador do Firebase, seed e primeiro admin | dx | alto | M | `proposed` | ✅ `firestore-admin-access` (entregue) |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `proposed` | — |
| [`onboarding-flow`](onboarding-flow.md) | Onboarding pós-cadastro | produto | alto | M | `proposed` | — |
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | 🔒 `transactional-emails` |
| [`transactional-emails`](transactional-emails.md) | E-mails transacionais traduzidos | produto | alto | M | `proposed` | — |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementaram. Mantidas aqui para que o índice
mostre entregue e pendente lado a lado.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| `firestore-admin-access` | 2026-08-31 | [`docs/features/firestore-admin-access/spec.md`](../docs/features/firestore-admin-access/spec.md) |
| `ci-pipeline` | 2026-09-01 | [`docs/features/ci-pipeline/spec.md`](../docs/features/ci-pipeline/spec.md) — ⚠️ **fechada com 1 item do corte em aberto**, ver abaixo |

> ⚠️ **`ci-pipeline` foi fechada por decisão do usuário com o corte em 3 de 5 itens implementados e 2
> parciais.** A recomendação da auditoria era ligar a branch protection antes de fechar; a decisão foi
> fechar mantendo o texto do item 2 (*"com falha bloqueando o merge"*) como está. Portanto, aqui `done`
> significa **"o pipeline da feature terminou e saiu do backlog"**, não "os 5 itens foram entregues".
>
> **Pendência que sobrevive ao arquivamento — sem dono:** `main` **não tem branch protection**
> (`gh api …/branches/main/protection` → **404**, medido em 2026-09-01), então **o CI sinaliza e não
> bloqueia**: uma PR vermelha pode ser mergeada, e a **PR #5 foi mergeada sem gate**. Ligar exigindo o check
> `verify` (`docs/SETUP.md:122-133`) custa minutos e já está destravado. `e2e-testing` herda a mesma
> pendência no seu item 2 — ligar uma vez resolve as duas.
>
> Como a spec saiu de `specs/`, **nenhum `/spec --sync` futuro vai reconciliá-la contra o código**. Este
> parágrafo e o "Estado da entrega" da spec arquivada são o único registro vivo dessa lacuna.

**Evidência dos 5 itens do corte de MVP**, conferida no código em 2026-08-31 (não no `status` gravado):

| item do corte | evidência |
|---------------|-----------|
| Identidade de serviço no acesso ao Firestore | `apps/api/(shared)/infra/database.ts:1-5` (`getFirestoreAdmin()`); `base.repository.ts:3` tipa contra `firebase-admin/firestore`; **zero** import `firebase/*` restante na `apps/api`; `firebase` saiu do `package.json` |
| CRUD de referência e usuários intactos, suíte verde | 105 testes verdes em `apps/api` (14 arquivos) na época; **hoje 152 em 19 arquivos**, reconferidos em 2026-09-02 |
| Credenciais fora do código, env tipado, falha cedo | `apps/api/env.ts:12-16` (3 vars obrigatórias) · `packages/auth/keys.ts:18-32` (rejeita conjunto parcial) · `apps/api/instrumentation.ts:29-30` (falha de boot); nenhum `apiKey` hardcoded na `apps/api` |
| `deny-all` publicável sem quebrar a aplicação | `firestore.rules:32-34` publicado; leitura REST direta com a chave pública → **403** (era 200 com 1223 bytes em 2026-08-30); runbook em `docs/SETUP.md` |
| Índices versionados | `firestore.indexes.json:2-11` (índice de `findByReferenceId`) + `.firebaserc` versionado |

**Nota de anchor (2026-09-02):** a linha do "falha cedo" acima apontava para `apps/api/instrumentation.ts:8-15`.
O arquivo cresceu com o gate de `CORS_ORIGIN` de `api-hardening` e a resolução do Firestore desceu para
`:29-30`. Corrigido — é o tipo de apodrecimento de referência que a auditoria existe para pegar.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — **não
constam aqui**: o `spec: -` no `STATE.md` das duas está correto, não é vínculo faltando. `ci-pipeline`
tem `spec: ci-pipeline` no `STATE.md` e a spec **arquivada ao lado dele** — vínculo completo nos dois
sentidos, que é o estado correto de uma spec entregue. `api-hardening` tem `spec: api-hardening` no
`STATE.md` e a spec **ainda viva em `specs/`** — o estado correto de uma spec `in-progress`.
*(`docs/features/` tem 5 pastas e **2** `spec.md` arquivados.)*

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.
A primeira linha é desta rodada; as demais são de rodadas anteriores, preservadas como memória.

| id | o que a spec afirmava | o que o código mostra | ação |
|----|----------------------|------------------------|------|
| [`api-hardening`](api-hardening.md) **(nova, 2026-09-02)** | `:99` — a `apps/web` "é a mais sensível a CSP por causa de scripts de marketing/analytics" | **É o contrário.** O `AnalyticsProvider` tem **um único** consumidor no repositório: `apps/app/app/layout.tsx:3,39`. A `apps/web` não o monta e não carrega script de terceiro nenhum — quem tem analytics é a `apps/app`, e é lá que a CSP precisou nomear `googletagmanager`, `google-analytics` e `region1.google-analytics` (`apps/app/proxy.ts:17-22`) | **texto corrigido na spec** (ela **fica** em `specs/`, então corrigi em vez de virar nota de arquivamento). **A spec estava errada; a implementação não desviou.** Não muda o corte — e a conclusão prática sobreviveu invertida: a landing entrou em Report-Only não por ter scripts, mas por ser onde um fork **vai** bolar tag de marketing |
| [`ci-pipeline`](../docs/features/ci-pipeline/spec.md) | "não há `vercel.json`" (correção registrada em `:29-35`) | **Existe nos três apps**: `apps/api/vercel.json`, `apps/app/vercel.json`, `apps/web/vercel.json`, os três com `ignoreCommand: node scripts/skip-ci.js` (`apps/web/scripts/skip-ci.js:5-8` pula o build em commit com `[skip ci]`); o da api tem ainda um `crons` para `/cron/keep-alive`. `.husky/` de fato não existe | texto corrigido. **Não muda o corte** — `vercel.json` governa deploy, não verificação. Vale como aviso para a prática 14 (preview deploy por PR), hoje fora do corte: o `ignoreCommand` já existe e terá de ser considerado |
| [`ci-pipeline`](../docs/features/ci-pipeline/spec.md) | `:44` — suíte de **23 arquivos** Vitest | 44 arquivos / **331 testes** em 7 tasks na 3ª rodada; **54 arquivos / 421 testes em 8 tasks** hoje, depois de `api-hardening` | anotado como número histórico da descoberta, preservando a baseline que motivou a spec. *(A referência dizia `:37`; corrigida para `:44` na 3ª rodada — o anchor estava 7 linhas acima do texto.)* |
| [`e2e-testing`](e2e-testing.md) | 23 arquivos, três configs, `apps/web` **sem script de teste** | 8 tasks / 421 testes; `apps/web` na suíte com 22 testes | texto corrigido. **O argumento da spec não muda** — a lacuna nunca foi o número de testes unitários, e sim que nada exercita um fluxo de ponta a ponta. Acrescentado que nenhum componente da landing é renderizado por teste |
| [`billing-subscription`](billing-subscription.md) | `packages/payments/index.ts:5` — cliente `stripe` em escopo de módulo; refs do webhook em `:36`/`:50`/`:57`/`:61` | `getStripe()` em `:14-24`, devolvendo `null` sem chave; webhook em `:27`/`:43`/`:50`/`:54` | refs corrigidas + **consequência nova para a spec**: toda rota de pagamento precisa tratar o `null` |
| [`observability-logging`](observability-logging.md) | `packages/analytics/server.ts` está quebrado; `instrumentation-client.ts:1` é só um comentário | os **dois arquivos foram apagados** | achado marcado como resolvido e **um item do corte de MVP marcado como entregue por tabela** ("o código morto de analytics de servidor é removido") |
| [`api-hardening`](api-hardening.md) | "enquanto `firestore-admin-access` não fechar, endurecer a borda é trancar a porta de uma casa com a parede aberta" | `firestore-admin-access` fechou em 2026-08-31 | risco de ordem marcado como resolvido; acrescentado que o gate automático agora protege contra regressão silenciosa de CSP/CORS. Ref de `packages/payments/index.ts` atualizada |

A deriva nova foi detectada pelo `/analyze`, que corretamente **não editou a spec** (editar spec é do
`/spec`) e a registrou em `docs/features/api-hardening/STATE.md` para esta auditoria — o handoff funcionou
como projetado.

**Nenhuma regressão detectada.** A capacidade de `firestore-admin-access` foi reconferida:
`firestore.rules` intacto, zero import `firebase/*` na `apps/api`, `getFirestoreAdmin()` ainda o único
caminho ao banco.

**Deriva de rodadas anteriores, verificada e mantida:** o predicado de posse
`row.userId !== ctx.subjectProfile.id` continua repetido **3 vezes no mesmo arquivo**
(`apps/api/app/(routes)/entities/[id]/route.ts:16,32,65`).

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação. A pesquisa é
categórica: retrofitar escopo por organização é **reescrita, não refactor** (6/10 de prevalência, esforço
G, "a decisão mais cara de postergar"). A evidência local confirma — o predicado de posse
`row.userId !== subjectProfile.id` já aparece **3 vezes em um único arquivo**, para **um** recurso.

**Decidido em 2026-08-22:** a spec foi para `deferred` — adiar a implementação, **não** a decisão. O que
torna o adiamento honesto são duas contrapartidas de esforço P, que **não** dependem desta spec e valem
como tarefa direta no `/analyze`:

1. escrever em `docs/ARCHITECTURE.md` se este core é **B2B ou B2C por padrão** — hoje a resposta está
   implícita no código e ninguém a declarou;
2. concentrar o predicado de posse num ponto único de escopo, tirando-o dos handlers.

Sem as duas, adiar é só acumular juros. **Nenhuma das duas foi feita até 2026-09-02** — os juros seguem
correndo, agora há onze dias.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados durante a descoberta e durante o pipeline. **Não são
funcionalidades** — são correções pontuais, algumas de minutos. Registrados aqui para não se perderem;
viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-02.** **3 achados removidos** por resolução confirmada no código, todos escopo de
> `api-hardening`: o 🔴 do `CORS_ORIGIN` fora do env tipado com coringa por padrão, o 🟡 do `isRateLimit()`
> tratado sem regra registrada, e a parte "a `apps/api` sequer declara `@repo/security`" (que era um
> apêndice do segundo). **1 anchor corrigido:** o achado do `turbo run --continue` apontava para
> `.github/workflows/ci.yml:33`; a PR #7 mexeu no arquivo e a linha do gate virou **`:39`**. **5 achados
> novos**, vindos do `/test` e desta auditoria — os três primeiros pedidos explicitamente pelo `/spec
> --sync`, os dois últimos medidos aqui. Os demais foram reconferidos e **seguem de pé**, com destaque
> para os que este pipeline **não** tocou: `packages/auth/package.json` exportando `./client-ui`
> inexistente e o `chart.tsx` morto.
>
> **Reconferência explícita do que NÃO foi tocado** (pedida nesta rodada): `packages/auth/package.json:12`
> declara `"./client-ui": "./client-ui.tsx"` e o arquivo **continua não existindo** no disco — export
> quebrado, terceira auditoria consecutiva. `packages/design-system/components/ui/chart.tsx` existe
> (11 KB) e um `grep` por `ui/chart` em `apps` + `packages` retorna **zero** importadores: `recharts`
> (`packages/design-system/package.json:31`) segue pesando no bundle sem nenhum uso. `packages/auth`
> segue em `next: 15.1.3` (`:24`) contra `16.0.0` dos três apps. Nenhum dos três é escopo de
> `api-hardening`; todos seguem valendo.

Os primeiros são de **segurança** e foram confirmados diretamente no código — valem revisão antes de
qualquer spec.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Revogar sessão não derruba o ID token.** `verifyIdToken(token)` é chamado **sem o argumento de revogação** (`packages/auth/server.ts:123`), e `resolve-api-actor.ts:24` tenta o bearer ID token **antes** do cookie — que, esse sim, usa `verifySessionCookie(..., true)` (`:193`) | `packages/auth/server.ts` · `apps/api/(shared)/lib/resolve-api-actor.ts` | Depois de revogar as sessões, um ID token já emitido continua passando no guard da API até expirar (1 hora). A base está metade correta — e é a metade errada que vem primeiro. **Não foi escopo de `api-hardening`** (que endureceu a borda HTTP, não a verificação de credencial) e segue intacto. |
| 🔴 **Perfil duplicado a cada login com Google.** `ensureDefaultUserProfile` é chamado **incondicionalmente** (`apps/api/app/(routes)/auth/sign-in/google/route.ts:19`) e o helper (`(shared)/lib/user-merge.ts:47-55`) faz `userRepository.create()` direto, **sem procurar perfil existente** — ao contrário de `getMergedUserByUid:19-23` e `getMergedUserFromIdToken:38-42`, que só criam quando `findByReferenceId` volta nulo | `apps/api/app/(routes)/auth/sign-in/google/route.ts` · `apps/api/(shared)/lib/user-merge.ts` | Cada login Google grava um documento novo na coleção `user` para o mesmo UID. Correção provável de uma linha: chamar `getMergedUserByUid`, que já é chamado logo em seguida (`:20`) e já trata o caso. **Agrava com `api-hardening`:** `/auth/sign-in/google` agora é rota com rate limit, ou seja é reconhecidamente pública e quente. |
| 🔴 **`packages/payments/ai.ts:4-5` tem o defeito gêmeo do que o `ci-pipeline` corrigiu no `index.ts`**: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts` | O mesmo padrão no `index.ts` deixava `api#build` **vermelho** (`Neither apiKey nor config.authenticator provided`) e foi corrigido com `getStripe()` (`index.ts:14-24`). O `ai.ts` não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` é justamente o que faria alguém importar. Correção de minutos, com o padrão já pronto ao lado. |
| ⚠️ **NOVO — o gate de produção do `CORS_ORIGIN` não derruba o processo.** Com `NODE_ENV=production` e a variável ausente, `register()` lança (`apps/api/instrumentation.ts:17-21`), o Next imprime `Failed to prepare server` e **fica no ar respondendo 500 a tudo** | `apps/api/instrumentation.ts:17-21` | O efeito pretendido é atingido — nada é servido —, mas uma plataforma que só verifica se a porta responde veria o container **saudável**. Um deploy quebrado passaria por deploy bem-sucedido. Ou o health check passa a distinguir 5xx, ou o gate chama `process.exit(1)`. Medido num processo real pelo `/test`. É a **única ressalva** sobre o item 2 do corte de `api-hardening`, e não impede o item: a origem coringa realmente morreu. |
| ⚪ **NOVO — um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `apps/app/…/(pages)/entities/(hooks)/useListEntities.tsx:11,16` · `…/(pages)/(home)/EntitiesListClient.tsx:145-148` | **Pré-existente, não causado por `api-hardening`** — mas a entrega o tornou alcançável: agora existe um 429 de verdade para cair nesse caminho. O hook **devolve** `error` (`:16`); o componente só passa `locale={{ emptyText: entitiesList.empty }}` à `Table` e **nunca lê** `error`. Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele. Vale para todo `useList*` no mesmo padrão. |
| 🟡 **NOVO — `skipValidation: true` faz o t3-env descartar os `extends`, então o bloco `client` da `apps/web` parece validar e não valida.** Causa raiz **confirmada no código do pacote instalado**: `node_modules/@t3-oss/env-core/dist/src-Bb3GbGAa.js:36-37` — `const skip = !!opts.skipValidation; if (skip) return runtimeEnv;` devolve o `runtimeEnv` local **antes** de montar o schema e antes de mesclar os `extends` | `apps/web/env.ts:23` (`skipValidation: true`) · `apps/web/env.ts:12-16` (bloco `client` novo) | É a causa raiz de **3 sintomas**, dos quais só 1 foi contornado: (a) a CSP não enxergava a URL da API — contornado declarando as vars **localmente**, que é por que a `apps/web` funciona; (b) o CTA "Ir para o painel" da landing **já cai no fallback hoje**, porque `NEXT_PUBLIC_APP_URL` vem de `@repo/next-config/keys` via `extends` e chega `undefined`; (c) `secure()` na `apps/web` lê `ARCJET_KEY` pelo mesmo caminho. Pior que o bug: o bloco `client` acrescentado tem forma de validação e **não valida nada** — `z.string().optional()` nunca roda. **Contornado, não corrigido**, por decisão de escopo do `/review` (D-C): remover o `skipValidation` muda header, CTA e pricing da landing e exige passe visual próprio. Tarefa própria, esforço P–M. |
| 🟡 **NOVO — `FormattedError.retryAfterSeconds` não tem consumidor.** O campo é computado (`packages/shared/utils/helpers/formattedError.ts:20,86-101`) e um `grep` em `apps` + `packages` não encontra **nenhuma** leitura fora dos testes | `packages/shared/utils/helpers/formattedError.ts:13,20` | Toda a cadeia para levar a espera até a tela está pronta e conectada — `Retry-After` no 429 (`apps/api/proxy.ts:84`), `Access-Control-Expose-Headers` para o script poder lê-lo (`cors.ts:59`), o parse do delta-seconds — e **para no último metro**: o toast mostra "aguarde um instante", sem o número que o servidor mandou. Não é lacuna do corte de MVP (o sinal de pronto pede 429 com indicação de espera e mensagem traduzida, e ambos existem), mas é infraestrutura entregue sem uso, e a regra da `/spec-audit` é que código morto conta como ausente. Correção de minutos na camada de toast. |
| 🟡 **NOVO — `isRateLimitEnforced()` é export morto.** `packages/security/index.ts:32` exporta o predicado e **ninguém** o chama fora dos testes | `packages/security/index.ts:32` | O papel que ele existia para cumprir — deixar claro que o limite está desligado — acabou coberto pelo aviso de boot (`apps/api/instrumentation.ts:23-27`), que lê `process.env.ARCJET_KEY` direto em vez de usar o predicado. Duas fontes de verdade para o mesmo fato, e a que tem nome não é a usada. Ou o `instrumentation.ts` passa a chamá-lo, ou ele sai. |
| 🔴 **`apps/app/app/layout.tsx:3` importa `@repo/analytics` sem `apps/app/package.json` declarar** a dependência — funciona por hoisting do pnpm | `apps/app/app/layout.tsx:3` · `apps/app/package.json` | Reconferido nesta auditoria: o import está lá, o `package.json` não tem a entrada. Além do risco de resolução, **o turbo não invalida `app#*` quando `@repo/analytics` muda** — cache mentindo num gate que agora roda em toda PR. Mesma classe do achado que o `ci-pipeline` levantou sobre a `apps/web`. |
| 🟡 **Webhook da Stripe é casca.** Roteia só `checkout.session.completed` (`:50`) e `subscription_schedule.canceled` (`:54`) — a doc afirma `customer.subscription.updated\|deleted` — e os dois handlers (`:8`, `:18`) são stubs `// TODO` que checam `data.customer` e retornam sem persistir nada | `apps/api/app/(routes)/webhooks/payments/route.ts` | A assinatura **é** validada (`:43`); nada é persistido. Escopo de `billing-subscription`. A rota tem 11 testes. |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `apps/api/env.ts:30` usa `skipValidation: process.env.NODE_ENV === "development"`; nesse modo o t3-env devolve **só o `runtimeEnv` local** e descarta as chaves vindas de `extends: [auth(), core(), email(), payments()]` (`:9`). `env.STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` mesmo com a variável exportada | `apps/api/env.ts:9,30` · `apps/api/app/(routes)/webhooks/payments/route.ts:30` | Mesma causa raiz do achado novo da `apps/web`, agora com a linha do t3-env identificada (`src-Bb3GbGAa.js:36-37`) — os dois deveriam ser corrigidos juntos. O guard `if (!(stripe && env.STRIPE_WEBHOOK_SECRET))` cai sempre no ramo `"Not configured"` em dev, então `pnpm --filter api dev:with-stripe` **não pode funcionar**. Cruza direto com `billing-subscription`. |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. Escopo do primeiro: o helper hoje só grava `x-locale`, **não** o cookie de sessão. Sobre o segundo: `api-hardening` adotou **a mesma** decisão na borda, mas com o porquê escrito e um limite explícito — `apps/api/(shared)/lib/cors.ts:42-52` deixa passar requisição sem `Origin` porque "não veio de uma página de browser, e o CORS não tem nada a dizer sobre isso; a autorização continua rodando". O padrão agora tem precedente documentado; o de `session.ts` continua sem. |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com `expires`, mas na requisição seguinte os proxies fazem `cookieStore.set("x-locale", …)` **sem `maxAge`**, rebaixando-o a cookie de sessão | `apps/web/proxy.ts` · `apps/app/proxy.ts` · `packages/shared/utils/helpers/cookies.ts` | Confirmado no browser durante o `/develop` (`expires = -1`). O idioma escolhido **não sobrevive ao fechamento do navegador**. Bug de produto silencioso: ninguém reclama, todo mundo reescolhe o idioma. **Atenção ao corrigir:** os dois `proxy.ts` foram reestruturados por `api-hardening` (a lógica virou `route()`, envolvida por `applySecurityHeaders`) — as linhas mudaram, o defeito não. |
| **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`.** `:102-117` faz read-modify-write: lê via `findById()` (que passa pelo mapper e devolve `createdAt` **serializado como string ISO**), faz spread sobre o payload e grava tudo de volta com `docRef.update()`. Depois do primeiro `PUT`, o campo deixa de ser `Timestamp` no Firestore e vira `String` | `apps/api/(shared)/repositories/base.repository.ts:102-117` | ⚠️ **Preservado de propósito** na entrega de `firestore-admin-access` (decisão do usuário: migração *contract-preserving*). **Dívida herdada, documentada e coberta por teste.** Consequências: consulta por range/`orderBy` em `createdAt` mistura tipos e o índice não ordena como se espera; e o `update()` custa uma leitura extra por escrita. Cruza diretamente com `cursor-pagination` (#4), que precisa de `orderBy` estável. |
| **`userRepository.list()` mente no tipo de retorno**: declara `Promise<UserDTO[]>` (`user.repository.ts:32`) mas devolve o merge com o Firebase Auth, que é `UserWithAuthDTO` — o cast acontece dentro de `mergeWithAuthUser` (`:56`, `as UserDTO`) | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | O SDK **já declara o tipo certo** (`packages/sdk/src/actions/user/user/action.ts:21` → `UserWithAuthDTO[]`), então a mentira está só no repositório — e obrigou o teste a fazer cast para ler o campo. Cast em teste para contornar tipo errado de produção é sintoma, não solução. |
| `delete()` herdado por todo repositório é **soft delete**: grava `deletedAt` e nada mais | `apps/api/(shared)/repositories/base.repository.ts:128` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. |
| ⚠️ Documentação descreve como **implementado** um fluxo de pagamentos que **não existe**: rotas `/payments/*`, `UserDTO.subscription`, `userRepository.updateSubscriptionByReferenceId`, `apiClient.payments.*`, tela "Minha assinatura" e eventos de webhook que o código não roteia | `docs/PAYMENTS.md:5-12` (`docs/SECURITY.md` diz o **oposto**, e está certo) | É a pior classe de erro de documentação: mente com aparência de autoridade. Dos **6 itens** da seção "Estado atual (implementado)", só o **primeiro** é verdadeiro. `apps/api/app/(routes)/` não tem nenhuma rota sob `payments/`; o SDK registra `application`, `auth`, `entity`, `user` e nada mais; `UserDTO` não tem `subscription`. Corrigir a doc **independe** de implementar a spec. *(Contraste útil: `api-hardening` atualizou `docs/SECURITY.md` e `docs/SETUP.md` **na mesma entrega** que mudou o código — é o padrão que o `PAYMENTS.md` viola.)* |
| `package.json` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:12` | Export quebrado. **Reconferido em 2026-09-02: o arquivo continua não existindo.** Terceira auditoria consecutiva. Não foi tocado por `api-hardening`. |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps | `packages/auth/package.json:24` | Origem do aviso `deprecated next@15.5.2` no `pnpm install`. Um pacote de **autenticação** resolvendo uma major diferente do runtime que o consome é risco desproporcional ao esforço de alinhar. Reconferido em 2026-09-02: segue `15.1.3`. |
| `chart.tsx` é código morto — `recharts` (`packages/design-system/package.json:31`) pesa no bundle sem nenhum uso real | `packages/design-system/components/ui/chart.tsx` | Custo sem contrapartida. **Reconferido em 2026-09-02:** o arquivo existe (11 KB) e `grep ui/chart` em `apps` + `packages` retorna **zero** importadores. Não foi tocado por `api-hardening`. |
| `photo` é `z.string().trim().max(PHOTO_URL_MAX)` — qualquer texto passa, não é URL validada, nos **dois** schemas (create `:23` e update `:34`). O front **valida** como URL (`entityFormSchema.ts:48-59`), a API não | `apps/api/(shared)/validation/entity.schema.ts:23,34` | Bug latente, não flexibilidade — e validação que só existe no navegador é exatamente o anti-padrão que a regra de ouro 4 proíbe. **Ganhou uma consequência nova:** com `img-src` agora sendo uma allowlist explícita, uma `photo` apontando para host arbitrário é bloqueada pela CSP em runtime — a falha saiu do banco e chegou à tela. |
| 🟡 **Strings de UI soltas, fora do dicionário** — `"Switch language"` (`sr-only`) nos **dois** language switchers e `"Início"` + `href="/painel"` (rota em português, hardcoded) no breadcrumb | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/app/[locale]/components/header/language-switcher.tsx:68` · `apps/app/shared/components/ui/PageBreadcrumb.tsx:28,30` | Viola a regra de ouro 2. Agrava o caso do `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, então fica sem tradução para quem mais depende dele. |
| String `"Home"` literal fora do dicionário nas duas home pages | `apps/app/…/(common)/(pages)/page.tsx:7` · `apps/app/…/(admin)/admin/(pages)/page.tsx:7` | Viola a regra de ouro 2. |
| `useHealthCheck` usa `useQuery` direto (`:29`), contra a convenção do escopo | `apps/app/shared/hooks/useHealthCheck.ts` | Viola `apps/app/CLAUDE.md`. |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel: `:24-38` agenda o avanço automático e **não devolve função de limpeza**, com `[api, current]` nas dependências — um timer é agendado a cada avanço e nenhum é cancelado na desmontagem | `apps/web/app/[locale]/(home)/components/cases-client.tsx:29` | Timer disparando depois da desmontagem chama `setCurrent` em componente morto. É a home da landing: o caminho mais percorrido do repo. |
| 🟡 **`hydration mismatch` num `id` gerado pelo Radix + aviso "Select is changing from uncontrolled to controlled"** | `apps/app/shared/components/ui/PanelNavbarControls.tsx` · `apps/app/shared/components/ui/Sidebar.tsx:96-154` | **Escopo ampliado em 2026-09-01** (o registro anterior citava só o `DropdownMenuTrigger`): o `Collapsible` do `GlobalSidebar` produz o mesmo mismatch, e o `GlobalSidebar` é montado pelos **dois** painéis (`(common)/sidebar.tsx:13` e `(admin)/admin/sidebar.tsx:13`). Ou seja, o aviso aparece em **toda carga do painel**, sem interação — não num canto do menu. Contradiz a regra do escopo de resolver no servidor todo estado de UI persistido no browser. *(O `Sidebar.tsx` foi tocado por `api-hardening`, mas só no avatar de exemplo — o mismatch não foi endereçado.)* |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default), então uma PR com dois tipos de defeito mostra só o primeiro | `.github/workflows/ci.yml:39` | **Anchor corrigido nesta auditoria** (era `:33`; a PR #7 mexeu no arquivo e empurrou o gate 6 linhas). Medido no `/test` do `ci-pipeline`: com `@repo/internationalization#test` vermelho, as tasks de teste de `app`, `web` e `api` nem chegam a rodar (15 de 17 no cenário). É o comportamento correto, mas quem ler o log da PR verá "3 suítes não rodaram" e pode se confundir. `--continue` resolveria, ao custo de fazer o comando do CI divergir do local — daí ser achado, e não correção óbvia. **Agora dá para observar de verdade**: o workflow roda em toda PR. |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Reconferido: `domains: ["lh3.googleusercontent.com", "www.google.com"]`, e `remotePatterns` só declara `lh3`. Origem sem uso numa lista de hosts confiáveis de imagem é superfície gratuita — e agora **divergente** da CSP, que nomeia só `lh3.googleusercontent.com` (`apps/app/proxy.ts:19,39`). Duas allowlists de imagem que discordam. |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor nenhum e não seguem o contrato `{ error: { code } }`** — devolvem string crua (`sign-in/route.ts:12`, `sign-up/route.ts:26,40`); a primeira responde **500** para credencial inválida | `apps/api/app/(routes)/auth/sign-in/route.ts` · `.../sign-up/route.ts` | Viola a regra de ouro 3. Confirmado no `/develop`: as 20 primeiras requisições do teste de limite voltaram **500**. `api-hardening` acabou de pôr rate limit nessas duas rotas — protegeu endpoints que **ninguém chama e que respondem errado**. A decisão certa provavelmente é removê-las, não consertá-las; enquanto existem, são POST público sem guard queimando cota da Identity Toolkit. |
| 🟡 **Casamento exato de rota no rate limit deixa variações de fora.** `RATE_LIMITED_PATHS.includes(pathname)` (`apps/api/proxy.ts:38`) não pega `/auth/sign-in/` (barra final) nem futuras `/auth/sign-in/*` | `apps/api/proxy.ts:31-39` | Decisão consciente do `/review` (D-E): `startsWith` limitaria `/auth/sign-in/google` duas vezes. Há teste fixando o comportamento. Revisitar quando entrar a 4ª rota pública. |

### Higiene pendente dos pipelines

**Branches mergeadas ainda vivas (registrado na 3ª rodada, reconferido em 2026-09-02).** As PRs são
mergeadas por squash e as branches ficam. `ci/feat/github-actions-pipeline` (PR #5) segue de pé, e a ela
somaram-se `ci/chore/bump-actions-to-node24` (PR #7) e `specs/docs/close-ci-pipeline` (PR #6) — as três
mergeadas, as três ainda no remoto. Destoa do padrão do próprio repo: as branches das PRs #1 e #4
aparecem como `: gone`. Some-se a isso a **`main` local desatualizada**: medida hoje em `5b56702`,
enquanto `origin/main` está em `44e3f23` — duas PRs à frente. **Nada foi apagado nem sincronizado nesta
auditoria** — é registro de limpeza pendente, para decisão de quem opera o repositório.

Não é achado de código, mas some do radar se não ficar escrito: o projeto Firebase de desenvolvimento
(`next-boilerplate-576d0`) acumulou **contas de QA** criadas pelas etapas de quatro pipelines —
`qa-admin@example.com`, `qa-common@example.com`, `qa-review-common@example.com` (de
`firestore-admin-access`), `qa-ci-admin@example.com`, `qa-review-ci@example.com`,
`qa-common-ci@example.com` (de `ci-pipeline`) e, de `api-hardening`, `qa-api-hardening@example.com` (do
`/develop`) + `review-api-hardening@example.com` (do `/review`). Sem PII real e sem senha gravada em
arquivo. A conta do `/test` (`qa-test-api-hardening@example.com`) **já foi apagada** pela própria etapa, e
os dados de teste do CRUD também. Limpar as demais (Firebase Console → Authentication + o doc `user` no
Firestore) ao fechar os pipelines.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético — não é diferencial de MVP. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. **Nota nova:** "rate limit por usuário/plano e cota de uso" é explicitamente "fora do corte" de `api-hardening`, e o ponto de extensão existe (`checkRateLimit` decide em vez de lançar) — o custo de plugar caiu, o valor não subiu. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. Reavaliar após `observability-logging`. |
| Firebase App Check | — | A outra metade do controle 16 da nota de conformidade, e **explicitamente fora do corte** de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. Reavaliar se aparecer abuso que o rate limit por IP não contenha. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Sessões e dispositivos gerenciáveis | 1/10 | Absorvido pelo corte de `account-security-mfa`. |
| Widget de feedback | 1/10 | Terceirizar é mais racional que manter no core. |
| Referral / afiliados | 0/10 | Nenhuma referência do painel entrega. A pesquisa classifica como discurso de blog; o mercado resolve com produto de terceiro. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estão no **"fora do corte" de `ci-pipeline`** de propósito: dependem de um CI verde e estável para não virarem ruído. **A condição chegou:** o CI está em `main` e verde em **5 execuções** — falta só a branch protection. **Argumento a favor de Renovate, agora com desfecho:** a 3ª rodada registrou que as três actions do `ci.yml` miravam Node 20 (removido em 2026-09-23) e que **nenhuma validação local pegou, nem o `act`** — só apareceu quando o workflow rodou na plataforma. A correção veio à mão, pela PR #7. Um bot teria aberto essa PR meses antes; `.github/workflows/*.yml` está no escopo do Renovate, e o agrupamento resolve o "40 PRs/semana" que a nota cita. Nota para a prática 14: os três `vercel.json` já trazem `ignoreCommand`, o que muda o desenho do preview por PR. |
| Remote Cache do Turbo | prática 1 | Fora do corte de `ci-pipeline` (decisão Q3): é a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição — e como opt-in por variável ausente, no padrão do `ARCJET_KEY` (que `api-hardening` acabou de reforçar como o padrão do repo). |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **8** configs de Vitest declara cobertura: não há número para discutir. *(Eram 7; `packages/security` acrescentou a oitava em `api-hardening`.)* Medir primeiro, gatear depois, e só em pastas críticas. Relatório por workspace **não soma** — exige consolidação na raiz. Cruza com `e2e-testing`, que traz a medição no corte. |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
</content>
