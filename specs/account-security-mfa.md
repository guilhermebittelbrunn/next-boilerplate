---
id: account-security-mfa
title: "MFA, sessões ativas e política de senha"
status: in-progress
value: médio
effort: M
audience: confianca
area: [apps/api, apps/app, packages/auth, packages/design-system, packages/internationalization]
mode: ambos
depends_on: [account-settings]
contends_on: [packages/auth/server.ts, packages/auth/session.ts, packages/auth/session-routes.ts, apps/api/(shared)/lib/resolve-api-actor.ts]
feature: account-security-mfa
updated: 2026-09-30
---

# MFA, sessões ativas e política de senha

## Problema

Hoje a conta de um usuário do fork vale exatamente o que vale a senha dele — e a senha pode ter **seis
caracteres quaisquer**. Não há segundo fator, não há como ver onde a conta está conectada, e não há como
derrubar um acesso específico: sair em um dispositivo derruba todos os outros, sem que o usuário saiba
nem tenha pedido.

~~Pior: o encerramento **não é imediato para todo mundo**.~~ **Essa parte do problema foi resolvida em
2026-09-15** (ver abaixo) — o que resta é a falta de **granularidade** e de **visibilidade**, não a de
eficácia.

## O que já existe no repo

- `packages/auth/server.ts:323` — `revokeUserSessions` existe **e está em uso**: `sessionDELETE`
  (`packages/auth/session-routes.ts:126`) o chama em `:132`, montado em
  `apps/app/app/api/auth/session/route.ts:13` e `apps/web/app/api/auth/session/route.ts:12`, alcançado pelo
  botão de sair (`apps/app/shared/components/ui/ProfileDropdown.tsx:81` →
  `packages/auth/provider.tsx:363-364`, a mutation `signOutMutation`/`mutationFn: logout`).
  ⚠️ *Âncoras recorrigidas em 2026-09-17: a PR #20 acrescentou ~90 linhas a `server.ts` e ~130 a
  `session-routes.ts`, deslocando todas as referências deste bloco. É a segunda vez que ele envelhece por
  inserção no meio de arquivo alheio.* Não é código morto — **o efeito colateral é que todo logout é um
  "sair de todos os dispositivos"**, sem granularidade e sem aviso ao usuário.
- ✅ **A janela de revogação foi FECHADA em 2026-09-15 pela entrega de `account-settings` (PR #12).**
  Esta seção afirmava o contrário até esta auditoria; a afirmação antiga **é falsa desde `a4df5ed`**.
  `packages/auth/server.ts:180` de fato segue chamando `verifyIdToken(token)` **sem** o segundo argumento —
  mas a revogação passou a ser checada **manualmente**, logo depois: `:181` carrega o `UserRecord` e `:182`
  aplica `isMintedBeforeRevocation` (`:153-166`), que recusa o token quando `decodedToken.auth_time` é
  anterior a `user.tokensValidAfterTime`. O registro do usuário já estava carregado, então isso não custa
  round trip extra — o porquê está escrito em `:147-152`. O caminho do cookie já fazia o certo com
  `verifySessionCookie(sessionCookie, true)` (`:298-301`, dentro de `getSessionFromCookie:289`).
  Cobertura: 9 casos em `packages/auth/__tests__/serverSessionRevocation.test.ts`.
  A ordem em `apps/api/(shared)/lib/resolve-api-actor.ts` **continua** bearer (`:23-32`) antes do cookie
  (`:34-37`) — mas isso **deixou de ser um furo**, porque o primeiro ramo agora recusa token revogado.
  > ⚠️ **Armadilha de conferência, pela quarta rodada seguida.** `grep -n checkRevoked
  > packages/auth/server.ts` devolve **uma única linha, a `:286` — e ela é comentário**, descrevendo o
  > caminho do **cookie**. Quem conferir por esse grep conclui o oposto do que o código faz. A checagem do
  > bearer **não usa a palavra `checkRevoked`**: ela está em `isMintedBeforeRevocation`, `:153-166`.
  > *(A linha do comentário era `:241` até a PR #20.)*
- `packages/auth/session.ts:14` — `SESSION_COOKIE_NAME = "access-token"`. ⚠️ **Correção de 2026-09-19:** a
  versão anterior dizia que `:22` e `:23` "já clampam a duração". Elas só **declaram** os limites
  (`MIN_EXPIRES_MINUTES`, `MAX_EXPIRES_DAYS`); o `Math.min(Math.max(...))` que de fato clampa está em
  `:47`, limitando a duração aos limites do Firebase (5 min / 14 dias), com padrão de 5 dias (`:24`).
  O tipo declara os
  atributos em `:51` (`httpOnly`) e `:53` (`sameSite: "lax"`), mas os valores de fato são atribuídos no
  bloco `:62-70` — é dali que vem o já citado `:64` (`secure` **apenas em produção**).
- `packages/auth/session.ts:78` — `isSameOriginRequest` é a **única** proteção contra CSRF no
  `sessionPOST` (`packages/auth/session-routes.ts:64`) **e agora também no `sessionRefreshPOST` (`:88`)**,
  e ela **retorna `true` quando não há cabeçalho `Origin`**. **Não há validação de csrfToken.** A PR #20
  acrescentou uma segunda superfície que grava cookie por trás dessa mesma guarda — o custo de não ter
  csrfToken dobrou sem que ninguém decidisse isso.
- ✅ **Política de senha: entregue pela PR #29.** A regra mora em
  `packages/shared/utils/helpers/passwordPolicy.ts:2-10` (mínimo 8 e máximo 1024 para senha nova; 6 para
  conferir senha existente) e a API a aplica em `apps/api/(shared)/validation/password.schema.ts:10-18`. Continua
  sem checagem contra senhas comuns ou vazadas. *(Até 2026-09-26 esta linha citava
  `sign-up/validations/signUpSchema.ts:6` com `MIN_PASSWORD_LENGTH = 6`; hoje o arquivo importa
  `PASSWORD_MIN_LENGTH` em `:2`.)*
- Busca por palavra inteira (`grep -riw`) por `multiFactor`, `MFA`, `TOTP`, `2FA` e `passkey` em `apps/` e
  `packages/`: **zero ocorrências**. ⚠️ Sem `-w` a busca devolve 8 falsos positivos: 7 do `InputOTP`
  (`TOTP` casa dentro de `InpuTOTP`) e 1 em `apps/app/__tests__/onboardingState.test.ts:119`, onde `%2Faccount`
  casa com `2FA` (recontado em 2026-09-27). Não existe segundo fator nem tela de sessões/dispositivos. Em compensação,
  `packages/design-system/components/ui/input-otp.tsx:11` já traz o primitivo de código de uso único, **não
  usado em lugar nenhum** — peça reaproveitável para o desafio e para os códigos de recuperação.
- **Lacuna:** sem MFA, sem visibilidade de sessões e sem revogação seletiva. *(A política de senha saiu da
  lista em 2026-09-27, entregue pela PR #29. A quinta lacuna — "revogação que não fecha o caminho do bearer" — **caiu em 2026-09-15**.)*
  > **Correção de escopo, segunda revisão (auditoria de 2026-09-16, pós-PR #15).** Esta linha já foi
  > corrigida uma vez, de "dois" para "cinco" schemas. **São dez** — e a contagem de cinco errou por um
  > motivo que vale registrar: olhou só para `apps/app`. Todos declaram `MIN_PASSWORD_LENGTH = 6` por conta
  > própria.
  >
  > | app | onde |
  > |-----|------|
  > | `apps/app` | `sign-up/validations/signUpSchema.ts:6` · `reset-password/validations/resetPasswordSchema.ts:6` · `sign-in/validations/signInSchema.ts:6` · `admin/(pages)/users/(validations)/userFormSchema.ts:7` · `account/(validations)/accountFormSchema.ts:9` · `account/(validations)/accountDeletionSchema.ts:6` (PR #23) |
  > | `apps/web` | `sign-up/validations/signUp.ts:3` · `sign-in/validations/signInSchema.ts:3` |
  > | `apps/api` | `(shared)/validation/auth.schema.ts:6` · `(shared)/validation/account.schema.ts:8` · `(shared)/validation/user-admin.schema.ts:4` |
  >
  > **O que muda, além do número.** Os três de `apps/api` são os que a política de senha realmente precisa
  > alcançar: validação de cliente é conveniência, e a borda da API é o que ninguém contorna. A spec vinha
  > dimensionando o item 4 como mudança de formulário, e ele é mudança de contrato — o que empurra o
  > esforço para cima e pede que a regra nasça em `@repo/shared`, consumida pelas três camadas, em vez de
  > virar uma décima primeira constante copiada.
  >
  > **Nota de 2026-09-27: as onze sumiram.** A PR #29 trocou todas pelas constantes de
  > `passwordPolicy.ts`. `git grep "MIN_PASSWORD_LENGTH"` em `apps/` e `packages/` dá **0**, com ou sem o `=`. A
  > tabela acima fica como registro do escopo que a fatia 1 cobriu.
  >
  > **Nota de 2026-09-23 — a décima primeira apareceu.** A PR #23 criou
  > `account/(validations)/accountDeletionSchema.ts`, que declara a própria `MIN_PASSWORD_LENGTH = 6`.
  > `git grep "MIN_PASSWORD_LENGTH ="` em `apps/` e `packages/` devolve **11** declarações (eram 10 no
  > `03498ae`); a busca sem o `=` devolve **28** ocorrências (eram 25). Os dois números medem coisas
  > diferentes, e o que conta para o item 4 é o de declarações: cada uma é um lugar a mudar.
  >
  > **Nota de 2026-09-17.** A contenção que mantinha esta spec sozinha no lote paralelo **caiu**. Os três
  > arquivos de `packages/auth` do `contends_on` eram exatamente os de `session-refresh`, agora entregue e
  > arquivada em [`docs/features/session-refresh/spec.md`](../docs/features/session-refresh/spec.md). Resta
  > a colisão com `data-rights-lgpd`, e só em `packages/auth/server.ts`. *(2026-09-23: essa colisão também
  > caiu. `data-rights-lgpd` foi entregue pela PR #23 e não alterou nenhum arquivo de `packages/auth`: o
  > expurgo apenas chama `revokeUserSessions` e `deleteUser`.)*
  >
  > Achado lateral, fora do escopo desta spec:
  > `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:10` (remedido em 2026-09-27) tem a mensagem em pt-br cravada no código
  > (`"A senha deve ter pelo menos 6 caracteres"`), fora do dicionário — viola a regra de ouro 2.

## Evidência de mercado

- Nota: [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md) (controles 12,
  17 e 18) · [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- **Prevalência é baixa e isso está sendo dito de propósito:** MFA/2FA com UI aparece em **3/10** dos
  starters pesquisados e sessões/dispositivos gerenciáveis em **1/10** — a nota classifica o valor para o
  usuário como **médio** e **baixo**, respectivamente. Por isso o `value` desta spec é **médio**, não
  alto: é higiene, não diferencial de produto.
- **A armadilha da pesquisa:** "sem códigos de recuperação, gera suporte manual eterno". Um MVP que ativa
  MFA e não entrega recuperação transfere o custo para atendimento humano, para sempre.
- **Sessão (controle 12):** o session cookie do Firebase aceita **5 minutos a 2 semanas**,
  `httpOnly`+`secure`, e a doc **adverte explicitamente sobre CSRF** — o exemplo oficial valida um
  csrfToken. **Armadilha crítica:** `revokeRefreshTokens` **não invalida ID tokens já emitidos** — eles
  seguem válidos **até expirar (1 hora)**; rotas sensíveis precisam de
  `verifySessionCookie(cookie, true)`. **Foi exatamente essa a lacuna — e ela está fechada desde
  2026-09-15**, por comparação manual de `auth_time` contra `tokensValidAfterTime`, que é a mesma
  semântica sem o round trip extra do flag.
- **OWASP Top 10:2025, A07 Authentication Failures** é a categoria que cobre este conjunto (a nota
  registra que a **ASVS 5.0.0**, de 30/05/2025, substituiu a 4.0.3 — cite a versão ao referenciar
  requisitos).
- **WCAG 2.2, critério 3.3.8 Accessible Authentication** (nível AA) — **não exigir CAPTCHA nem
  memorização no login**. Isso limita o que uma "política de senha" pode cobrar: regras de complexidade
  que forçam memorizar, ou que bloqueiam colar a senha, vão contra o critério.
- **Custo:** o preço de MFA no Google Cloud Identity Platform é **não confirmado** na nota — nenhuma
  decisão de adoção deve tratá-lo como gratuito.

> ✅ **O item 1 subiu de gravidade por três rodadas e foi FECHADO em 2026-09-15. Histórico preservado
> porque a trajetória é o aprendizado, não o desfecho.**
>
> Até a PR #10, `revokeUserSessions` só era chamada pelo logout global
> (`packages/auth/session-routes.ts:132`, dentro de `sessionDELETE:126`) — gesto deliberado de quem já está
> com a conta na mão. A PR #10 a
> pôs também na **redefinição de senha** (`apps/api/app/(routes)/auth/password/reset/route.ts:51`; o
> comentário que explica o porquê é `:46-48` — a versão anterior desta spec dizia que `:49` era comentário
> e errava, `:49` já é o `try`), o
> fluxo canônico de "minha conta foi comprometida", e com isso o furo saiu da dívida teórica e entrou num
> caminho de segurança real: **a vítima redefinia a senha e o ID token do atacante continuava passando no
> guard da API por até uma hora.**
>
> **A entrega de `account-settings` (PR #12) fechou isso** — e note a ironia estrutural: o item era
> descrito, rodada após rodada, como algo que **não dependia** de `account-settings` e podia ser tarefa
> direta. Foi resolvido justamente por ela, como efeito colateral de precisar que "sair de todos os
> dispositivos" funcionasse de verdade. **Lição para a priorização:** um item bloqueado por dependência
> declarada pode ser desbloqueado *pela própria dependência*, sem que ninguém o ataque de frente.
>
> ⚠️ **A armadilha de conferência sobreviveu ao conserto, e é o que merece atenção agora.** Por três
> rodadas, uma referência a `packages/auth/server.ts` foi conferida errado, sempre pelo mesmo mecanismo: a
> linha citada cai sobre um **comentário que menciona `checkRevoked`**, e a conferência superficial dá
> "confere". Hoje `grep -n checkRevoked packages/auth/server.ts` devolve **uma única linha, a `:286`, e ela
> é comentário** — descrevendo o caminho do **cookie**. A checagem do bearer não usa essa palavra em lugar
> nenhum: chama-se `isMintedBeforeRevocation` (`:153-166`) e é aplicada em `:182`. Quem auditar por
> palavra-chave vai concluir o oposto do que o código faz, nas duas direções.
>
> ⚠️ **E a armadilha ganhou uma camada com a PR #20.** `session-refresh` acrescentou `decodeSessionCookie`
> (`:262`), que verifica o cookie com `checkRevoked: false` de propósito, para baratear o throttle. Duas
> funções vizinhas leem o mesmo cookie com garantias opostas, e só uma delas tem a palavra no nome. A
> renovação chama a barata primeiro e a cara depois (`session-routes.ts:102` e `:112`) — correto, e fácil
> de inverter sem ninguém perceber.
>
> Nota lateral útil para o `/analyze`: a PR #10 introduziu `reloadCurrentUser`
> (`packages/auth/client.ts:214-225`, remedido em 2026-09-27), que força `reload(user)` + `getIdToken(true)`. É o primeiro
> precedente no repo de **forçar refresh de token no cliente** — metade do mecanismo que o item 1 precisa
> do lado do browser. A suíte de `packages/auth` deixou de ser o ponto cego que esta nota apontava: passou
> de 2 arquivos / 29 testes para **8 arquivos / 101 testes** (recontado em 2026-09-17, rodando o gate sem
> cache; a PR #20 acrescentou `sessionAbsoluteCap.test.ts` e `sessionRefreshRoute.test.ts`), com a revogação
> coberta por 9 casos — mas `reloadCurrentUser` em si segue sem teste próprio, exercitada só por mock em
> `apps/app/__tests__/useEmailVerification.test.tsx`.

## Proposta — corte de MVP

- [x] **Fechar a janela de revogação primeiro.** Depois que a sessão é encerrada, **nenhuma credencial já
      emitida** continua sendo aceita pela API. Sem isso, tudo o mais nesta spec é decorativo.
      ✅ **Entregue por `account-settings` em 2026-09-15**, nos **dois** transportes: o bearer ID token
      passou a ser recusado quando `auth_time` é anterior a `tokensValidAfterTime`
      (`packages/auth/server.ts:153-166`, aplicado em `getCurrentUser:182`), e o session cookie já era
      verificado com `checkRevoked` (`packages/auth/server.ts:298-301`). Antes disso, um token emitido
      antes da revogação seguia aceito **até expirar — por até uma hora**. Coberto por
      `packages/auth/__tests__/serverSessionRevocation.test.ts` (9 casos); o teste **falha** se a checagem
      for removida (verificado por mutação).
- [ ] O usuário **vê onde a conta está conectada** — sessões ativas com dispositivo/origem e último uso —
      dentro da área de conta.
- [~] O usuário **encerra sessões**: uma específica ou todas as outras, mantendo a atual. E o logout
      comum deixa de ser um "sair de todos" silencioso.
      ◐ **Metade entregue por `account-settings` (PR #12), e a metade que falta é justamente a difícil.**
      Já existe `POST /account/sessions/revoke` (`apps/api/app/(routes)/account/sessions/revoke/route.ts:7`,
      sob `requireCommonPanelApi`), exposto no SDK (`actions/account/action.ts:113`, âncora remedida em 2026-09-30: a PR #33 acrescentou `requestEmailChange` acima) e acionável pela UI
      (`AccountSecurityForm.tsx:137`). **Mas é tudo-ou-nada**, e o próprio código declara o porquê em
      `AccountSecurityForm.tsx:53-54`: *"Firebase cannot revoke sessions selectively, so both actions below
      end the current one too"*. Ou seja: o usuário ganhou um botão explícito de "sair de todos" — o que
      elimina o **silêncio** —, mas não ganhou granularidade nem a preservação da sessão atual. **Isso muda
      o escopo do que resta:** a parte pendente não é de UI, é de modelo — manter sessão específica exige
      identificá-las, e o Firebase não oferece isso pronto.
- [x] **Política de senha explícita e honesta no cadastro e na troca**, com força mínima real,
      **respeitando o critério 3.3.8** — sem CAPTCHA, sem proibir colar, sem exigir decorar sequência de
      símbolos.
      ✅ **Entregue pela fatia 1 (PR #29, `597f641`, 2026-09-26), conferido no código em 2026-09-27.** A
      regra mora num lugar só: `packages/shared/utils/helpers/passwordPolicy.ts:2-10` (`PASSWORD_MIN_LENGTH =
      8`, `PASSWORD_MAX_LENGTH = 1024`, `EXISTING_PASSWORD_MIN_LENGTH = 6` para login e senha atual). Na borda
      da API, `apps/api/(shared)/validation/password.schema.ts:10-18` define `newPasswordSchema` e
      `existingPasswordSchema`, e `:29-33` responde `400 AUTH_PASSWORD_TOO_SHORT`; o código é usado no cadastro
      e na redefinição (`auth.schema.ts:23`, `:28`, `:82-83`), na troca (`account.schema.ts:47-48`, `:136-137`, âncoras remedidas em 2026-09-30)
      e na criação pelo admin (`user-admin.schema.ts:9`, `users/route.ts:48-49`), traduzido nos 3 idiomas
      (`translations/packages/shared/utils.ts:73`, `:192`, `:311`, remedidas em 2026-09-30). As 11 cópias de `MIN_PASSWORD_LENGTH = 6`
      sumiram (`git grep "MIN_PASSWORD_LENGTH ="` em `apps/` e `packages/`: **0**): os oito schemas de
      formulário (seis na `apps/app`, dois na `apps/web`) importam as constantes, e os três da API passam por
      `password.schema.ts`. O cadastro das duas front-ends passou pela API
      (`apiClient.authApi.signUp`, `SignUpFormClient.tsx:114` e `sign-up-form-client.tsx:36`, rota
      `auth/sign-up/route.ts:19-77` com Admin SDK); `git grep createUserWithEmailAndPassword` em `apps/` e
      `packages/`: **0**. O `/test` confirmou colar nos campos de senha (item 10 do relatório). CI de merge
      verde (`gh run 36257926749`: `verify`, `changes`, `e2e`, `coverage`).
      **O que a fatia não alcança, por decisão registrada no plano:** checagem contra as senhas mais comuns
      (ASVS 6.2.4, pergunta P2, adiada para fatia seguinte); o REST direto do Identity Toolkit com a chave
      pública, que ainda aceita 6 ou 7 caracteres (declaração em `docs/PRE-PRODUCTION.md`, "o que a política
      de senha não alcança"); e o script `apps/api/scripts/create-dev-admin.mjs`, que não aplica a regra
      (P4).
- [ ] **Segundo fator opcional**, ativável pelo usuário, exigido no login quando ativo — **e entregue
      junto com códigos de recuperação**, porque sem eles o recurso vira fila de suporte.
- [ ] Tudo **opt-in**: um fork que não ativa segundo fator continua subindo, buildando e funcionando como
      hoje.

### Reescopo que o `/analyze` deve aplicar (auditoria de 2026-09-26)

A auditoria contesta este corte há várias rodadas: seis itens, três deles dependentes de modelo novo
(sessões identificáveis) ou de custo não confirmado (segundo fator no GCIP). Rodar o corte inteiro numa
rodada autônoma tende a voltar com metade dos critérios "não verificados". Este bloco aplica a
recomendação que a própria spec já dava na última pergunta em aberto: política de senha primeiro, segundo
fator depois.

**Primeira fatia: só o item 4, a política de senha.** Ela não custa nada ao fork, não exige conta em
provedor e dá para provar sob o emulador.

- O ponto de partida é a nota [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md),
  dentro da validade (`revalidate_after: 2027-08-21`): ASVS 5.0 L1 pede senha com pelo menos 8 caracteres
  sem regra de composição (6.2.1/6.2.5), checagem contra as 3000 senhas mais comuns (6.2.4) e permissão
  para colar e usar gerenciador de senha (6.2.6/6.2.7). Isso casa com o critério 3.3.8 do WCAG 2.2.
- Hoje o mínimo é 6 e está declarado **11** vezes (`git grep "MIN_PASSWORD_LENGTH ="` em `apps/` e
  `packages/`, remedido em 2026-09-26). A regra precisa nascer num lugar só e ser consumida pelas três
  camadas, como a seção "O que já existe" já apontava. *(Resolvido pela PR #29: 0 declarações.)*
- **Risco que o `/analyze` precisa resolver:** o cadastro da `apps/app` vai direto do navegador ao
  Firebase (`packages/auth/client.ts:163`, `createUserWithEmailAndPassword`), sem passar pela API. Validar
  só no formulário é o anti-padrão da regra de ouro 4. O `/analyze` escolhe como fechar esse caminho no
  servidor; se a escolha depender de configuração do projeto Firebase, ela vira passo em
  `docs/PRE-PRODUCTION.md` e não reprova a entrega. *(Resolvido pela PR #29: o cadastro das duas front-ends
  chama `POST /auth/sign-up`, e `createUserWithEmailAndPassword` saiu de `packages/auth/client.ts`.)*
- Os schemas de login (`sign-in/validations/signInSchema.ts` na `apps/app` e na `apps/web`) também
  declaram o mínimo. Subir o número ali impede de entrar quem já tem senha de 6 ou 7 caracteres, então a
  regra nova vale para cadastro, troca, redefinição e criação pelo admin, e não para o login. *(Aplicado pela
  PR #29: os dois `signInSchema.ts` importam `EXISTING_PASSWORD_MIN_LENGTH`, que vale 6.)*

**Ficam para fatias seguintes, nesta mesma spec:** o item 2 (lista de sessões), o resíduo do item 3 (logout
local por padrão e encerramento seletivo, que andam juntos porque os dois exigem identificar sessões) e o
item 5 (segundo fator, com códigos de recuperação). Depois da primeira fatia a spec passa a `in-progress`
e **não** é arquivada.

**O `contends_on` do frontmatter descreve o corte inteiro.** A primeira fatia toca os schemas de senha de
`apps/api/(shared)/validation/` e dos formulários, não a camada de sessão de `packages/auth`. Como esta é a
única spec elegível, a diferença não muda nenhum lote agora.

### Estado das fatias (auditoria de 2026-09-27)

| fatia | itens do corte | situação |
|-------|----------------|----------|
| 1 — política de senha | item 4 | ✅ **entregue** pela PR #29 (`597f641`), mergeada em 2026-09-26 com CI verde no SHA de merge. Evidência no item 4 acima |
| 2 — sessões | item 2 e o resíduo do item 3 (logout local, encerramento seletivo) | ⏳ não iniciada. Exige identificar sessões, que o Firebase não oferece pronto; é aqui que o `contends_on` do frontmatter volta a valer |
| 3 — segundo fator | item 5, com códigos de recuperação, e o item 6 (opt-in) | ⏳ não iniciada. Preço do MFA no Identity Platform segue **não confirmado** |

A spec passou a `in-progress` com `feature: account-security-mfa` e **não** é arquivada: os itens 2, 3
(resíduo), 5 e 6 seguem abertos. O `docs/features/account-security-mfa/STATE.md` ficou com `review:
in-progress` embora a PR tenha sido mergeada; a auditoria não escreve ali e registra a defasagem no
`BACKLOG.md`. A próxima fatia deve abrir pasta própria em `docs/features/` ou reaproveitar esta com um
`STATE.md` novo; decidir isso é do `/analyze` daquela fatia.

### Achado ligado à fatia 2 (auditoria de 2026-09-30)

**Conta desativada pelo admin segue com o ID token aceito pela API até ele expirar, em até 1 hora.** O
`PUT /users/[id]` com `disabled: true` só chama `updateUser` (`apps/api/app/(routes)/users/[id]/route.ts:117-122`)
e não revoga os tokens. O bearer passa por `getCurrentUser` (`packages/auth/server.ts:180-184`, chamado em
`apps/api/(shared)/lib/resolve-api-actor.ts:24`), que usa `verifyIdToken` sem `checkRevoked`, compara o token
com a marca de revogação e não confere `user.disabled`. O cookie de sessão não tem o problema, porque passa
por `verifySessionCookie(..., true)` (`server.ts:298-301`). O `/test` de `compliance-docs-kit` mediu o
comportamento em 2026-09-30 contra o projeto Firebase de desenvolvimento
([`test/report.md`](../docs/features/compliance-docs-kit/test/report.md), linhas 20 e 51-53).

O achado mora aqui porque o `contends_on` desta spec já cobre `server.ts` e `resolve-api-actor.ts`, e a fatia 2
mexe no mesmo modelo de sessão. O status não muda. A correção cabe antes da fatia 2, como tarefa direta: o
`getUser` já roda em `server.ts:181`, então recusar `user.disabled` ali não custa chamada a mais; revogar os
refresh tokens no `PUT` de desativação é a outra metade.

O teste da correção **não pode rodar no emulador**. No `firebase-admin@13.6.0`, `lib/auth/base-auth.js:119`
confere revogação e `disabled` sozinho quando `checkRevoked || isEmulator`, então sob emulador o defeito não
aparece e o teste passa mesmo sem a correção. Tem de ser teste de unidade ou de rota com o `getAuthInstance`
mockado.

### Fora do corte

- **Passkeys / WebAuthn** e segundo fator por SMS — o primeiro é a direção do mercado mas outro modelo de
  credencial; o segundo tem custo por mensagem e é o fator mais fraco.
- **MFA obrigatório por política** (para admins ou para todo o fork) — decisão de cada fork, não do core.
- **Reautenticação para ações sensíveis** (excluir conta, trocar e-mail, cancelar assinatura) — depende
  desta spec e de `data-rights-lgpd`; vira iteração própria, com o contrato de "sessão recente" definido
  num lugar só. *(2026-09-23: a exclusão de conta já nasceu com reautenticação própria, pedindo a senha de
  novo em vez de confiar na idade da sessão — `apps/api/app/(routes)/account/deletion/route.ts:55-72`. O
  motivo está no código: entrar pelo cookie de sessão compartilhado regrava o instante de autenticação, então
  uma sessão roubada se apresenta como recente. Quem desenhar o contrato de "sessão recente" precisa partir
  dessa restrição, e a conta sem provedor de senha fica sem caminho: a rota recusa com
  `ACCOUNT_DELETION_REAUTH_UNSUPPORTED` em `:48-53`.)*
- Detecção de login suspeito, alerta de novo dispositivo e bloqueio por tentativa — pertencem a
  `observability-logging`/`audit-log` e a anti-abuso. Verificação contra bases de senhas vazadas depende
  de serviço externo.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Ações de listar e encerrar sessões; ativar/desativar segundo fator. |
| `apps/api` | Guard de painel comum sobre as ações de sessão, sempre pelo sujeito da própria sessão; e a correção do caminho de verificação que hoje aceita credencial revogada. |
| `apps/app` | Seção de segurança dentro da área de conta criada por `account-settings`: sessões, senha, segundo fator, códigos de recuperação. |
| `apps/web` | Nada além de continuar coerente com a sessão compartilhada — a landing usa o mesmo cookie. |
| `packages/*` | `auth` concentra a mudança (verificação, revogação seletiva, segundo fator); `design-system` reaproveita o `InputOTP` que já existe e não é usado; i18n nos 3 idiomas, inclusive novos `apiErrors`. |
| Infra/env | Segundo fator no Firebase depende de habilitar o recurso no projeto — **custo não confirmado**; precisa ser opt-in por env. |

## Riscos e trade-offs

- **Custo herdado por todo fork:** se o segundo fator exigir habilitar um serviço pago no provedor, todo
  fork que não o usa não pode pagar por ele nem falhar no build. O padrão tem de ser **NO-OP quando falta
  a configuração**, como `packages/security/index.ts:42-44` faz com `ARCJET_KEY`.
- **Endurecer a verificação de credencial custa latência em toda requisição autenticada.** Checar
  revogação a cada chamada é mais seguro e mais caro; não checar é a falha atual. O meio-termo (checar
  onde importa) só funciona se "onde importa" estiver definido no core, e não a critério de cada fork.
- **Tornar o logout local é mudança de comportamento observável** — forks existentes contam hoje com o
  logout global; mudar sem avisar troca uma surpresa por outra.
- **MFA mal entregue é pior que sem MFA:** sem códigos de recuperação, quem perde o telefone perde a
  conta e o operador do fork vira suporte manual. E segurança que atrapalha o login é abandonada — regras
  de senha agressivas colidem com o critério 3.3.8 do WCAG 2.2 e com a conversão do cadastro.

## Sinais de pronto

- Encerrar a sessão invalida o acesso **imediatamente**, inclusive para credenciais emitidas antes.
- O usuário vê suas sessões ativas, reconhece a atual, e encerrar "todas as outras" o mantém logado onde
  está e derruba o resto.
- Uma senha fraca é recusada no cadastro e na troca, com mensagem traduzida nos 3 idiomas, sem CAPTCHA e
  sem impedir colar.
- Com o segundo fator ativo, o login exige o desafio; com os códigos de recuperação, o usuário entra sem
  o dispositivo.
- Sem a configuração de segundo fator, o app sobe, o build passa e o fluxo de login é o de hoje.

## Perguntas em aberto

- A correção da verificação de credencial revogada sai **nesta spec** ou vira correção de segurança
  imediata, antes dela? — **recomendação:** antes e desacoplada; é defeito ativo, não funcionalidade nova,
  e não deveria esperar a fila do backlog.
- Verificar revogação em **toda** requisição autenticada ou só nas sensíveis? — **recomendação:** em todas
  no primeiro corte (correção simples, comportamento previsível) e medir antes de otimizar.
- O logout passa a ser **local por padrão**? — **recomendação:** sim, com "sair de todos os dispositivos"
  como ação explícita e separada — é o que o usuário espera de um botão "sair".
- Qual **política de senha** o core adota? — **recomendação:** elevar o mínimo atual de 6 caracteres e
  medir força real em vez de exigir combinação de símbolos, para não colidir com o critério 3.3.8.
- Adotar **TOTP** via provedor pago ou postergar até haver demanda? — **recomendação:** entregar sessões +
  política de senha primeiro (custo zero, valor imediato) e tratar o segundo fator como fatia seguinte,
  já que o preço no GCIP é **não confirmado**.
