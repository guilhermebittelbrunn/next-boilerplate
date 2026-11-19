# Parte 2: infra e hardening

Confere que os controles de segurança estão **ligados no ambiente de produção**, e não só escritos no
código. Boa parte deles mora fora do repositório, no painel de algum serviço: GitHub, Vercel, Firebase e
Google Cloud, Arcjet, Stripe e Resend. Um fork que pula esta parte entrega um código seguro rodando numa
configuração aberta.

Visão geral da etapa e regras de status em [`README.md`](README.md). A parte 1
([`01-security-review.md`](01-security-review.md)) procura falha no código; esta parte confere a
configuração. Quando um item tem as duas faces, a verificação de código está lá e aqui fica só o que é de
ambiente.

## Quem faz

Os passos de console podem ser feitos por uma pessoa com acesso de administrador aos serviços, ou pelo
**Claude Cowork** dirigindo o navegador com o prompt pronto em
[`cowork-infra-prompt.md`](cowork-infra-prompt.md). Nos dois casos, quem tem a senha faz o login, e
nenhum valor de segredo é copiado para o relatório, para a conversa ou para o repositório.

Nos comandos abaixo, `$WEB`, `$APP` e `$API` são as URLs de produção (ou da preview que vai virar
produção), `$OWNER/$REPO` é o repositório no GitHub e `$PROJECT` é o id do projeto Firebase.

## 2.1 Esconder as chaves de API

**Por quê.** Chave secreta no navegador ou no repositório é chave publicada.

**Onde.** Repositório (item 1.1) e painel da Vercel.

**O que fazer.** Toda chave secreta (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_TOKEN`,
`ARCJET_KEY`, `FIREBASE_ADMIN_PRIVATE_KEY`, `FIREBASE_WEB_API_KEY`) fica só nas variáveis da Vercel,
marcada como **Sensitive**, e só no projeto que a usa (a API usa quase todas; `app` e `web` não precisam
das chaves da Stripe nem da Resend). Production e Preview têm valores separados, e a Preview nunca usa
chave `live` da Stripe.

**Aprovado quando** o item 1.1 passou e o painel da Vercel mostra cada segredo como Sensitive, só no
projeto certo. Gravidade: 🔴.

## 2.2 Limpar segredos do Git

**Por quê.** Apagar o arquivo não apaga o segredo: ele continua no histórico, e repositório público é
varrido por robôs que procuram chaves.

**Como verificar.**

```bash
gitleaks git --redact -v .          # brew install gitleaks, ou: docker run --rm -v "$PWD:/repo" zricethezav/gitleaks git --redact /repo
gh api "repos/$OWNER/$REPO/secret-scanning/alerts" --jq '.[] | select(.state=="open") | [.number, .secret_type, .created_at] | @tsv'
```

O `--redact` impede que o valor apareça na saída. Confira também se o repositório tem refs locais fora das
branches (checkpoints de ferramentas, stashes) antes de qualquer `git push --all`.

**O que fazer com um achado.** Primeiro **rotacione** o segredo no serviço de origem (a chave antiga
continua válida enquanto não for revogada). Só depois decida se vale reescrever o histórico; num
repositório público, considere o valor exposto de qualquer jeito. Feche o alerta do GitHub com o motivo
"revoked".

**Aprovado quando** o `gitleaks` não acha segredo real (fixture de teste com valor falso não conta) e não
há alerta aberto de secret scanning. Gravidade: 🔴.

## 2.3 Chave pública do banco restrita

**Por quê.** A chave web do Firebase (`NEXT_PUBLIC_FIREBASE_API_KEY`) vai para o navegador por desenho, e
o Firebase diz que ela não precisa ser tratada como segredo **se estiver restrita**. Sem restrição,
qualquer um a usa de qualquer lugar contra qualquer API habilitada no projeto.

**Onde.** Google Cloud Console › APIs e serviços › Credenciais.

**O que fazer.**

- **Chave do navegador:** restrição por referenciador HTTP (`https://<dominio-da-landing>/*`,
  `https://<dominio-do-painel>/*`, `https://<projeto>.firebaseapp.com/*`) e restrição de API (Identity
  Toolkit API e Token Service API, mais o que o fork usar no cliente).
- **Chave do servidor** (`FIREBASE_WEB_API_KEY`, usada pela API para o Identity Toolkit): uma chave
  separada, só com restrição de API. Ela não pode ter restrição de referenciador, porque a chamada sai do
  servidor sem o cabeçalho `Referer`.

**Como verificar.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' -d '{}' \
  "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=<CHAVE_DO_NAVEGADOR>"
```

Sem `Referer`, a chave restrita responde 403. Uma resposta 400 significa que a chave aceita chamada de
qualquer origem.

**Aprovado quando** a chamada devolve 403 e o login continua funcionando no domínio de produção.
Gravidade: 🟡.

## 2.4 Regras de acesso ao banco ("RLS")

**Por quê.** No Firestore e no Storage, o equivalente ao RLS do Postgres são as security rules. O core
usa `deny-all` nas duas: só a API, pelo Admin SDK, lê e grava. **Um projeto Firebase novo nasce aberto até
as rules serem publicadas.**

**Onde.** Repositório (`firestore.rules`, `storage.rules`) e Firebase CLI.

**O que fazer.**

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage --project "$PROJECT"
```

A ordem e o rollback estão em [`docs/SECURITY.md`](../SECURITY.md), seção "Publicar rules e índices".

**Como verificar.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/user?key=<CHAVE_DO_NAVEGADOR>"
```

**Aprovado quando** a leitura direta devolve 403 e as rules publicadas no console batem com o arquivo
versionado. Gravidade: 🔴.

## 2.5 Criptografia de dados

**Por quê.** Dado em trânsito e em repouso precisa estar cifrado; dado pessoal sensível (saúde, documento,
dado financeiro) pede mais que o padrão.

**O core já faz.** Todo tráfego é HTTPS (item 2.19); Firestore e Storage cifram em repouso por padrão no
Google Cloud; token de convite é guardado como hash.

**O que conferir.** Se o produto guarda dado pessoal sensível no sentido da LGPD (art. 5º, II), cada campo
desses tem cifra de aplicação ou chave gerenciada (Cloud KMS) decidida e documentada, e o
[`ROPA.md`](../ROPA.md) do fork registra o tratamento.

**Aprovado quando** o produto não guarda dado sensível (➖), ou guarda e a decisão de cifra está
documentada. Gravidade: 🔴 para dado sensível sem decisão.

## 2.6 Autenticação no servidor

**Por quê.** Toda decisão de acesso precisa ser tomada no servidor; o console do Firebase guarda
configurações que mudam o que o servidor aceita.

**Onde.** Firebase Console › Authentication › Settings.

**O que fazer.**

- **Proteção contra enumeração de e-mail** ligada.
- **Domínios autorizados** só com os domínios de produção e o `<projeto>.firebaseapp.com`; `localhost`
  sai do projeto de produção.
- Provedores de login ligados só os que o produto usa.
- No código, o item 1.6 passou (toda rota de negócio com guard).

**Aprovado quando** os quatro pontos conferem. Gravidade: 🔴 para domínio desconhecido autorizado; 🟡 nos
demais casos.

## 2.7 Restringir acessos

**Por quê.** Quem não precisa de acesso não deveria ter, e conta com acesso amplo precisa de segundo fator.

**O que conferir.**

| Serviço | Regra |
|---------|-------|
| GitHub | Branch `main` protegida (PR obrigatório, checks `verify` e `e2e`, sem force-push); colaboradores com o menor papel que resolve; 2FA obrigatório na organização |
| Vercel | Membros do time com o menor papel; previews protegidas por Vercel Authentication |
| Firebase / GCP | IAM só com quem opera o produto; a service account da API sem papel de dono |
| Stripe | Chave restrita (`rk_`) com só as permissões que a API usa, no lugar da chave secreta completa; 2FA no time |
| Resend | Chave de API com "Sending access" limitada ao domínio, não "Full access" |
| Produto | Lista de admins do painel conferida; nenhuma conta de teste com papel de admin em produção |

**Aprovado quando** cada linha confere. Gravidade: 🔴 para `main` sem proteção ou admin de teste em
produção; 🟡 nos demais casos.

## 2.8 Bloquear mass assignment

**Por quê.** Se o schema de escrita aceita qualquer chave, o cliente manda `role: "admin"` junto e a API
grava.

**O que conferir.** Todo schema Zod de criação e atualização do fork usa `.strict()` (ou o handler monta o
objeto gravado campo a campo), e nenhum aceita do corpo campo de dono ou de permissão (`userId`,
`organizationId`, `role`, `type`, `disabled`), salvo a rota de admin feita para isso, como a edição de
usuários:

```bash
for f in $(git ls-files "apps/api/(shared)/validation/*.ts"); do
  o=$(grep -c "z\.object(" "$f"); s=$(grep -c "\.strict()" "$f")
  [ "$o" -gt "$s" ] && echo "$f: $o objetos, $s com strict"
done
```

**Aprovado quando**, em cada arquivo listado, os objetos sem `.strict()` são schemas de leitura (query,
paginação) ou de escrita cujo handler monta o objeto gravado campo a campo. Gravidade: 🔴.

## 2.9 Proteger cookies

**Por quê.** O cookie de sessão é a credencial do usuário no navegador.

**Como verificar** em produção, depois de entrar:

```bash
curl -sI "$APP/<qualquer tela logada>" -H "Cookie: access-token=<valor do navegador>" | grep -i set-cookie
```

Ou no DevTools, aba Application › Cookies.

**Aprovado quando** `access-token` é `HttpOnly`, `Secure`, `SameSite=Lax`, com `Domain` igual ao domínio
pai do produto (`SESSION_COOKIE_DOMAIN`) e prazo coerente com a política de sessão. Gravidade: 🔴.

## 2.10 Hash nas senhas

**Por quê.** Senha só pode existir como hash forte, gerado por quem sabe fazer isso.

**O core já faz.** Senha vive no Firebase Auth, que guarda hash com scrypt; o core nunca recebe senha para
guardar.

**O que conferir.** O item 1.7 passou e o fork não criou cadastro paralelo com senha própria.

**Aprovado quando** o item 1.7 passou. Gravidade: 🔴.

## 2.11 Rate limit ligado

**Por quê.** O limite do core só funciona com a chave do Arcjet preenchida.

**O que fazer.** Criar o site no Arcjet e preencher `ARCJET_KEY` (prefixo `ajkey_`) nos três projetos da
Vercel, em Production. Opcional: regra de rate limit no Firewall da Vercel para as rotas públicas.

**Como verificar.** O boot da API não registra o aviso `rate limiting is DISABLED`, e o comando do item 1.8
devolve 429 depois da 20ª requisição do minuto.

**Aprovado quando** as duas conferências passam. Gravidade: 🔴.

## 2.12 Proteção contra bots

**Por quê.** Cadastro e formulário de contato são os alvos favoritos de robô: contas falsas e caixa de
suporte lotada.

**O que fazer.** Com a `ARCJET_KEY` preenchida, o bloqueio de bots do Arcjet roda na borda do painel e
da landing. Opcional, conforme o risco do produto: Firebase App Check com reCAPTCHA Enterprise, e o bot
protection do Firewall da Vercel.

**Como verificar.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -A 'python-requests/2.31' "$WEB/pt-br"     # esperado: 403
curl -s -o /dev/null -w '%{http_code}\n' -A 'python-requests/2.31' "$APP/pt-br/sign-in"
```

**Aprovado quando** os dois devolvem 403 e um navegador comum continua entrando. Gravidade: 🟡.

## 2.13 Consultas parametrizadas

Verificação de código: item 1.4. Aqui só se confirma que nenhum banco novo (Postgres, Data Connect, banco
de outro provedor) entrou sem acesso pela API e sem consulta parametrizada. Gravidade: 🔴.

## 2.14 Validação das entradas

Verificação de código: itens 1.2 e 1.3. Aqui só se confirma que o teto de corpo (100 KiB no
`parseRequestJson`, 4 MiB no upload) não foi aumentado sem motivo escrito. Gravidade: 🟡.

## 2.15 Vazamento de conteúdo

**Por quê.** Source map, cabeçalho de versão, painel indexado e arquivo esquecido na pasta pública contam
a quem ataca como o produto é feito.

**Como verificar.**

```bash
curl -sI "$WEB/pt-br" | grep -i "x-powered-by"
curl -s "$WEB/pt-br" | grep -oE '/_next/static/[^"]+\.js' | head -1 | xargs -I{} curl -s -o /dev/null -w '%{http_code}\n' "$WEB{}.map"   # esperado: 404
curl -sI "$APP/pt-br/sign-in" | grep -i x-robots-tag
ls apps/*/public 2>/dev/null
```

**Aprovado quando** não há `X-Powered-By`, o `.map` responde 404, o painel e a API respondem `noindex`
(item 3.9) e as pastas `public/` têm só o que deve ser público. Gravidade: 🟡.

## 2.16 Restringir upload

**Por quê.** O bucket do Cloud Storage é a outra porta para os arquivos dos usuários.

**Onde.** Google Cloud Console › Cloud Storage › bucket do produto. Só se o produto usa upload.

**O que fazer.** Prevenção de acesso público **aplicada** (enforced), acesso uniforme no nível do bucket,
nenhum `allUsers` nem `allAuthenticatedUsers` no IAM, e `storage.rules` publicadas (item 2.4).

**Como verificar.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' "https://storage.googleapis.com/<bucket>/<um objeto>"   # esperado: 403
```

**Aprovado quando** o objeto responde 403 sem URL assinada e o item 1.11 passou. Gravidade: 🔴.

## 2.17 Respostas da API enxutas

Verificação de código: item 1.12. Aqui, em produção, liste as chaves que `GET /auth/me` e as rotas do
fork devolvem e confira que nenhum campo interno (ids de cobrança, claims, carimbos de revogação) chega a
quem não precisa dele. Gravidade: 🟡.

## 2.18 Cabeçalhos de segurança

**Por quê.** Os cabeçalhos fecham classes inteiras de ataque no navegador: clickjacking, sniffing de tipo,
vazamento de referência, conexão sem TLS.

**Como verificar.**

```bash
for u in "$WEB/pt-br" "$APP/pt-br/sign-in" "$API/health"; do
  echo "== $u"
  curl -sI "$u" | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy|cross-origin|x-powered-by'
done
```

Complemente com [securityheaders.com](https://securityheaders.com/) nos três domínios.

**Aprovado quando** os três respondem `Strict-Transport-Security`, `Content-Security-Policy` (na landing
pode ser `Report-Only`, ver [`PRE-PRODUCTION.md`](../PRE-PRODUCTION.md) item 10), `X-Content-Type-Options:
nosniff`, `Referrer-Policy` e proteção contra frame (`frame-ancestors` ou `X-Frame-Options`), e nenhum
responde `X-Powered-By`. Toda origem de terceiro que o fork acrescentou está na CSP do app que a carrega.
Gravidade: 🔴 se faltar HSTS ou CSP no painel; 🟡 nos demais casos.

## 2.19 Forçar HTTPS

**Como verificar.**

```bash
curl -sI "http://<dominio-da-landing>" | head -3    # esperado: 301/308 para https
curl -sI "$WEB/pt-br" | grep -i strict-transport-security
```

**Aprovado quando** todo domínio do produto redireciona HTTP para HTTPS, o HSTS tem `max-age` de pelo
menos um ano, e nenhuma URL de produção em `.env` ou no código começa com `http://`. Entrar na lista de
preload do HSTS (hstspreload.org) é opcional e difícil de desfazer; só com o domínio inteiro, subdomínios
incluídos, servido em HTTPS. Gravidade: 🔴.

## 2.20 Varredura de dependências

**Por quê.** Dependência vulnerável aparece toda semana. A parte 1 mede o estado no dia da entrega; esta
parte garante que alguém fica sabendo da próxima.

**Onde.** GitHub › Settings › Code security, e o CI.

**O que fazer.**

- Dependabot alerts e Dependabot security updates ligados.
- Secret scanning e push protection ligados.
- Varredura no CI: `pnpm audit --prod --audit-level=critical` (ou o que a spec do core entregar) num job
  que reprova a PR.
- Opcional: CodeQL em "default setup".

**Como verificar.**

```bash
gh api "repos/$OWNER/$REPO" --jq '.security_and_analysis'
gh api "repos/$OWNER/$REPO/vulnerability-alerts" -i | head -1     # 204 = alertas ligados
```

**Aprovado quando** alertas e atualizações de segurança do Dependabot, secret scanning e push protection
estão ligados, e existe uma varredura que roda sozinha. Gravidade: 🟡.

## Registro no relatório

Na seção 2 do [`report-template.md`](report-template.md): status e evidência de cada item, e quem fez a
configuração de console. Evidência de console é escrita ("chave do navegador com 3 referenciadores e 2
APIs"), nunca o valor da chave.
