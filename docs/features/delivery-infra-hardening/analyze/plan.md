# Plano: core aprovado na parte 2 da entrega (infra e hardening)

- **Spec**: [`specs/delivery-infra-hardening.md`](../../../../specs/delivery-infra-hardening.md) (`status: approved`).
  Problema, evidência e corte são decisão de produto já tomada. Este plano responde ao *como*.
- **Escopo**: o corte inteiro da spec, sete itens, mais o Shield do Arcjet na API em `DRY_RUN`, que a spec
  recomenda nas próprias perguntas em aberto (ver Q4).
- **Modo**: rodada autônoma do `/cycle`. Nenhuma pergunta foi feita; as decisões estão em
  [Perguntas em aberto](#perguntas-em-aberto-decididas-por-padrão), cada uma com a alternativa descartada.
- **Medido em**: 2026-11-23, sobre `388a453`, só leitura. Os SHAs das actions e o checksum do Gitleaks foram
  lidos com `gh api` na mesma data.

---

## Etapa 1: análise

### 1. Contexto

A parte 2 da [etapa de entrega](../../../delivery/README.md),
[infra e hardening](../../../delivery/02-infra-hardening.md), tem 20 controles. Metade é console e fica com
o fork. A outra metade é repositório, e ali o core reprova hoje em pontos que todo fork herda:

| # | Item do corte | Item da parte 2 | Estado medido |
|---|---------------|-----------------|---------------|
| 1 | Varredura de segredo no CI + `.gitignore` | 2.2 | nenhum scanner no CI (`.github/workflows/ci.yml` tem `verify`, `changes`, `e2e`, `coverage`); `.gitignore:64,144-148` não cobre `.env.production`, `.env.development` nem JSON de service account (`git check-ignore` saiu 1 nos três) |
| 2 | Dependabot + `pnpm audit` no CI | 2.20 | sem `.github/dependabot.yml`; sem job de audit. `pnpm audit --prod --audit-level=high` sai **0**; `--audit-level=moderate` sai 1; sem `--prod` saem 12 críticas (dev) |
| 3 | Actions pinadas por SHA | 2.20 (cadeia de suprimento) | 6 actions por tag móvel, entre elas a de terceiro `pnpm/action-setup@v6` (`ci.yml:25,28,35,41,48,...`) |
| 4 | Bloqueio de bot da landing funcionando | 2.12 | `apps/web/env.ts:36` `skipValidation: true` faz o `createEnv` devolver o `runtimeEnv` antes de juntar o `extends`, então `env.ARCJET_KEY` é sempre `undefined` e `apps/web/proxy.ts:67` sai cedo |
| 5 | `Permissions-Policy` + cabeçalhos em `/api/auth/*` | 2.18 | nosecone `1.0.0-beta.13` não emite `Permissions-Policy` (nenhuma ocorrência em `nosecone/index.d.ts`); o matcher exclui `api` em `apps/app/proxy.ts:127` e `apps/web/proxy.ts:61` |
| 6 | Logo só `https:` + `remotePatterns` restrito | 2.19 | `packages/next-config/brand.ts:31` aceita `http:`; `apps/app/next.config.ts:19` usa `images.domains` (deprecado) com `www.google.com` sem uso; `:27` libera todo `storage.googleapis.com` |
| 7 | Guia das chaves do Firebase + correção da Resend | 2.3, 2.1 | `docs/FORKING.md` não manda restringir chave nenhuma; `:305` manda pôr a Resend na `web`, que não envia nada |

**Objetivo**: rodar a parte 2 contra o core termina sem 🔴 nos itens que dependem só do repositório, e cada
mudança de código tem um teste no nível mais barato que prova o comportamento.

**Fora de escopo** (da spec):

- App Check.
- CSP bloqueante na landing com destino de relatório (continua no item 10 do `PRE-PRODUCTION.md`).
- CodeQL (configuração de console).
- Ações no repositório de referência: rotação ou restrição da chave do alerta #1, proteção da `main`,
  Dependabot ligado. Estão em [§11](#11-pré-requisitos-manuais-de-infra).

Fora deste plano também:

- `apps/app/next.config.ts:18-30` sobrescreve `config.images` e perde o `formats: ["image/avif", "image/webp"]`
  de `packages/next-config/index.ts:6-8`. Corrigir muda o formato servido pelo otimizador (custo de CPU na
  Vercel), o que é decisão à parte. Vai como achado em [§13](#13-achados-para-o-spec---sync).
- A `web` continua estendendo `email()` mesmo sem enviar e-mail. Tirar mudaria o que o build valida; fica
  só a documentação corrigida.

**Corte de MVP**: os sete itens são independentes. Se o `/develop` travar em um, os outros entregam valor
sozinhos. Ordem de risco, do maior para o menor: 4 (liga o bloqueio de bot de verdade na landing), 5 (o
proxy passa a rodar nas rotas de sessão), 6, 1, 2, 3, 7.

**Apps impactados**

| Onde | O que muda |
|------|-----------|
| `.github/` | `workflows/ci.yml` (SHAs, jobs `secrets` e `audit`), `dependabot.yml` novo |
| raiz | `.gitignore` |
| `packages/security` | `Permissions-Policy` em `applySecurityHeaders`; `shield` em `DRY_RUN` nos dois orçamentos |
| `packages/next-config` | `brand.ts` aceita `http:` só em loopback |
| `apps/web` | `env.ts` sem `skipValidation`; `proxy.ts` com cabeçalhos em `/api/*` |
| `apps/app` | `proxy.ts` com cabeçalhos em `/api/*`; `next.config.ts` com `remotePatterns` restrito |
| `apps/api` | nenhum arquivo; herda o `Permissions-Policy` e o `shield` pelo `@repo/security` |
| `packages/sdk`, `packages/internationalization` | nenhum |
| docs | `FORKING.md`, `SETUP.md`, `SECURITY.md`, `PRE-PRODUCTION.md`, `SUBPROCESSORS.md`, `delivery/02-infra-hardening.md` |

**Área do painel, modo de produto, plano**: N/A. Nada depende de `subscription` × `simple` nem de assinatura.

### 1.1 Fontes

- Spec, lida inteira.
- [`docs/delivery/02-infra-hardening.md`](../../../delivery/02-infra-hardening.md): itens 2.2, 2.3, 2.7, 2.12,
  2.15, 2.18, 2.19, 2.20.
- [`.claude/cycle-policy.md`](../../../../.claude/cycle-policy.md): sem dependência nova, string vazia é ausência,
  modo degradado testado, mudanças mínimas.
- Código do `@t3-oss/env-core@0.13.8` em `node_modules/.pnpm/@t3-oss+env-core@0.13.8_*/.../dist/src-Bb3GbGAa.js`.
- Releases do Gitleaks (`gh api repos/gitleaks/gitleaks/releases/latest`): `v8.30.1`, publicada em 2026-03-21.
- Referência de opções do Dependabot
  (<https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference>,
  aberta em 2026-11-23): `groups` com `dependency-type`, `update-types` e `applies-to`; `directories` aceita
  glob; o cooldown padrão é de 3 dias e não vale para atualização de segurança.

**Referências não lidas**: nenhuma relevante.

### 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta muda.

### 3. Contrato `@repo/sdk`

N/A.

### 4. API

Nenhuma rota, guard, schema ou `error.code` novo. Duas mudanças chegam à API pelo pacote:

- `Permissions-Policy` em toda resposta, porque `apps/api/proxy.ts:137-139` já passa tudo por
  `applySecurityHeaders`.
- `shield({ mode: "DRY_RUN" })` nos dois orçamentos de `checkRateLimit` (`packages/security/index.ts:52-83`).
  Em `DRY_RUN` o Arcjet registra a decisão no painel e devolve `ALLOW`, então nenhuma resposta muda. Quando
  um fork trocar para `LIVE`, a recusa do shield cai no ramo `reason: "denied"` (`index.ts:120-124`) e o proxy
  responde `429 AUTH_RATE_LIMITED` (`apps/api/proxy.ts:210-221`). O código é genérico para "recusado" e já
  existe; não há código novo a traduzir.

### 5. Front-end

Nenhuma tela, rota de página, hook ou formulário novo. Muda o comportamento de borda:

- **Landing (`apps/web`)**: com `ARCJET_KEY` válida, um cliente identificado como bot automatizado recebe
  `403 {"error": "<mensagem>"}` do proxy (`apps/web/proxy.ts:81-84`). Buscadores, previews e monitores
  passam pela lista de permissão (`:75-77`). Sem a chave, nada muda (modo degradado).
- **`/api/auth/*` em `apps/app` e `apps/web`**: passam a sair com os mesmos cabeçalhos das páginas, sem
  redirecionamento de idioma, sem cookie `x-locale` e sem Arcjet.
- **Avatares e fotos do painel**: o otimizador do Next só serve `lh3.googleusercontent.com` e
  `storage.googleapis.com/<bucket do produto>/**`. Os dois usos com `next/image` otimizado
  (`UsersListClient.tsx:77`) seguem com o mesmo host de antes.

### 5.4 i18n e a11y

Nenhuma chave nova. A mensagem do 403 do proxy é a que `handleClientError` já produz hoje no `apps/app`; a
landing passa a exercer o mesmo caminho. Não há tela que mostre esse 403 (é resposta do proxy a um bot).

### 6. Autorização e segurança

- **Impersonação**: N/A. Nada aqui lê papel nem contexto de sessão.
- **Bloqueio de bot da landing**: passa a rodar de verdade. A chave é validada por `@repo/security/keys.ts:35-41`
  (vazia vira ausente; sem o prefixo `ajkey_` reprova o build, como já reprova hoje).
- **Permissions-Policy** desliga no navegador APIs que nenhum app usa. Medido com `grep` em `apps/` e
  `packages/`: zero ocorrências de `getUserMedia`, `navigator.geolocation`, `navigator.usb`,
  `PaymentRequest`, `loadStripe`, `PublicKeyCredential`. Valor proposto em [§10.5](#105-cabeçalhos).
- **Segredo no Git**: o job reprova PR com segredo no diff; o `.gitignore` reduz a chance de o arquivo entrar.
- **Cadeia de suprimento**: actions por SHA imutável; Gitleaks baixado com checksum SHA-256 fixado no
  workflow; Dependabot com cooldown padrão.

### 7. Testes (Vitest)

Todos no nível unitário. Nenhum exige emulador ou app de pé.

| # | Arquivo | Nível | O que prova | Falha sem a mudança? |
|---|---------|-------|-------------|----------------------|
| T1 | `apps/web/__tests__/webEnvArcjet.test.ts` (novo) | módulo real de env | `vi.stubEnv("ARCJET_KEY", "ajkey_test")` + `vi.resetModules()` + `import("@/env")` → `env.ARCJET_KEY === "ajkey_test"`; com `""` → `undefined` e o import não lança; com `" "` → `undefined`. Também confere que um `NEXT_PUBLIC_APP_URL=""` continua virando `undefined` | sim (hoje sai `undefined` com a chave) |
| T2 | `apps/web/__tests__/proxyBotProtection.test.ts` (novo) | proxy com **env real** (sem `vi.mock("@/env")`), `@repo/security.secure` mockado | com a chave: `secure` chamado uma vez com `["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW", "CATEGORY:MONITOR"]` e o request; `secure` rejeitando → status 403 com os cabeçalhos de segurança; sem a chave: `secure` não chamado e a página segue (modo degradado) | sim |
| T3 | `packages/security/__tests__/csp.test.ts` (ampliar) | função pura | `applySecurityHeaders` põe `permissions-policy` com o valor exato nas opções de browser e de API, e também com `reportOnly = true` | sim |
| T4 | `apps/web/__tests__/securityHeaders.test.ts` e `apps/app/__tests__/securityHeaders.test.ts` (ampliar) | proxy | `/pt-br` sai com `permissions-policy`; `POST /api/auth/session` sai com HSTS, `x-content-type-options`, `permissions-policy` e CSP, sem `location` e sem `set-cookie` de `x-locale`; `secure` não é chamado em `/api/*` | sim |
| T5 | `apps/web/__tests__/proxyLocale.test.ts` (ampliar o bloco `web proxy matcher`) e o equivalente do `apps/app` | regex do matcher | `/api/auth/session`, `/api/auth/custom-token`, `/api/auth/session/refresh` casam; `/_next/static/x.js`, `/favicon.ico`, `/showcase/showcase.mp4` continuam fora | sim |
| T6 | `packages/next-config/__tests__/brand.test.ts` (ajustar) | função pura | aceita `https://…`, `http://localhost:3001/icon.png`, `http://127.0.0.1:3001/icon.png`, `http://[::1]:3001/icon.png`; descarta `http://cdn.example.com/logo.png`; `getBrandLogoOrigin()` devolve `null` para o descartado | sim para o caso `http://cdn…` |
| T7 | `apps/app/__tests__/nextConfigImages.test.ts` (novo) | config real | com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="demo.appspot.com"`: `images.domains` ausente, `remotePatterns` = lh3 + `{ protocol: "https", hostname: "storage.googleapis.com", pathname: "/demo.appspot.com/**" }`; com `""` ou ausente: só lh3 (string vazia é ausência) | sim |
| T8 | `packages/security/__tests__/rateLimit.test.ts` (ampliar) | `@arcjet/next` mockado | os dois orçamentos montam `shield({ mode: "DRY_RUN" })` além do `slidingWindow`; sem chave, nenhum `arcjet()` é criado (já coberto, só conferir) | sim |

Notas para o `/develop`:

- T1 e T2 precisam do env real. Os testes atuais da `web` mockam `@/env` inteiro
  (`proxyLocale.test.ts:13-18`, `securityHeaders.test.ts:13-19`), e é por isso que o defeito do
  `skipValidation` nunca apareceu na suíte. Não mockar `@/env` nesses dois.
- Rode a suíte inteira da `web`: tirar o `skipValidation` passa a validar o schema próprio do `env.ts` em todo
  teste que importa o módulo real. Os campos são todos `z.string().optional()`, então não deve quebrar, mas
  teste em `jsdom` que leia variável de servidor pelo `env` agora lança (`onInvalidAccess`). Hoje nenhum lê.
- T7: importar `@/next.config` com `vi.resetModules()` depois do `vi.stubEnv`. Se o import do
  `@next/bundle-analyzer` atrapalhar, extrair `imageRemotePatterns(bucket)` para `apps/app/shared/lib/` e
  testar a função; o `next.config.ts` só chama.

Comandos: `pnpm --filter web test`, `pnpm --filter app test`, `pnpm --filter @repo/security test`,
`pnpm --filter @repo/next-config test`.

### 8. O que o `/test` vai percorrer

Não há superfície de UI nova. A passada é de terminal e de cabeçalho HTTP, sem `agent-browser` de tela em
tela, exceto um smoke de login (F6) porque o proxy passa a tocar nas rotas de sessão.

| Fluxo | Como produzir | Esperado |
|-------|---------------|----------|
| F1. Bot na landing | `apps/web/.env` local já tem `ARCJET_KEY` com prefixo válido (conferido sem imprimir o valor). `pnpm --filter web build && pnpm --filter web start`, depois `curl -s -o /dev/null -w '%{http_code}' -A 'python-requests/2.31' http://localhost:3001/pt-br` | `403` |
| F2. Navegador comum na landing | mesmo servidor, `curl -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'` | `200` |
| F3. Landing sem chave | mesmo build com `ARCJET_KEY=""` no ambiente do `start` | sobe; `python-requests` recebe `200` (modo degradado) |
| F4. Cabeçalhos nos três apps | `curl -sI` em `http://localhost:3001/pt-br`, `http://localhost:3000/pt-br/sign-in`, `http://localhost:3002/health` | `permissions-policy` presente nos três, valor de [§10.5](#105-cabeçalhos) |
| F5. Cabeçalhos em `/api/auth/*` | `curl -si -X POST http://localhost:3000/api/auth/session -H 'content-type: application/json' -d '{}'` e o mesmo na `:3001` | resposta da rota (4xx de sessão, como hoje) com HSTS, `x-content-type-options`, `permissions-policy`; sem `location`; sem `set-cookie: x-locale` |
| F6. Login e logout continuam | `agent-browser` em `http://localhost:3000/pt-br/sign-in` com o emulador e o seed, conta de QA, entrar e sair; depois o mesmo pela landing (SSO) | entra, chega à home, sai. Um tema e um idioma bastam: nada de layout mudou |
| F7. Gitleaks reprova segredo | ver [§12.1](#121-provas-locais-do-que-só-o-github-executa) | saída 1 com o fixture, 0 no diff da branch |
| F8. `pnpm audit` | `pnpm audit --prod --audit-level=high` | saída 0 |
| F9. SHAs | para cada `uses:` do `ci.yml`, `gh api repos/<owner>/<repo>/commits/<sha> --jq .sha` | devolve o próprio SHA; o comentário de versão bate com a tag de [§10.3](#103-actions-por-sha) |
| F10. `.gitignore` | `git check-ignore -v apps/api/.env.production apps/web/.env.development x-firebase-adminsdk-ab12c.json` e `git check-ignore apps/web/.env.example` | três ignorados; o `.env.example` **não** (saída 1) |
| F11. Logo `http:` | `NEXT_PUBLIC_APP_LOGO_URL="http://cdn.example.com/logo.png"` no build da `web` | logo some (ícone genérico) e a origem não entra no `img-src` |

Googlebot falsificado: um `curl -A Googlebot` saindo de `localhost` pode receber 403, porque o Arcjet confere
o IP dos bots conhecidos. Isso é o comportamento certo e **não reprova**. O "Googlebot passa" da spec fica
provado pelo T2 (lista de permissão passada ao `secure`) e, em produção, pela inspeção de URL do Search
Console. Fica 🔒 se ninguém tiver produção.

Use `build && start` em F1 a F5 (política §4: `next dev` não é produção). E2E: `pnpm e2e` uma vez, porque as
rotas de sessão agora passam pelo proxy (exige JDK 21).

### 9. Critérios de aceite

```markdown
# Critérios de Aceite (Checklist)

- [ ] **A chave do Arcjet chega ao proxy da landing**
  Com `ARCJET_KEY` válida no ambiente, `env.ARCJET_KEY` em `apps/web/env.ts` devolve a chave, e o proxy chama
  `secure()` com a lista de permissão de buscadores, previews e monitores. Hoje a chave chega `undefined`
  porque o `skipValidation` devolve o `runtimeEnv` antes de juntar o `extends`. O teste T1 falha sem a correção.

- [ ] **A landing recusa cliente automatizado e deixa passar navegador**
  Num build de produção com a chave, `curl -A 'python-requests/2.31'` em `/pt-br` recebe 403 e um user agent
  de Chrome recebe 200. A resposta 403 sai com os cabeçalhos de segurança. Googlebot falsificado a partir de
  `localhost` pode receber 403 e isso não é defeito.

- [ ] **A landing sobe e funciona sem a chave**
  Com `ARCJET_KEY=""` ou ausente, o build passa, a landing responde 200 a qualquer user agent e `secure()`
  não é chamado. Uma chave sem o prefixo `ajkey_` continua reprovando o build, como hoje.

- [ ] **Permissions-Policy nos três apps**
  Toda resposta de `web`, `app` e `api` traz `Permissions-Policy` com o valor de §10.5, inclusive o
  redirecionamento de idioma e a resposta 403 do Arcjet. Na landing, com a CSP em `Report-Only`, o
  `Permissions-Policy` continua aplicado.

- [ ] **Cabeçalhos nas rotas de sessão das front-ends**
  `POST /api/auth/session`, `DELETE /api/auth/session`, `POST /api/auth/session/refresh` e
  `POST /api/auth/custom-token`, em `app` e `web`, saem com HSTS, `nosniff`, `Referrer-Policy`, CSP e
  `Permissions-Policy`. O proxy não redireciona `/api/*` para um idioma, não grava `x-locale` e não chama o
  Arcjet nessas rotas.

- [ ] **Login, logout e SSO continuam funcionando**
  Entrar e sair pelo painel e pela landing funcionam como antes, com o cookie `access-token` gravado pela
  rota de sessão. A suíte `pnpm e2e` passa.

- [ ] **Logo da marca só em HTTPS fora de loopback**
  `NEXT_PUBLIC_APP_LOGO_URL` com `https:` é aceita; com `http:` só é aceita quando o host é `localhost`,
  `127.0.0.1` ou `[::1]`, que o navegador não trata como conteúdo misto. Qualquer outro `http:` é descartado:
  cada superfície mostra o ícone genérico e a origem não entra na CSP.

- [ ] **Otimizador de imagem restrito ao bucket do produto**
  `apps/app/next.config.ts` não declara `images.domains`. Com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  preenchida, `storage.googleapis.com` só vale no caminho `/<bucket>/**`; vazia ou ausente, o host do Storage
  sai da lista. O avatar do Google continua permitido.

- [ ] **Segredo no diff reprova o CI**
  O job `secrets` baixa o Gitleaks `v8.30.1` com checksum conferido e varre só os commits da PR. Uma PR com
  uma chave no formato da Stripe sai vermelha; uma PR limpa sai verde. Localmente, o roteiro de §12.1 dá
  saída 1 com o fixture e 0 sobre a branch.

- [ ] **Dependência vulnerável de produção reprova o CI**
  O job `audit` roda `pnpm audit --prod --audit-level=high` sem instalar dependências. Hoje sai 0. Uma
  exceção só entra por `pnpm.auditConfig.ignoreGhsas` com a justificativa e a data de revisão em `"//"`.

- [ ] **Actions pinadas por SHA**
  Toda linha `uses:` do `ci.yml` aponta para um SHA de commit de 40 caracteres com a versão em comentário, e
  cada SHA resolve no repositório da action. Tags anotadas (`pnpm/action-setup`) foram dereferenciadas até o
  commit.

- [ ] **Dependabot configurado**
  `.github/dependabot.yml` declara `npm` e `github-actions`, semanal, com atualizações de minor e patch
  agrupadas. A validação do arquivo só acontece no GitHub depois do merge (não verificado localmente).

- [ ] **`.gitignore` cobre variantes de `.env` e a service account**
  `.env.production`, `.env.development`, `.env` e `*-firebase-adminsdk-*.json` ficam ignorados em qualquer
  pasta, e os três `.env.example` continuam versionados.

- [ ] **Documentação sem afirmação falsa**
  `FORKING.md` traz o passo de restringir a chave do navegador (referenciador + API) e a do servidor (só
  API), corrige a Resend para "só na `api`" e tira a frase do `skipValidation`. `SUBPROCESSORS.md:40`,
  `SETUP.md` (seis jobs), `SECURITY.md`, `PRE-PRODUCTION.md` e `delivery/02-infra-hardening.md` batem com o
  código entregue.
```

---

## Etapa 2: blueprint técnico

### 10.1 Bloqueio de bot da landing (`apps/web/env.ts`)

**Causa, lida no código.** `@t3-oss/env-core@0.13.8`, `createEnv`:

```js
const skip = !!opts.skipValidation;
if (skip) return runtimeEnv;                 // linha 37: sai aqui
...
const extendedObj = (opts.extends ?? []).reduce(...)   // linha 70: o merge do extends nunca roda
```

O `runtimeEnv` da `web` não declara `ARCJET_KEY`, então `env.ARCJET_KEY` é `undefined` sempre. O
`secure()` em si lê a chave de `process.env` (`packages/security/index.ts:131`), mas o proxy nunca chega lá
por causa do `if (!env.ARCJET_KEY) return;` em `apps/web/proxy.ts:67`.

**Os outros dois apps:**

- `apps/app/env.ts` não usa `skipValidation`: o `extends` funciona, e o proxy do painel já chama `secure()`
  quando há chave. É o precedente de que tirar o `skipValidation` funciona, inclusive com módulos cliente
  importando `@/env` (`apps/app/shared/lib/storageEnabled.ts` e outros).
- `apps/api/env.ts:65` usa `skipValidation` só em `development`, e já redeclara o que precisa
  (`FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_APP_URL`). A API lê o Arcjet por `readArcjetKey()` direto de
  `process.env` (`packages/security/index.ts:94`), então não tem o defeito. Fica como está.

**Por que tirar o `skipValidation` não derruba nada.** Os `extends` (`core()`, `email()`, `security()`) já são
avaliados e validados hoje, na hora do import, porque cada `keys()` chama o próprio `createEnv` (o
`core()` tem `skipValidation` próprio em `packages/next-config/keys.ts:78`). O que passa a ser validado é só o
schema da própria `web`, todo `z.string().optional()`. No navegador (`header/index.tsx` é `"use client"`), o
`createEnv` valida só as chaves cliente; o merge dos `extends` copia propriedades do alvo de cada proxy, que
no cliente não tem chave de servidor, então não lança. É o mesmo caminho que o `apps/app` percorre hoje.

**Mudança:**

```diff
 export const env = createEnv({
     extends: [core(), email(), security()],
     server: {},
-    // Public settings the proxy needs to name the exact origins the browser may
-    // reach. Declared here rather than taken from the extended envs: with
-    // `skipValidation` those are not merged into the resolved object.
+    // Public settings the proxy needs to name the exact origins the browser may
+    // reach. Declared here so an empty value reads as absent.
     client: {
         ...
-        // Where every call to action sends a visitor, and the docs link of the header
-        // and footer. Same reason as above: the values `core()` declares would not
-        // reach the resolved object.
+        // Where every call to action sends a visitor, and the docs link of the header
+        // and footer. Redeclared because `core()` skips its own validation and would
+        // hand an empty string through.
         NEXT_PUBLIC_APP_URL: z.string().optional(),
         NEXT_PUBLIC_DOCS_URL: z.string().optional(),
     },
     runtimeEnv: { ... sem mudança ... },
-    skipValidation: true,
 });
```

Os campos redeclarados ficam: o próprio schema vence o `extends` no merge (`Object.assign(extendedObj,
parsed.value)`), e o `|| undefined` do `runtimeEnv` continua convertendo string vazia. O texto exato dos
comentários é do `/develop`; o requisito é que não descrevam mais o `skipValidation`.

`apps/web/proxy.ts` não muda nesta parte: o `if (!env.ARCJET_KEY)` passa a funcionar.

### 10.2 Varredura de segredo (`ci.yml` + `.gitignore`)

**Como o job obtém o binário sem dependência nova.** Download do release oficial com o SHA-256 fixado no
workflow, conferido com `sha256sum -c`. Nada entra no `package.json`, não há action de terceiro nem chave de
licença. O checksum fixado no arquivo (e não baixado do mesmo release) é o que dá a garantia: um release
adulterado não passa.

- Versão: `8.30.1`.
- `gitleaks_8.30.1_linux_x64.tar.gz` → `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`
  (de `gitleaks_8.30.1_checksums.txt`, baixado e conferido em 2026-11-23).

**Job:**

```yaml
  secrets:
    name: secrets
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0

      # The binary, not gitleaks-action: the action asks for a license key on every
      # organization-owned repository. The checksum is pinned here, not fetched.
      - name: Install gitleaks
        env:
          GITLEAKS_VERSION: 8.30.1
          GITLEAKS_SHA256: 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
        run: |
          archive="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
          curl -sSfL -o "$RUNNER_TEMP/$archive" \
            "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${archive}"
          echo "${GITLEAKS_SHA256}  $RUNNER_TEMP/$archive" | sha256sum -c -
          tar -xzf "$RUNNER_TEMP/$archive" -C "$RUNNER_TEMP" gitleaks

      # Only the commits this change brings: the history of the reference repository
      # already holds a revoked key, and a full scan would fail every fork's first push.
      - name: Scan the new commits
        env:
          EVENT: ${{ github.event_name }}
          BASE: ${{ github.event.pull_request.base.sha }}
          HEAD: ${{ github.event.pull_request.head.sha }}
          BEFORE: ${{ github.event.before }}
          SHA: ${{ github.sha }}
        run: |
          if [ "$EVENT" = "pull_request" ]; then
            range="$BASE..$HEAD"
          elif [ -z "$BEFORE" ] || [ "$BEFORE" = "0000000000000000000000000000000000000000" ]; then
            range="-1 $SHA"
          else
            range="$BEFORE..$SHA"
          fi
          "$RUNNER_TEMP/gitleaks" git --redact --no-banner --log-opts="$range" .
```

Pontos de atenção:

- Valores de `github.*` entram por `env:`, nunca interpolados no `run:` (evita injeção de script).
- `fetch-depth: 0` é necessário para o intervalo `base..head`. O checkout da PR é o merge commit, que tem
  base e head como pais, então os commits da PR estão no clone.
- O comentário "already holds a revoked key" só é verdade depois que o alerta #1 for tratado (§11). Se o
  `/develop` preferir, escrever "already holds a key flagged by secret scanning". O motivo do intervalo é
  real de qualquer forma: medido com o binário sobre o histórico, há 71 achados `gcp-api-key` em
  `apps/api/(shared)/infra/dabatase.ts` entre `1e94b7c8` (2026-04-04) e `fc7ef270` (2026-08-22), todos em
  `origin/main`.

**Allowlist.** Não criar `.gitleaks.toml` agora. Medido: o Gitleaks com a configuração padrão, sobre o
histórico inteiro, não acusou nenhum fixture. Os PEM falsos (`"-----BEGIN PRIVATE KEY-----\nkey\n..."` em
`apps/api/__tests__/serviceAccountEnv.test.ts:28` e outros dois) são curtos demais para a regra
`private-key`, e os `sk_test_offline_qa`/`whsec_offline_qa` não casam com `stripe-access-token` (o sufixo
tem `_`). Allowlist sem falso positivo só cega o scanner. Quando aparecer um, o caminho é `# gitleaks:allow`
na linha ou a impressão digital no `.gitleaksignore`, ambos lidos pelo binário sem configuração. Documentar
isso em `SETUP.md`.

**`.gitignore`** (bloco `# local env files`, `.gitignore:63-64`):

```diff
 # local env files
-.env*.local
+.env*
+!.env.example
+*-firebase-adminsdk-*.json
```

As linhas antigas de `:144-148` ficam redundantes e inofensivas; não mexer (mudança mínima). `.env*` não
pega `env.ts` (não começa com ponto). Os três `.env.example` são os únicos arquivos versionados com esse
prefixo (`git ls-files`).

### 10.3 Actions por SHA

Tag e SHA resolvidos em 2026-11-23 com `gh api repos/<repo>/git/ref/tags/<tag>`. Quando o `object.type` é
`tag` (tag anotada), o SHA é do objeto tag e não serve: segue-se com `gh api repos/<repo>/git/tags/<sha>
--jq .object.sha` até chegar ao commit. Foi o caso de `pnpm/action-setup`: `v6` → objeto tag `f53f5227…` →
commit `73e46992…`.

| Hoje | Pin | Comentário | Conferência |
|------|-----|-----------|-------------|
| `actions/checkout@v7` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `# v7.0.1` | `v7` e `v7.0.1` apontam para o mesmo commit |
| `pnpm/action-setup@v6` | `73e46992e05b19abd31f2f3c20e0e7370d762115` | `# v6.1.1` | `v6` e `v6.1.1` são tags anotadas do mesmo commit |
| `actions/setup-node@v7` | `949feb2413d6458794dcd2491c4babbbce0c15c1` | `# v7.1.0` | idem |
| `actions/setup-java@v6` | `d1374f8ac74474200d16ef8ecee22c7ae7a51880` | `# v6.3.0` | idem |
| `actions/cache@v6` | `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` | `# v6.1.0` | idem |
| `actions/upload-artifact@v7` | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | `# v7.0.2` | idem |

Como o pin é o mesmo commit que a tag móvel resolve hoje, o comportamento do CI não muda. Formato:
`- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`. O Dependabot
(`github-actions`) atualiza o SHA e o comentário. Antes de gravar, o `/develop` re-resolve os SHAs com o
mesmo comando: se uma tag andou entre hoje e a implementação, usa o valor novo e registra no handoff.

### 10.4 Dependências: Dependabot e `pnpm audit`

**`.github/dependabot.yml`** (novo):

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      production:
        dependency-type: production
        update-types: [minor, patch]
      development:
        dependency-type: development
        update-types: [minor, patch]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    groups:
      actions:
        patterns: ["*"]
```

- Major sai em PR individual (fora dos grupos), porque costuma exigir mudança de código.
- Cooldown: o padrão do Dependabot já é de 3 dias e não atrasa atualização de segurança. Não declarar.
- `directory: /` com `pnpm-workspace.yaml` na raiz. Se, depois do merge, a aba Dependency graph → Dependabot
  mostrar só o `package.json` da raiz, trocar por `directories: ["/", "/apps/*", "/packages/*"]`. Isso só é
  verificável no GitHub (Q7).
- PRs do Dependabot disparam `pull_request` com token de leitura e sem segredo. O CI não usa segredo, então
  roda normal.

**Job `audit`:**

```yaml
  audit:
    name: audit
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - uses: pnpm/action-setup@73e46992e05b19abd31f2f3c20e0e7370d762115 # v6.1.1

      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc

      # Reads pnpm-lock.yaml only; no install. Exceptions live in pnpm.auditConfig.ignoreGhsas,
      # each one justified with a revisit date under "//" in package.json.
      - run: pnpm audit --prod --audit-level=high
```

Nível `high`, não `critical` (Q2). Sem `cache: pnpm` no `setup-node`, porque não há install.

### 10.5 Cabeçalhos

**`Permissions-Policy`** em `packages/security/middleware.ts`. O nosecone não tem a opção, então o header é
posto à mão dentro de `applySecurityHeaders`, que os três proxies já chamam:

```ts
/**
 * Browser features none of the apps use. A fork that needs one (camera capture, Stripe's
 * Payment Request button) lists the origin here instead of dropping the header.
 */
export const PERMISSIONS_POLICY =
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

const PERMISSIONS_POLICY_HEADER = "permissions-policy";

export function applySecurityHeaders<T extends Response>(response, options, reportOnly = false): T {
    const headers = nosecone(options);
    for (const [name, value] of headers.entries()) { ...igual... }
    response.headers.set(PERMISSIONS_POLICY_HEADER, PERMISSIONS_POLICY);
    return response;
}
```

A lista fica nas oito features que o Chrome reconhece e que o securityheaders.com cobra; feature
desconhecida gera aviso no console (por isso nada de `interest-cohort`). `fullscreen` e
`publickey-credentials-get` ficam de fora de propósito: a spec de MFA pode precisar da segunda.

**`/api/*` nas front-ends.** Menor mudança: tirar `api` da exclusão do matcher e responder cedo no proxy.

`apps/app/proxy.ts`:

```diff
 export const config = {
-    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
+    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
 };
+
+function isApiPath(pathname: string): boolean {
+    return pathname === "/api" || pathname.startsWith("/api/");
+}

 export default async function proxy(request: NextRequest) {
+    // Route handlers answer JSON on their own: no locale to resolve, no page session to
+    // enforce and no bot check, only the headers every response carries.
+    if (isApiPath(request.nextUrl.pathname)) {
+        return applySecurityHeaders(NextResponse.next(), securityOptions);
+    }
     return applySecurityHeaders(await route(request), securityOptions);
 }
```

`apps/web/proxy.ts`: o mesmo, mantendo o resto do matcher (`robots.txt|sitemap.xml|showcase/`) e passando
`REPORT_ONLY`, como as páginas.

- A checagem vem antes de `route()`, então `/api/*` não chama `cookies()`, não redireciona e não toca no
  Arcjet. O `isStaticAssetPath` do painel também fica depois.
- `NextResponse.next()` sem mudar os headers do request: as rotas de sessão não leem
  `LOCALE_REQUEST_HEADER` nem `APP_PATH_HEADER`.
- O `Set-Cookie` da rota de sessão sobrevive: o Next junta os headers da resposta do proxy com os da rota.
- As rotas são chamadas da mesma origem (`SignInForm.tsx:90`, `SignUpFormClient.tsx:79`), então o
  `Cross-Origin-Resource-Policy: same-origin` das opções de browser não atrapalha. CORP só afeta leitura
  `no-cors` entre origens.
- Política aplicada: a mesma das páginas (`buildBrowserAppOptions`). Para uma resposta JSON a CSP é quase
  irrelevante; usar outra política (a da API, com `CORP: cross-origin`) seria afrouxar sem motivo.

### 10.6 Logo `https:` e `remotePatterns`

`packages/next-config/brand.ts`:

```diff
-/** Absolute http(s) only: email clients cannot resolve a relative path, and any other scheme is not an image. */
+const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
+
+/**
+ * Absolute https only, so a production page never pulls the logo over plain http. Loopback
+ * http stays allowed for local development: browsers treat it as a secure context.
+ */
 const toHttpUrl = (value: string | undefined): string | null => {
     ...
-        const isHttp = url.protocol === "https:" || url.protocol === "http:";
-        return isHttp && PLAIN_HOST_RE.test(url.hostname) ? url.href : null;
+        const isAllowedScheme =
+            url.protocol === "https:" ||
+            (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname));
+        return isAllowedScheme && PLAIN_HOST_RE.test(url.hostname) ? url.href : null;
```

Nome da função pode virar `toHttpsUrl`; é do `/develop`. Atualizar `docs/SETUP.md:95` ("URL absoluta
`https`…").

`apps/app/next.config.ts`:

```diff
+const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || undefined;
+
 let nextConfig: NextConfig = {
     ...
     images: {
-        domains: ["lh3.googleusercontent.com", "www.google.com"],
         remotePatterns: [
             { protocol: "https", hostname: "lh3.googleusercontent.com" },
-            { protocol: "https", hostname: "storage.googleapis.com" },
+            // V4 signed URLs are path-style: the bucket is the first path segment.
+            ...(storageBucket
+                ? [{ protocol: "https" as const, hostname: "storage.googleapis.com", pathname: `/${storageBucket}/**` }]
+                : []),
         ],
     },
 };
```

A URL assinada sai em estilo de caminho (`https://storage.googleapis.com/<bucket>/<objeto>?X-Goog-…`), como
mostra o fixture de `apps/api/__tests__/entityPhotoReference.test.ts:116` e o `getSignedUrl({ version: "v4" })`
de `apps/api/(shared)/lib/storage.ts:103`. O proxy do painel já usa a mesma variável para pôr
`storage.googleapis.com` na CSP (`apps/app/proxy.ts:41,72`). O Next carrega os `.env` antes de avaliar o
`next.config`, então a variável está disponível no build.

### 10.7 Shield na API (`DRY_RUN`)

`packages/security/index.ts`, nos dois ramos de `protectWithBudget`:

```diff
+/**
+ * Logged on the Arcjet dashboard, never enforced: watch a week of real traffic before a
+ * fork switches it to LIVE, since a false positive here refuses a legitimate write.
+ */
+const API_SHIELD_MODE = "DRY_RUN";
 ...
             rules: [
+                shield({ mode: API_SHIELD_MODE }),
                 slidingWindow({ ... }),
             ],
```

Nenhuma variável de ambiente nova (a spec diz "nenhuma variável nova"). Trocar para `LIVE` é edição de uma
constante no fork, registrada no item 8 do `PRE-PRODUCTION.md`. O `secure()` das front-ends já usa
`shield({ mode: "LIVE" })` (`index.ts:143-146`) e não muda.

### 10.8 Documentação

| Arquivo | Mudança |
|---------|---------|
| `docs/FORKING.md` §4 | item novo depois do 7: restringir a chave do navegador por referenciador (`https://<landing>/*`, `https://<painel>/*`, `https://<projeto>.firebaseapp.com/*`) e por API (Identity Toolkit API, Token Service API, mais o que o fork usar no cliente); criar uma chave separada para `FIREBASE_WEB_API_KEY`, só com restrição de API, porque a chamada sai do servidor sem `Referer`. Apontar para o item 2.3 da parte 2. No item 6, uma linha: o JSON baixado já é ignorado pelo `.gitignore` e não deve ir para o repositório |
| `docs/FORKING.md:305-307` (§7.1) | `RESEND_TOKEN` e `RESEND_FROM` **só na `api`**; o formulário de contato da landing chama a API. `app` e `web` validam as duas se estiverem preenchidas, sem enviar nada |
| `docs/FORKING.md:343-346` (§7.3) | tirar a frase do `skipValidation`; dizer que na `web` e no `app` a chave liga o bloqueio de bot do proxy |
| `docs/FORKING.md:423` | coluna de apps: `api (app e web só validam)` |
| `docs/FORKING.md:96-101` (CI) | listar `secrets` e `audit`; exigir os dois junto com `verify` e `e2e` |
| `docs/SETUP.md:150-215` | "seis jobs"; linhas de `secrets` e `audit` na tabela; actions por SHA atualizadas pelo Dependabot; como rodar o Gitleaks local e como tratar falso positivo (`# gitleaks:allow`, `.gitleaksignore`); como registrar exceção de audit; runbook exige `verify`, `e2e`, `secrets`, `audit` |
| `docs/SETUP.md:95` | logo: `https`, `http` só em loopback |
| `docs/SECURITY.md:131-147` | `Permissions-Policy` nos três apps e o que fazer ao trazer Stripe.js (`payment=(self "https://js.stripe.com")`); `/api/*` das front-ends com os mesmos cabeçalhos |
| `docs/SUBPROCESSORS.md:40` | tirar "(esta não roda: o `skipValidation`…)" e corrigir as âncoras |
| `docs/PRE-PRODUCTION.md` item 8 | a landing agora consulta o Arcjet em toda página: conferir a cota contra o tráfego da landing, não só contra as escritas; trocar `API_SHIELD_MODE` para `LIVE` depois de uma semana olhando o painel |
| `docs/PRE-PRODUCTION.md` item 9 | exigir também `secrets` e `audit`; ligar Dependabot alerts, security updates, secret scanning e push protection |
| `docs/PRE-PRODUCTION.md` item 17 (novo, em "Fortemente recomendados") | restringir as duas chaves do Firebase, com o `curl` de verificação do item 2.3 |
| `docs/delivery/02-infra-hardening.md:341` (2.20) | trocar o comando por `pnpm audit --prod --audit-level=high` (o que o core entrega) e citar o job `audit` |
| `docs/delivery/02-infra-hardening.md:158` (2.7) | checks `verify`, `e2e`, `secrets` e `audit` |

Toda prosa nova ou editada passa pela `humanizer`.

### 10.9 Ordem de implementação e de commit

Não há SDK nem i18n. Um commit por pacote/app, assunto separado de assunto:

1. `feat(security): send a restrictive Permissions-Policy on every response` (`middleware.ts` + T3)
2. `feat(security): run the Arcjet shield in dry run on the API limiter` (`index.ts` + T8)
3. `fix(next-config): accept a plain http logo only on loopback hosts` (`brand.ts` + T6)
4. `fix(web): let the Arcjet key reach the proxy` (`env.ts` + T1 + T2)
5. `feat(web): security headers on the session routes` (`proxy.ts` + T4/T5 da web)
6. `feat(app): security headers on the session routes` (`proxy.ts` + T4/T5 do app)
7. `fix(app): limit the image optimizer to the product bucket` (`next.config.ts` + T7)
8. `ci: pin actions by commit SHA` (`ci.yml`, só os `uses:`)
9. `ci: scan new commits for secrets and audit production dependencies` (`ci.yml`, jobs `secrets` e `audit`)
10. `ci: add Dependabot for npm and GitHub Actions` (`dependabot.yml`)
11. `chore: ignore every env variant and service account keys` (`.gitignore`)
12. `docs: firebase key restrictions, CI jobs and headers` (os docs de §10.8)
13. `docs(features): delivery-infra-hardening` (último)

O `docs/PRE-PRODUCTION.md` e o `specs/BACKLOG.md` já têm hunks da auditoria no working tree; o `/review`
separa com `git add -p` ou registra o commit misto.

### 10.10 Env nova

Nenhuma. O fork precisa só das ações de console de [§11](#11-pré-requisitos-manuais-de-infra).

---

## 11. Pré-requisitos manuais de infra

Nada disto é código. O `/develop` não satisfaz, e o `/test` marca como 🔒 (não verificado), nunca como
reprovado.

**No repositório de referência (dono do repo, uma vez):**

| # | Ação | Onde | Por quê |
|---|------|------|---------|
| P1 | Restringir a chave do alerta #1 (`google_api_key`, commit `1e94b7c8`) por referenciador e API, ou rotacionar se não der para saber onde ela foi usada; conferir o login; fechar o alerta como "revoked" | Google Cloud Console › Credenciais; GitHub › Security › Secret scanning | 2.2 fica 🔴 enquanto o alerta estiver aberto. O job novo não resolve histórico |
| P2 | Proteger a `main` exigindo `verify`, `e2e`, `secrets`, `audit` | GitHub › Settings › Rules | 2.7. Os checks novos só aparecem na busca depois de rodarem numa PR |
| P3 | Ligar Dependabot alerts e security updates | GitHub › Settings › Code security | 2.20. O `dependabot.yml` cobre só version updates |
| P4 | Conferir que secret scanning e push protection seguem ligados; avaliar non-provider patterns | idem | 2.20 |
| P5 | Ref local `refs/conductor-checkpoints/conductor-archive-bb3ed7d1-…` contém três `.env` com chave privada (commit `29c7bdf9`, 2026-08-20). Não está no `origin`. Apagar o ref local e não usar `git push --all`/`--mirror` | máquina do dono | Medido com o Gitleaks sobre todos os refs. É o caso que o item 2.2 já avisa ("checkpoints de ferramentas") |

**Em todo fork (vai para o `PRE-PRODUCTION.md`):**

| # | Ação |
|---|------|
| P6 | Restringir a chave do navegador do Firebase (referenciador + API) e criar a chave do servidor só com API (item 17 novo) |
| P7 | `ARCJET_KEY` nos três projetos da Vercel e conferir a cota do plano contra o tráfego da landing, que agora consulta o Arcjet em toda página (item 8) |
| P8 | Depois de uma semana com o shield da API em `DRY_RUN`, ler as decisões no painel do Arcjet e trocar `API_SHIELD_MODE` para `LIVE` (item 8) |
| P9 | P2, P3 e P4 no repositório do fork (item 9) |

## 12. Sinais de pronto da spec: onde cada um se prova

| Sinal da spec | Verificável onde | Prova local equivalente |
|---------------|------------------|-------------------------|
| PR com chave falsa da Stripe reprova no CI | só no GitHub, depois do push | §12.1, passos 1 a 3 |
| PR com dependência de CVE crítica reprova no CI | só no GitHub | `pnpm audit --prod --audit-level=high` local sai 0 hoje; para ver a saída 1, um `pnpm audit --prod --audit-level=moderate` (sai 1 hoje) prova que o comando reprova quando há achado no nível pedido. Não instalar pacote vulnerável no repositório |
| `curl -A python-requests` na landing → 403 com a chave | local | F1 (há chave dev na `apps/web/.env`) |
| `curl -I` nos três apps mostra `Permissions-Policy` | local | F4 |
| Parte 2 sem 🔴 nos itens de repositório (2.2, 2.12, 2.15, 2.18, 2.20) | parcial | 2.12, 2.15, 2.18: local. 2.20: o arquivo e o job, local; "alertas ligados" é P3. 2.2: o `gitleaks` local sobre `origin/main` acusa o `dabatase.ts` de 2026-04 a 2026-08, então 2.2 só passa depois de P1 |
| Dependabot abre PR | só no GitHub | nenhuma; validar a sintaxe do YAML (`ruby -ryaml -e 'YAML.load_file(".github/dependabot.yml")'`) |
| Workflow válido | só no GitHub | `ruby -ryaml -e 'YAML.load_file(".github/workflows/ci.yml")'` e conferir cada `uses:` (F9) |

### 12.1 Provas locais do que só o GitHub executa

O binário do Gitleaks não está no repositório nem deve entrar. Para a prova local, baixe numa pasta
temporária própria, confira o checksum e rode de lá:

```bash
dl=$(mktemp -d)
gh release download v8.30.1 -R gitleaks/gitleaks -D "$dl" \
  -p 'gitleaks_8.30.1_checksums.txt' -p 'gitleaks_8.30.1_darwin_arm64.tar.gz'
(cd "$dl" && grep darwin_arm64 gitleaks_8.30.1_checksums.txt | shasum -a 256 -c -)
tar -xzf "$dl/gitleaks_8.30.1_darwin_arm64.tar.gz" -C "$dl" gitleaks
```

1. **Fixture fora do repositório.** Um repo descartável com um commit que contém uma chave no formato da
   Stripe, montada em tempo de execução. Nunca gravar o fixture no repositório: o próprio job e o push
   protection o bloqueariam.

   ```bash
   fx=$(mktemp -d) && git -C "$fx" init -q
   printf 'const key = "sk_live_%s";\n' "$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)" > "$fx/leak.ts"
   git -C "$fx" add . && git -C "$fx" -c user.email=qa@example.com -c user.name=qa commit -qm leak
   "$dl/gitleaks" git --redact --no-banner --log-opts="-1" "$fx"; echo "exit=$?"   # esperado: 1
   ```

2. **O mesmo bloco `run:` do job**, com as variáveis exportadas apontando para o repo descartável
   (`EVENT=pull_request`, `BASE=<commit vazio inicial>`, `HEAD=<commit do leak>`), para provar que o cálculo
   do intervalo funciona. Esperado: saída 1.
3. **A branch limpa**: `git diff origin/main | "$dl/gitleaks" stdin --redact --no-banner; echo "exit=$?"`
   (antes do commit) ou `--log-opts="origin/main..HEAD"` (depois). Esperado: 0.

Ao final, `rm -rf "$dl" "$fx"`. Nenhum valor de chave aparece no relatório: o `--redact` cuida da saída e o
fixture é aleatório.

---

## Perguntas em aberto (decididas por padrão)

Nenhuma foi perguntada. Cada uma traz a decisão adotada e a alternativa descartada.

**Q1. Gitleaks: action ou binário? E qual ferramenta?**
Adotado: binário `v8.30.1`, baixado do release com SHA-256 fixado no workflow (spec recomenda). Descartados:
`gitleaks/gitleaks-action` (pede `GITLEAKS_LICENSE` em repositório de organização, um segredo a mais por
fork); Betterleaks e TruffleHog (a spec já escolheu Gitleaks, e trocar não traz ganho medido). O Gitleaks
se declara "feature complete"; o pin de versão é atualizado à mão, já que o Dependabot não enxerga download
por `curl`. Custo: zero, sem dependência no `package.json`.

**Q2. `pnpm audit`: `critical` ou `high`?**
Adotado: `--prod --audit-level=high`. Medido hoje: sai 0, então não reprova a primeira PR, e pega a faixa
que a parte 1 (item 1.13) já cobra. A exceção tem mecanismo pronto, com justificativa e data
(`package.json:2-7`, `:60-66`). Descartado: `critical` (deixaria passar CVE alta que a própria parte 1 da
entrega reprova). Risco aceito: o audit consulta o registro na hora, então uma CVE publicada hoje pode deixar
vermelha uma PR que não mexeu em dependência. Quando acontecer, o caminho é corrigir ou registrar a exceção
com data.

**Q3. Allowlist do Gitleaks agora?**
Adotado: não criar. Medido: zero falso positivo sobre todo o histórico com a configuração padrão. Descartado:
`.gitleaks.toml` com `paths = ["__tests__"]` (cegaria o scanner justamente onde alguém cola uma chave real
para testar). Documentar `# gitleaks:allow` e `.gitleaksignore` para quando surgir o primeiro.

**Q4. Shield do Arcjet na API entra?**
Adotado: sim, em `DRY_RUN`, como constante, nos dois orçamentos. A spec recomenda e a tabela de impacto prevê
a mudança "se a decisão confirmar". Não muda nenhuma resposta. Descartados: `LIVE` já (a spec pede uma semana
em `DRY_RUN` em produção antes); variável de ambiente para o modo (a spec diz "nenhuma variável nova").
Limite: o shield só avalia as requisições que passam por `checkRateLimit` (escritas e a lista estrita), não os
`GET` comuns.

**Q5. Logo: só `https:` ou também `http:` em loopback?**
Adotado: `https:`, mais `http:` em `localhost`, `127.0.0.1` e `[::1]`. O navegador trata loopback como
contexto seguro, então não há conteúdo misto, e o teste existente com `http://localhost:3001/icon.png`
(`brand.test.ts:73`) continua válido para o desenvolvimento local. Descartado: `https:` estrito (quebra o logo
servido localmente sem ganho de segurança).

**Q6. Qual política de cabeçalho em `/api/*` das front-ends?**
Adotado: a mesma das páginas, com resposta cedo no proxy antes de idioma, sessão e Arcjet. Descartados:
`headers()` no `next.config` (estático, não lê o env que monta a CSP, e duplicaria a política); política da
API (`CORP: cross-origin`, mais frouxa sem motivo); rodar o Arcjet nessas rotas (o painel já protege a
página que as chama, e a `refresh` é chamada em segundo plano a cada hora, gasto de cota sem ganho).

**Q7. Dependabot: `directory: /` ou `directories` com glob?**
Adotado: `directory: /`, com o `pnpm-workspace.yaml` na raiz. A referência oficial não diz se a raiz cobre os
workspaces do pnpm. Se o GitHub mostrar só a raiz depois do merge, trocar por
`directories: ["/", "/apps/*", "/packages/*"]`. Fica não verificado até rodar no GitHub.

**Q8. Valor do `Permissions-Policy`.**
Adotado: `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(),
payment=(), usb=()`, numa constante exportada do `@repo/security`. Descartados: lista longa com features que o
Chrome não reconhece (aviso no console a cada página); opção por app em `SecurityHeadersInput` (nenhum app
precisa hoje; o fork edita a constante, e `SECURITY.md` explica o caso da Stripe).

**Q9. Proteção da `main` e alerta #1 do repositório de referência.**
São console e fora do corte. Ficam em P1 e P2 com a recomendação da spec: restringir ou rotacionar a chave e
fechar como "revoked"; ruleset com os quatro checks. Não reapresentar: entram no relatório do `/cycle` como
pendência do dono, uma vez.

## 13. Achados para o `/spec --sync`

- `apps/app/next.config.ts:18-30` sobrescreve `config.images` e perde `formats: ["image/avif", "image/webp"]`
  (`packages/next-config/index.ts:6-8`). Correção de uma linha (`...config.images`), mas muda o formato servido.
- `refs/conductor-checkpoints/*` locais guardam snapshots de working tree com `.env` (P5). Vale uma linha em
  `docs/delivery/02-infra-hardening.md` 2.2 dizendo como listar esses refs (`git for-each-ref refs/conductor-checkpoints`).
- `docs/SUBPROCESSORS.md:40` cita âncoras antigas de `packages/security/index.ts` (`:37`, `:47`, `:80`);
  corrigir junto com a frase do `skipValidation`.
