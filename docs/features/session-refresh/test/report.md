# Relatório de QA — Renovação deslizante da sessão

- **Plano**: [`analyze/plan.md`](../analyze/plan.md) · **Handoff**: [`develop/handoff.md`](../develop/handoff.md) ·
  **Revisão**: [`review/review.md`](../review/review.md)
- **Critérios**: [`criterios-aceite.md`](criterios-aceite.md) · **Evidências**: [`e2e/`](e2e/)
- **Branch**: `auth/feat/session-refresh`, criada pela revisão. O QA não commitou, não criou branch e não
  fez push.
- **Rodada**: autônoma (`/cycle`), sem interação com o usuário

## Resumo

22 critérios: **21 aprovados** e **1 não verificável neste ambiente**. Nenhum reprovado.

O não verificável é a revogação de ponta a ponta, que o emulador de Auth não reproduz. É pré-requisito de
infra externa, não defeito.

O critério 7, a retomada do destino, foi reprovado na primeira rodada de QA e **corrigido pela revisão
depois disso**. A segunda medição está na seção "Critério 7, reavaliado". O relato do defeito original
ficou no fim deste documento, como histórico.

Dois arquivos de teste novos fixam a regressão do laço que deixava a tela de login inalcançável, e a
revisão acrescentou dois casos no arquivo do provider ao corrigir o critério 7. Todos foram conferidos
contra o código quebrado e falham nele.

## Testes

### Executados

| comando | resultado |
|---------|-----------|
Medidos depois da correção do critério 7.

| comando | resultado |
|---------|-----------|
| `pnpm --filter app test` | 380 testes, 53 arquivos |
| `pnpm --filter @repo/auth test` | 101 testes, 8 arquivos |
| `pnpm --filter @repo/internationalization test` | 27 testes, 3 arquivos, paridade verde |
| `pnpm turbo run lint typecheck test --force` | 24/24 tasks, 1325 testes em 134 arquivos |
| `pnpm check` | 607 arquivos, 0 erros |
| `pnpm --filter app typecheck` | limpo |

Base declarada pela revisão antes desta etapa: `pnpm check` 605/0, turbo 24/24, 1315 testes em 132
arquivos. Os dois arquivos deste QA somam 8 testes e levam a 1323 em 134 arquivos; os dois casos que a
revisão acrescentou ao corrigir o critério 7 levam a 1325. Nenhum teste existente foi editado, desativado
ou afrouxado, nem por mim nem na correção.

### Criados

**`apps/app/__tests__/sessionExpiredSignOut.test.tsx`**, 6 casos escritos aqui. Monta o `AuthProvider`
real com `fetch`, `logout` e o router mockados. Cobre o caminho da regressão (a renovação responde
`AUTH_NO_SESSION`, a gravação do cookie responde `AUTH_SESSION_EXPIRED`, o provider desloga e navega), a
recusa direta na renovação, o alerta único sob dois callbacks concorrentes, e os três casos em que falhar
não desloga ninguém: 500, erro de rede e renovação dispensada pelo limiar. A revisão acrescentou dois
casos no mesmo arquivo ao corrigir o critério 7: destino do proxy preservado quando a recusa chega na tela
de login, e destino de outra origem descartado.

**`apps/app/__tests__/signInPersistedSessionRedirect.test.tsx`**, 2 casos. Renderiza o `SignInForm` com
sessão persistida: com 401 na gravação do cookie ele não navega; com 200 navega para o destino resolvido.

Os dois ficam em `apps/app/__tests__` porque é onde vivem o jsdom e a testing-library. A `packages/auth`
roda Vitest em ambiente `node` e não declara `react-dom` nem `@testing-library/react`; mover o teste para
lá custaria duas dependências novas num pacote compartilhado para provar o mesmo comportamento.

O teste do provider mocka `next/navigation` pelo caminho da cópia de Next que a `packages/auth` pina
(`15.1.3`), e não pelo especificador nu. O bundler colapsa as duas cópias em uma; o resolvedor do Vitest,
não. O arquivo traz um comentário explicando isso na linha do mock.

### Verificação de que os testes pegam a regressão

Com o tratamento de `AUTH_SESSION_EXPIRED` removido do `catch` de `applySignedInUser`, o primeiro caso de
`sessionExpiredSignOut` falha e os outros cinco passam. Com o guard de 401 removido do efeito do
`SignInForm`, o primeiro caso de `signInPersistedSessionRedirect` falha. Os dois arquivos de produção
foram restaurados byte a byte depois da checagem, conferidos com `diff`.

Depois da correção do critério 7, repeti a mutação no ponto novo: trocando `expiredSessionOrigin` de volta
pelo `window.location.pathname`, só os dois casos acrescentados pela revisão falham, e os meus seis passam
verdes. A cobertura dos dois conjuntos é complementar, e por isso não escrevi caso adicional: os meus
provam que a sessão morta desloga sem laço, os dela provam para onde a navegação aponta.

### Decisões de custo

Nenhum teste novo exige emulador ou aplicação de pé. O comportamento em teste é do cliente, ou seja, o que
o provider faz com o `error.code` que recebe, e de um componente. Os dois são exercitáveis com `fetch`
mockado.

Por rota e módulo tocado, o que já cobria e por que não acrescentei:

- `sessionRefreshPOST`, `sessionPOST` e `customTokenPOST`: `packages/auth/__tests__/sessionRefreshRoute.test.ts`
  cobre origem cruzada, corpo inválido, cookie ausente, cookie que não verifica, throttle, revogação,
  teto, ID token recusado e a claim de origem no bootstrap. Acrescentar caso aqui seria repetição.
- `session.ts` (teto, throttle, `mintSessionCookie`): `sessionAbsoluteCap.test.ts`, 23 casos, incluindo os
  valores-limite da variável de ambiente.
- Arquivos de rota da `apps/app` e da `apps/web`: re-exports de uma linha. Um teste ali provaria que o
  `export` existe, o que o typecheck já prova.
- i18n: o teste de paridade falha sozinho se um código de erro não entrar nos três idiomas.

## Critérios de aceite, item a item

Legenda: ✅ aprovado · ❌ reprovado · 🔒 não verificável neste ambiente.

| # | critério | status | verificado por |
|---|----------|--------|----------------|
| 1 | A sessão em uso atravessa o prazo antigo de expiração | ✅ | e2e HTTP + cookie lido no browser |
| 2 | A renovação não dispara em toda navegação | ✅ | unit da rota + e2e browser |
| 3 | O teto absoluto derruba quem está ativo | ✅ | e2e HTTP + e2e browser |
| 4 | A janela conta da autenticação original, não da última renovação | ✅ | e2e HTTP + unit |
| 5 | O teto não é contornável pelo `POST /api/auth/session` | ✅ | unit da rota + e2e browser |
| 6 | A recusa definitiva não deixa a tela de login inalcançável | ✅ | teste novo + e2e browser |
| 7 | A retomada do destino depois do estouro | ✅ | e2e browser, na segunda medição |
| 8 | O bootstrap de SSO não reinicia o teto | ✅ | unit, 3 casos, mais o browser na revisão |
| 9 | A renovação respeita a revogação | 🔒 | unit cobre; o emulador não reproduz |
| 10 | Falhar em renovar não desloga ninguém | ✅ | testes novos: 500, rede, limiar |
| 11 | A rota recusa origem cruzada e corpo inválido | ✅ | curl na aplicação de pé + unit |
| 12 | ID token recusado não derruba uma sessão válida | ✅ | unit + browser na revisão |
| 13 | Sem cookie, a renovação não estabelece sessão | ✅ | curl na aplicação de pé + unit |
| 14 | Modo degradado sem a variável de ambiente | ✅ | unit, 2 casos |
| 15 | Valores-limite da variável de ambiente | ✅ | unit, 7 casos |
| 16 | Dois disparos concorrentes produzem um aviso só | ✅ | teste novo + e2e browser |
| 17 | A autorização não muda | ✅ | e2e browser (comum e admin) + suíte da `apps/api` |
| 18 | A posse dos recursos continua valendo | ✅ | suíte da `apps/api`, 532 testes, mais o diff |
| 19 | O modo de produto não altera o comportamento | ✅ | leitura do diff |
| 20 | A mensagem de sessão encerrada existe nos três idiomas | ✅ | teste de paridade + alerta na tela |
| 21 | O alerta e a tela de login são legíveis em light, dark e mobile | ✅ | screenshots |
| 22 | Login, SSO e logout continuam funcionando | ✅ | e2e browser: login, logout e admin |

### Detalhe dos itens que precisam de contexto

**3, o teto derruba quem está ativo, com atraso limitado pelo throttle.** A recusa acontece, mas não no
instante em que o teto estoura: o throttle roda antes da checagem, então uma renovação pedida antes do
limiar responde 200 `{"refreshed": false}` sem olhar o teto. Medido com janelas de 302 s: aos 317 s de
sessão, com o teto vencido aos 302 s, a navegação seguiu normalmente, e a recusa veio aos 345 s, quando o
limiar de metade da vida do cookie foi atingido. O cookie em mãos continua valendo até expirar. Na
configuração padrão isso significa que a sessão pode sobreviver ao teto por até metade da vida do cookie,
ou seja, 32,5 dias com cookie de 5 dias e teto de 30. A revisão registrou a mesma ordem de execução como
🟡 e a manteve por custo; aqui fica a medida do efeito.

**7, aprovado na segunda medição.** Ver "Critério 7, reavaliado".

**8, SSO.** Os três casos de `customTokenPOST` em `sessionRefreshRoute.test.ts` cobrem o repasse da claim
`sessionAuthTime`, a preferência dela sobre o `auth_time` reescrito e a recusa com o teto estourado. O
percurso no browser entre as duas aplicações é o da revisão; nesta rodada a `apps/web` não foi subida.

**9, não verificável.** `verifySessionCookie(cookie, true)` aceita o cookie depois de
`revokeRefreshTokens` no emulador de Auth, com e sem o código deste repositório no caminho, conforme o
probe isolado registrado no `develop/handoff.md`. O código faz a coisa certa: `session-routes.ts:112-115`
chama `getSessionFromCookie` com `checkRevoked` antes do mint e limpa o cookie quando o provedor recusa, e
o caso está coberto por teste unitário que força a rejeição. Verificar de verdade exige um projeto
Firebase real. Não é regressão desta tarefa: `getUserFromSessionCookie`, que o `apps/app/proxy.ts` usa em
toda navegação autenticada, faz a mesma chamada e é afetado do mesmo jeito.

**18 e 19.** O diff não toca nenhum arquivo de `apps/api`, então guard, repositório e checagem de posse
seguem idênticos, com os 532 testes da `apps/api` verdes. Nenhum caminho da feature consulta
`NEXT_PUBLIC_PRODUCT_MODE`: as únicas ocorrências de "subscription" e de modo de produto no diff estão em
documentação e no backlog de specs.

**22, login com Google não foi exercitado.** Exige conta Google real, que o emulador não fornece. O
caminho do cliente é o mesmo `onAuthSuccess` do login com senha, que foi percorrido.

## Critério 7, reavaliado

A primeira rodada reprovou este critério e a revisão corrigiu o código. A reverificação abaixo é minha, com
o mesmo repro, ambiente novo e a medição refeita do zero.

O que mudou no código: `packages/auth/provider.tsx:72-82` ganhou `expiredSessionOrigin`, que lê o
`redirect` já presente na URL e só cai no pathname quando ele não existe. O valor herdado passa por
`postAuthRedirectTarget`, o guard de open-redirect que o login já usava, então nenhum sanitizador novo
entrou. Se o destino resolve para o próprio sign-in, a navegação vai sem query.

Medição, com `SESSION_COOKIE_MAX_AGE_DAYS` e `SESSION_ABSOLUTE_MAX_AGE_DAYS` em `0.0035` (302 s):

1. Login como `user@example.com`, navegação até `/pt-br/entities`.
2. 314 s sem tocar na aba, de modo que o cookie expirasse junto com o teto.
3. Recarga de `/pt-br/entities`.

Resultado: a URL fica em `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities` e **permanece lá** depois que o
cliente navega, onde antes virava `?redirect=%2Fpt-br%2Fsign-in`. A rede registra duas requisições,
`refresh` 401 e `session` 401, e para. Autenticando ali, a sessão volta para `/pt-br/entities` com a
listagem carregada (screenshots `11` e `12`).

O comportamento anterior, para registro: `handleSessionExpired` montava o destino com
`window.location.pathname`, que na tela de login já é `/pt-br/sign-in`, e o destino original se perdia.
Consequência medida na primeira rodada: depois de autenticar, a pessoa caía em `/pt-br`.

## Validação executável

Ambiente: emuladores de Auth (9099) e Firestore (8080) com `JAVA_HOME` no `openjdk@21` do brew, `pnpm
seed`, `apps/api` (3002) e `apps/app` (3000). As variáveis de emulação e as duas janelas de sessão em
`0.0035` foram exportadas no shell, sem tocar nos `.env` do usuário. A `apps/web` não foi subida.

### Ciclo por HTTP

```
t+0   s  session  200  {"ok":true}                                  Max-Age=302
t+1   s  refresh  200  {"refreshed":false}
t+161 s  refresh  200  {"refreshed":true}                           Max-Age=302
t+321 s  refresh  401  {"error":{"code":"AUTH_SESSION_EXPIRED"}}    Max-Age=0
```

A recusa em `t+321` chega com o cookie renovado em `t+161` ainda válido: é a prova de que a janela conta
da autenticação original. A requisição de `t+321` também mostra que a sessão passou do prazo em que o
cookie original teria expirado, que é o valor que a feature entrega.

Recusas conferidas na aplicação de pé:

```
Origin: http://evil.example        403  {"error":{"code":"AUTH_FORBIDDEN_ORIGIN"}}
corpo {}                           400  {"error":{"code":"AUTH_MISSING_TOKEN"}}
corpo "not-json"                   400  {"error":{"code":"AUTH_MISSING_TOKEN"}}
sem cookie                         401  {"error":{"code":"AUTH_NO_SESSION"}}
```

### Percurso no browser

Login com `user@example.com`, dashboard com os dados da API (4 entidades, 3 ativas) e listagem de
entidades carregada pelo `apiClient`. A sequência de rede no login é `refresh` 401, `session` 200,
`refresh` 200, e navegar para `/pt-br/entities` não produziu nenhuma gravação de cookie nova.

Teto estourado com o cookie já expirado, que é o cenário do laço corrigido na revisão: a tela chega em
`/pt-br/sign-in?redirect=%2Fpt-br%2Fentities`, mostra um alerta, apenas um, com "Sua sessão expirou. Entre
novamente para continuar.", renderiza o formulário, e a rede registra exatamente duas requisições,
`refresh` 401 e `session` 401, e para. Em 15 s de observação não apareceu requisição nova e a URL não
mudou. A segunda passagem por esse cenário, já com o critério 7 corrigido, manteve o `?redirect=` apontando
para `/pt-br/entities` e o login seguinte devolveu a listagem.

Teto estourado com o cookie ainda válido: o cookie foi renovado aos 182 s de sessão (`iat - auth_time =
182`, `exp = iat + 302`), a navegação aos 317 s passou porque o throttle ainda barrava a checagem, e aos
345 s a renovação respondeu 401 e a pessoa foi para `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities`.
Autenticando de novo ali, voltou para `/pt-br/entities`.

Logout encerra a sessão e remove o cookie: `access-token` some do jar. Login como `admin@example.com` cai
em `/pt-br/admin` com o painel administrativo carregado.

### Screenshots

Em [`e2e/`](e2e/):

| arquivo | o que mostra |
|---------|--------------|
| `01-sign-in.png` | tela de login, tema dark |
| `02-dashboard-apos-login.png` | dashboard com os dados da API depois do login |
| `03-entidades-sessao-ativa.png` | listagem de entidades com a sessão ativa |
| `04-teto-estourado-alerta.png` | alerta de sessão expirada, um só, com o formulário atrás, em dark |
| `05-sign-in-light.png` | tela de login, tema light |
| `06-sign-in-mobile-light.png` | tela de login em 390x844 |
| `07-teto-estourado-usuario-ativo.png` | navegação passando aos 317 s por causa do throttle |
| `08-teto-estourado-redirect-preservado.png` | bounce para o sign-in com `?redirect=%2Fpt-br%2Fentities` |
| `09-retomada-do-destino.png` | de volta em `/pt-br/entities` depois de autenticar |
| `10-admin-apos-login.png` | painel admin depois do login como `admin@example.com` |
| `11-destino-preservado-apos-correcao.png` | sign-in com `?redirect=%2Fpt-br%2Fentities` intacto depois da correção |
| `12-retomada-do-destino-apos-correcao.png` | listagem de entidades de volta, depois de autenticar |

### Ambiente

Foram duas subidas de ambiente, uma por rodada de medição. Nas duas, todas as portas estavam livres no
início: 3000, 3001, 3002, 3003, 4000, 4001, 8080 e 9099. Emuladores, `apps/api` e `apps/app` foram subidos
aqui, com os PIDs guardados, e encerrados no fim. Nada foi reutilizado do usuário. Conferência final nas
duas: 3000, 3001, 3002, 3003, 4000, 4001, 8080, 9099, 4400, 4500 e 9150 sem processo ouvindo.

## Dados de QA

Nenhuma conta nova foi criada. O percurso usou `user@example.com` e `admin@example.com` do `pnpm seed`,
com a senha `demo1234` que já está documentada em [`docs/SETUP.md`](../../../SETUP.md). O estado vive só
nos emuladores e morreu com o processo, então não há o que limpar. Nenhum harness temporário ficou no
repositório.

## Lacunas

- **Revogação de ponta a ponta**, critério 9: exige projeto Firebase real.
- **Login com Google**: exige conta Google. O caminho do cliente é o mesmo do login com senha.
- **Estouro do teto na `apps/web`**: coberto pela revisão, não repetido aqui.
- **Frequência da renovação em produção**: o driver é `onIdTokenChanged`, que dispara de hora em hora. Com
  janelas de 302 s não dá para observar o comportamento real de uma sessão de cinco dias. O que foi
  verificado é a rota e o cliente reagindo às três respostas possíveis.

## Pendências de infra

Uma, e não bloqueia: `SESSION_ABSOLUTE_MAX_AGE_DAYS` na Vercel, só se o fork quiser um teto diferente de
30 dias. Ausente ou vazia, a feature funciona com o padrão. Já registrada em
[`docs/PRE-PRODUCTION.md`](../../../PRE-PRODUCTION.md).
