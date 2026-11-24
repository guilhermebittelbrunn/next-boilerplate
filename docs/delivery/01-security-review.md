# Parte 1: validação de segurança

Procura falha de segurança no produto antes da entrega. O core foi desenhado para fechar a maior parte das
falhas comuns por padrão (guard em toda rota, Zod na borda, Firestore só pela API, erro por código), então o
risco de um fork está concentrado no **código que o fork escreveu** e na **configuração** que ele mudou.
Esta parte examina os dois.

Visão geral da etapa e regras de status em [`README.md`](README.md). O modelo de segurança do core está em
[`docs/SECURITY.md`](../SECURITY.md); os controles de console (chaves, HSTS, Dependabot, App Check) ficam
na [parte 2](02-infra-hardening.md).

## Antes dos itens: revisão do código do produto

Delimite o que o fork escreveu desde que saiu do core e passe uma revisão de segurança só nisso:

```bash
git fetch upstream
BASE=$(git merge-base HEAD upstream/main)
git diff --stat "$BASE"...HEAD -- apps packages firestore.rules storage.rules
```

1. Rode a skill `/security-review` sobre esse diff.
2. Rode o agent `code-reviewer` pedindo revisão do mesmo intervalo contra o
   [`review-checklist.md`](../review-checklist.md), seções de autorização, validação e erros.
3. Registre no relatório cada achado e o que foi feito com ele.

Fork que não tem o remoto `upstream` usa como base o commit do core de onde saiu (o relatório pede esse
SHA).

Nos comandos abaixo, `$API`, `$APP` e `$WEB` são as URLs base do ambiente medido, e `$ID_TOKEN` é um ID
token de uma conta de teste (no emulador, qualquer conta do seed). Nunca use conta de cliente real.

## 1.1 Env exposta

**Risco.** Variável com prefixo `NEXT_PUBLIC_` vai para o JavaScript que qualquer visitante baixa. Uma
chave secreta com esse prefixo está publicada.

**O core já faz.** Cada app tem `env.ts` tipado (`@t3-oss/env-nextjs`) separando `server` de `client`;
chaves de Stripe, Resend, Arcjet e a service account do Firebase são só de servidor. Os pacotes de
integração que leem essas chaves (`@repo/auth` no servidor, `@repo/payments` e `@repo/email`) importam
`server-only`, então o build falha se um componente cliente os importar. O `@repo/security` lê a chave do
Arcjet sem `server-only`; no navegador ela chega vazia, porque só variável `NEXT_PUBLIC_` entra no bundle.

**Como verificar.**

```bash
git grep -nE "NEXT_PUBLIC_[A-Z_]*(SECRET|PRIVATE|TOKEN|PASSWORD|SERVICE_ACCOUNT|WEBHOOK)" -- apps packages
git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.example$'
pnpm build && grep -rlE "sk_(live|test)_|whsec_|re_[A-Za-z0-9]{20,}|ajkey_|BEGIN (RSA )?PRIVATE KEY" apps/*/.next/static
```

O último comando procura segredo dentro do JavaScript que vai para o navegador.

**Aprovado quando** os três comandos saem vazios e toda variável nova do fork está declarada no bloco
`server` do `env.ts`, a não ser que ela seja pública por natureza (URL, id de medição). Gravidade: 🔴.

## 1.2 Falta de validação no front-end

**Risco.** Sem validação no navegador, o usuário só descobre o erro depois de esperar a API, e o formulário
envia lixo que a API precisa recusar. A validação no front é conforto; a segurança está no item 1.3.

**O core já faz.** Todo formulário usa `react-hook-form` com `zodResolver` e os componentes `HookForm*`, com
as mensagens vindas do dicionário.

**Como verificar.** Liste os formulários do fork e confira que cada um tem schema:

```bash
git diff --name-only --diff-filter=d "$BASE"...HEAD -- 'apps/**/*.tsx' | xargs grep -lE "useForm\(" | xargs grep -L "zodResolver"
```

**Aprovado quando** o comando sai vazio e os casos "vazio" e "inválido" da parte 3 (item 3.2) mostram
mensagem traduzida. Gravidade: 🟡.

## 1.3 Falta de validação no back-end

**Risco.** A API é chamada direto, sem passar pelo front. Corpo, query e parâmetro de rota sem validação
abrem espaço para dado malformado no banco, erro 500 e abuso de lógica.

**O core já faz.** Toda rota que recebe JSON lê o corpo por `parseRequestJson` (teto de 100 KiB) e valida
com um `parseX` em Zod; id de rota passa por `resolveIdFromContext`.

**Como verificar.**

```bash
for f in $(grep -rlE "parseRequestJson\(|formData\(\)|searchParams" "apps/api/app/(routes)"); do
  grep -qE "(parse[A-Z][A-Za-z]+|safeParse)\(" "$f" || echo "SEM ZOD: $f"
done
git grep -nE "await req(uest)?\.json\(\)" -- "apps/api/app/(routes)"
```

**Aprovado quando** os dois comandos saem vazios (o segundo acusa leitura de corpo fora do helper; o webhook
da Stripe é a exceção documentada) e toda string de schema novo tem `max`. Gravidade: 🔴.

## 1.4 Injeção (SQL e NoSQL)

**Risco.** O produto não usa SQL, mas Firestore também sofre injeção quando nome de campo, de coleção ou
operador vem do cliente (`orderBy(req.query.sort)`).

**O core já faz.** Repositórios usam campos literais; o cursor de paginação é validado
(`apps/api/(shared)/lib/pagination.ts`).

**Como verificar.**

```bash
git grep -nE "\.(orderBy|where)\( *[^\"'\`[:space:]F]" -- "apps/api/(shared)/repositories"
```

O comando lista `where`/`orderBy` cujo campo não é um literal (nem `FieldPath`). Cada ocorrência precisa vir
de uma constante ou de uma allowlist validada pelo Zod. Nome de coleção vem do `super(db, "tabela", mapper)`
do repositório, e id de documento passa por `resolveIdFromContext`. Se o fork adicionou SQL (Postgres, Data
Connect), toda consulta é parametrizada: nenhum template string com valor do usuário.

**Aprovado quando** o comando sai vazio ou cada linha tem origem fixa ou allowlist. Gravidade: 🔴.

## 1.5 Autenticação fraca

**Risco.** Senha curta, e-mail não verificado tratado como prova de identidade, sessão que não morre ao
trocar a senha, mensagem que revela se o e-mail existe.

**O core já faz.** Política de 8 a 1024 caracteres na API, verificação de e-mail, revogação de sessão por
`checkRevoked`, resposta igual no pedido de redefinição de senha.

**Como verificar.**

- O fork não baixou a política de senha (`packages/shared/utils/helpers/passwordPolicy.ts`).
- Toda regra nova que confia no e-mail do usuário (convite, domínio da empresa, cobrança) exige
  `emailVerified`.
- Ação sensível nova (trocar dado de cobrança, excluir algo em massa, promover usuário) pede senha atual ou
  login recente.
- No console do Firebase, a proteção contra enumeração de e-mail está ligada (parte 2, item 2.6).

**Aprovado quando** os quatro pontos conferem. Gravidade: 🔴 para regra que autoriza por e-mail não
verificado; 🟡 nos demais casos.

## 1.6 IDOR (acesso a recurso de outra pessoa)

**Risco.** Trocar o id na URL e ver ou alterar o registro de outro usuário ou de outra organização. É a
falha número 1 do OWASP Top 10 2025 (Broken Access Control).

**O core já faz.** Guard em toda rota de negócio, escopo por organização no repositório
(`findInOrganization`) e por dono (`row.userId !== ctx.subjectProfile.id` → 404).

**Como verificar.** Para cada rota com `[id]` criada pelo fork, com duas contas de teste de donos
diferentes:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $ID_TOKEN_DA_CONTA_B" "$API/<recurso>/<id-da-conta-A>"
grep -LE "require(CommonPanel|Admin|Plan|Organization)Api" $(find "apps/api/app/(routes)" -name route.ts)
```

O primeiro comando tem de devolver 404 (nunca 200 nem 403, que confirma a existência). O segundo lista as
rotas sem guard: toda linha dele precisa estar na tabela de rotas públicas de `docs/SECURITY.md`.

**Aprovado quando** as duas conferências passam em todas as rotas novas. Gravidade: 🔴.

## 1.7 Senha guardada no banco

**Risco.** Senha, token ou código em claro no Firestore vira vazamento completo no primeiro acesso indevido
ao banco.

**O core já faz.** Senha vive só no Firebase Auth; o token de convite é guardado como SHA-256.

**Como verificar.**

```bash
git grep -niE "(password|senha|secret|token|otp|pin|apiKey)[A-Za-z]*\s*:" -- "apps/api/(shared)/repositories" "apps/api/(shared)/mappers" "packages/sdk/src/types"
```

**Aprovado quando** nenhum campo persistido guarda segredo em claro; o que precisa ser comparado depois
(código, token de cliente) é guardado como hash. Gravidade: 🔴.

## 1.8 Ataque de força bruta

**Risco.** Tentativas em massa de senha, de código de verificação ou de token de convite.

**O core já faz.** O login por e-mail e senha vai direto ao Firebase, que tem limite próprio; as rotas
públicas de autenticação da API, a troca e a definição de senha estão no orçamento estrito do Arcjet
(item 1.15).

**Como verificar.** Todo endpoint novo que confere um segredo (senha, código, token) está na lista estrita
(`STRICT_RATE_LIMITED_PATHS` em `apps/api/proxy.ts`). Fora dela, um `POST` cai no orçamento padrão, de 60
por minuto, folgado demais para conter tentativa de senha. Com `ARCJET_KEY` preenchida:

```bash
for i in $(seq 1 25); do curl -s -o /dev/null -w '%{http_code}\n' -X POST "$API/<rota>" -H 'content-type: application/json' -d '{}'; done | sort | uniq -c
```

**Aprovado quando** aparecem respostas `429` a partir da 21ª requisição do minuto. Gravidade: 🔴 para rota que
confere segredo sem limite.

## 1.9 Bloquear durante o envio

**Risco.** Duplo clique no "Enviar" cria dois registros, manda dois e-mails ou abre dois checkouts.

**O core já faz.** Os formulários do core desabilitam o botão e mostram carregamento enquanto a mutation
está pendente (`isPending`/`isSubmitting`).

**Como verificar.** No código do fork, todo botão de envio depende do estado da mutation:

```bash
git diff --name-only --diff-filter=d "$BASE"...HEAD -- 'apps/**/*.tsx' | grep -v __tests__ | xargs grep -lE "type=\"submit\"|htmlType=\"submit\"" | xargs grep -LE "isPending|isSubmitting|loading="
```

No navegador, o caso "duplo clique" do item 3.2.

**Aprovado quando** o comando sai vazio e o duplo clique gera uma requisição só. Gravidade: 🔴 se o envio
duplicado cobra, cria registro ou manda e-mail; 🟡 nos demais casos.

## 1.10 CSRF

**Risco.** Um site de terceiro faz o navegador do usuário logado disparar uma ação no produto.

**O core já faz.** O cookie de sessão é `SameSite=Lax`; a API recusa `Origin` fora da allowlist com
`403 AUTH_FORBIDDEN_ORIGIN`, e recusa do mesmo jeito a escrita sem `Origin` que leva o cookie de sessão sem
`Authorization`; o front fala com a API por Bearer token, que não vai sozinho numa requisição de outro
site. As rotas de sessão dos front-ends (`/api/auth/session`, `/session/refresh`, `/custom-token`) exigem
`Origin` do próprio host ou `Sec-Fetch-Site: same-origin`.

**Como verificar.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Origin: https://evil.example' -H 'content-type: application/json' -d '{}' "$API/<rota mutável>"
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Origin: https://evil.example' -H 'content-type: application/json' -d '{"idToken":"x"}' "$APP/api/auth/session"
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Cookie: access-token=x' -H 'content-type: application/json' -d '{}' "$API/<rota mutável>"
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' -d '{"idToken":"x"}' "$APP/api/auth/session"
```

Os quatro devolvem 403. Rota nova do fork que muda estado não pode aceitar só o cookie como credencial sem
conferir a origem.

**Aprovado quando** as quatro chamadas devolvem 403. Gravidade: 🔴.

## 1.11 Upload sem validação

**Risco.** Arquivo executável com extensão de imagem, arquivo gigante, nome de arquivo que escapa do
diretório, link público e permanente para documento privado.

**O core já faz.** `POST /files` confere o tipo real pelos primeiros bytes, limita a 4 MiB, monta o caminho
no servidor com UUID e devolve URL assinada de 15 minutos; o bucket é privado. O teto vale também para corpo
sem `content-length`: a rota conta os bytes enquanto lê e responde `413 UPLOAD_FILE_TOO_LARGE` com
`connection: close` ao passar de 4 MiB mais 64 KiB de envelope. A imagem é gravada sem EXIF (GPS, câmera,
número de série), XMP, IPTC e comentários; ficam o perfil de cor e, no JPEG, a orientação.

**Como verificar.**

```bash
printf 'GIF89a' > /tmp/falso.png
curl -s -H "Authorization: Bearer $ID_TOKEN" -F file=@/tmp/falso.png "$API/files"     # esperado: 415
git grep -nE "getDownloadURL|makePublic|publicRead" -- apps packages
```

**Aprovado quando** o arquivo falso é recusado, o `git grep` sai vazio e todo upload novo do fork passa pelo
mesmo caminho (`POST /files` ou o helper dele). Gravidade: 🔴.

## 1.12 Revelando informação sensível

**Risco.** Stack trace, mensagem crua do provedor, versão do framework ou campo interno na resposta ajudam
quem ataca.

**O core já faz.** A API responde só `{ error: { code } }`; mensagens do Identity Toolkit são mapeadas para
códigos próprios. `GET /auth/me`, `POST /auth/sign-in` e `POST /auth/sign-in/google` devolvem o usuário por
allowlist de cinco campos (`uid`, `type`, `email`, `preferences`, `onboarding`, em `toSessionUser`,
`apps/api/(shared)/mappers/user.mapper.ts`), então campo novo no perfil não sai por elas até alguém
listá-lo. Nenhum dos três apps manda `X-Powered-By` (`poweredByHeader: false` em
`packages/next-config/index.ts`).

**Como verificar.**

```bash
curl -s -X POST -H 'content-type: application/json' -d '{"x":' "$API/<rota>"            # JSON quebrado: só error.code
curl -sI "$API/health" | grep -i "x-powered-by"                                           # esperado: vazio
curl -s -H "Authorization: Bearer $ID_TOKEN" "$API/auth/me" | jq '.data | keys'           # nenhum campo interno
```

Na Vercel, toda resposta sai com `server: Vercel`. Ele vem da plataforma, não traz versão e não conta como
reprovação.

**Aprovado quando** nenhuma resposta traz stack trace, mensagem do provedor ou cabeçalho de versão, e as
respostas das rotas do fork listam só os campos que a tela usa. Gravidade: 🟡 (🔴 se vazar dado de outra
pessoa).

## 1.13 Dependências vulneráveis

**Risco.** Biblioteca com falha conhecida é a porta mais barata para um ataque (OWASP Top 10 2025, A03:
Software Supply Chain Failures).

**Como verificar.**

```bash
pnpm audit --prod
pnpm audit --prod --audit-level=high; echo "saída=$?"
```

**Aprovado quando** não há vulnerabilidade `critical` nem `high` em dependência de produção, ou cada uma tem
justificativa escrita (o caminho vulnerável não é usado) e prazo de atualização. Gravidade: 🔴 para
`critical`/`high` sem justificativa; 🟡 para `moderate`.

## 1.14 Tokens mal configurados

**Risco.** Sessão que dura demais, token que sobrevive à troca de senha, token guardado onde um script
consegue ler.

**O core já faz.** Cookie de sessão `httpOnly` de 5 dias, renovado na metade, com teto absoluto de 30
dias; revogação ao trocar, definir ou redefinir a senha e ao trocar o e-mail; o ID token vai no header
`Authorization`, nunca na URL. Se o Firebase recusar a revogação, essas quatro rotas respondem
`500 AUTH_SESSIONS_NOT_REVOKED` em vez de sucesso, e o "Sair de todos os dispositivos" responde
`500 ACCOUNT_SESSIONS_REVOKE_FAILED` (`revokeUserSessionsOrThrow`, `packages/auth/server.ts`).

**Como verificar.**

- O fork não aumentou `SESSION_ABSOLUTE_MAX_AGE_DAYS` sem motivo escrito.
- Nenhum token em `localStorage`, `sessionStorage` ou URL:
  `git grep -nE "(local|session)Storage\.setItem\([^)]*(token|Token)" -- apps packages`.
- Trocar a senha numa aba encerra a sessão aberta noutro navegador (teste manual).

**Aprovado quando** os três pontos conferem. Gravidade: 🔴 se a troca de senha não encerra as outras
sessões; 🟡 nos demais casos.

## 1.15 Rate limit

**Risco.** Sem limite, um script cria contas em massa, dispara e-mails pela sua conta da Resend e esgota a
cota dos provedores.

**O core já faz.** Dois orçamentos do Arcjet, em janela deslizante de um minuto, no proxy da API
(`apps/api/proxy.ts`). Todo `POST`, `PUT`, `PATCH` e `DELETE` conta no padrão, de 60 por minuto por IP e
pessoa, então rota mutável nova já nasce limitada. Uma lista estrita de caminhos conta no de 20 por minuto
por IP. O webhook da Stripe fica isento. Sem `ARCJET_KEY`, nenhum dos dois roda e a API avisa no boot.
Detalhe em [`docs/SECURITY.md`](../SECURITY.md), "Limite de requisições".

**Como verificar.** A lista estrita de `apps/api/proxy.ts` inclui toda rota nova do fork que é pública, que
manda e-mail, que confere segredo ou que custa dinheiro; rota chamada por provedor com retry está na isenção.
Em produção, `ARCJET_KEY` está preenchida (parte 2, item 2.11), e o comando do item 1.8 devolve 429.

**Aprovado quando** as duas conferências passam. Gravidade: 🔴.

## 1.16 Dados sensíveis expostos

**Risco.** Dado pessoal (e-mail, telefone, IP, documento) em log, em URL, em resposta de outra pessoa ou em
analytics. É vazamento sob a LGPD.

**O core já faz.** `logEvent` só aceita valores primitivos e o log de bloqueio não grava IP; a exportação
de dados é do próprio titular.

**Como verificar.**

```bash
git grep -nE "console\.(log|error|warn|info)\((.*, *)?(req|request|body|user|profile|error|err|e)\)" -- apps packages ':!**/__tests__/**'
git grep -nE "(email|cpf|cnpj|phone|telefone)=" -- 'apps/**/*.ts' 'apps/**/*.tsx' ':!**/__tests__/**'
```

O primeiro acha log com objeto inteiro; o segundo, dado pessoal montado em URL.

**Aprovado quando** nenhum log grava objeto de requisição, de usuário ou de erro inteiro, nenhuma URL leva
dado pessoal, e evento de analytics não leva e-mail nem nome. Gravidade: 🔴 para dado pessoal em URL ou
analytics; 🟡 para log.

## 1.17 SSRF

**Risco.** O servidor busca uma URL que o usuário informou e acaba acessando a rede interna ou o endereço
de metadados da nuvem.

**O core já faz.** O servidor só chama hosts fixos (Identity Toolkit, Stripe, Resend); `images.remotePatterns`
é uma lista fechada. Foto de entidade e avatar aceitam só objeto do bucket ou URL
`https://lh3.googleusercontent.com/...` (`EXTERNAL_IMAGE_HOSTS` em `apps/api/(shared)/lib/entity-photo.ts`),
e nenhum código do servidor busca essas URLs.

**Como verificar.**

```bash
git grep -nE "(fetch|axios\.(get|post)|got)\(" -- "apps/api" "apps/*/app/api" packages ':!**/__tests__/**' ':!packages/sdk/**'
```

Para cada chamada, o host é fixo ou passa por allowlist, e IP privado (`10.`, `172.16-31.`, `192.168.`,
`127.`, `169.254.169.254`) é recusado.

**Aprovado quando** nenhuma chamada aceita URL livre do usuário. Gravidade: 🔴.

## 1.18 Cookies inseguros

**Risco.** Cookie de sessão legível por JavaScript ou enviado por HTTP simples pode ser roubado.

**O core já faz.** O cookie `access-token` é `httpOnly`, `Secure` em produção, `SameSite=Lax`, com
`maxAge`, gravado só pelo servidor. Os cookies de preferência gravados pelo navegador (`setCookie` de
`@repo/shared`) e os de painel (`bp:*`) saem com `Secure` quando a página é HTTPS; o `x-locale` gravado pelo
proxy do `app` e da `web` dura 180 dias e sai com `Secure` quando a requisição chega por HTTPS.

**Como verificar.**

```bash
curl -sI "$APP/<rota que grava cookie>" | grep -i set-cookie
git grep -nE "document\.cookie|setCookie\(|cookies\(\)\.set\(|cookieStore\.set\(" -- apps packages ':!**/__tests__/**'
```

**Aprovado quando** todo cookie de autenticação ou de dado pessoal é `HttpOnly; Secure; SameSite=Lax` (ou
`Strict`) e cookie de preferência (idioma, tema) não carrega dado pessoal. Gravidade: 🔴 para cookie de
sessão sem `HttpOnly` ou `Secure`; 🟡 nos demais casos.

## 1.19 CORS

**Risco.** Uma allowlist com `*` ou que reflete qualquer origem deixa qualquer site ler a resposta da API
com a sessão do usuário.

**O core já faz.** `CORS_ORIGIN` é uma lista fechada, obrigatória em produção, sem coringa e sem
`Access-Control-Allow-Credentials`. Em produção sem a lista, o processo da API encerra no boot com código 1
e a linha `[boot] CORS_ORIGIN is required in production…`.

**Como verificar.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'Origin: https://evil.example' "$API/health"                     # 403
curl -si -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST' "$API/<rota>" | grep -i access-control-allow-origin   # vazio
curl -si -H "Origin: $WEB" "$API/health" | grep -i access-control-allow-origin                              # a origem da landing
```

**Aprovado quando** os três saem como indicado e `CORS_ORIGIN` de produção lista só as origens do próprio
produto. Gravidade: 🔴.

## Registro no relatório

Na seção 1 do [`report-template.md`](report-template.md): status, gravidade e evidência de cada item, mais o
resumo da revisão do código do produto. Achado corrigido durante a etapa conta como ✅ com a nota do que
mudou e em qual commit.
