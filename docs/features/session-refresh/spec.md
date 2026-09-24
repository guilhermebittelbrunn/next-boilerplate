---
id: session-refresh
title: Renovação deslizante da sessão
status: done
value: alto
effort: M
audience: confianca
area: [packages/auth, apps/app, apps/web, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/auth/session.ts, packages/auth/session-routes.ts, packages/auth/server.ts]
feature: session-refresh
updated: 2026-09-17
---

# Renovação deslizante da sessão

> **Entregue em 2026-09-17** pela PR #20 (`cc93229`), com CI `success` no SHA de merge. Os seis itens do
> corte foram reconferidos no código, um a um, na auditoria de fechamento — a tabela está em
> [Entrega](#entrega-—-o-que-foi-conferido). O texto abaixo é o da spec original, preservado; as
> divergências entre o que ela pedia e o que foi construído estão registradas ao final.

## Problema

A sessão de todo fork expira em tempo absoluto, contado a partir do login. Quem está usando o produto
naquele instante é derrubado do mesmo jeito que quem fechou o navegador há cinco dias: no meio de um
formulário, sem aviso e sem chance de continuar.

A saída óbvia para quem sofre com isso é aumentar `SESSION_COOKIE_MAX_AGE_DAYS` até o teto que o Firebase
aceita. Isso troca um problema por outro: a sessão abandonada numa máquina compartilhada passa a valer duas
semanas, e continua valendo mesmo que a pessoa não volte nunca mais.

As duas pontas são a mesma lacuna. Não existe nada que distinga sessão em uso de sessão esquecida, porque
nada observa o uso.

## O que já existe no repo

- `packages/auth/session.ts:14` — o cookie compartilhado é `access-token`, um **session cookie do Firebase**
  (não um ID token cru), usado pela `apps/app` e pela `apps/web`.
- `packages/auth/session.ts:28-36` — `getSessionExpiresMs()` lê `SESSION_COOKIE_MAX_AGE_DAYS`, cai em 5 dias
  quando a variável está ausente ou inválida (`:24`) e **grampeia o valor nos limites do Firebase**: mínimo
  de 5 minutos (`:22`) e máximo de 14 dias (`:23`), com os dois comentados como limite do provedor.
- `packages/auth/session.ts:48-59` — `getSessionCookieOptions()`, compartilhada por gravação e limpeza, com
  `httpOnly`, `sameSite: "lax"` e `secure` só em produção (`:52`).
- `packages/auth/session.ts:80-89` — `mintSessionCookie()` é **o único ponto do repositório que grava o
  cookie**, e tem **um único chamador**: `sessionPOST`. Confirmado por `grep` em 2026-09-17 — as três
  ocorrências do símbolo são a definição, o import e a chamada.
- `packages/auth/session-routes.ts:33-70` — `sessionPOST` troca o ID token pelo cookie, com guarda de CSRF
  por `Origin` (`:34`); `:73-84` — `sessionDELETE` revoga e limpa; `:91-102` — `customTokenPOST` faz o
  bootstrap de SSO entre os dois front-ends. Os três são montados por quatro arquivos de rota
  (`apps/app/app/api/auth/session/route.ts`, `.../custom-token/route.ts` e os equivalentes na `apps/web`).
- `packages/auth/server.ts:244-266` — `getUserFromSessionCookie` verifica com **`checkRevoked: true`**
  (`:253-256`) e **descarta as claims decodificadas**, devolvendo só `getUser(decoded.uid)` (`:257`). O
  `auth_time`, que é o instante da autenticação original, é lido e jogado fora.
- `packages/auth/server.ts:272-278` — `revokeUserSessions` chama `revokeRefreshTokens`, e engole a falha
  registrando no console (`:276`).
- **Lacuna:** nada renova. O cookie é gravado no login e nunca mais tocado até ser limpo ou expirar. Não
  existe rota de renovação, não existe teto absoluto separado da vida do cookie, e o dado que permitiria
  impor esse teto (`auth_time`) é descartado dentro do próprio pacote.

## Evidência de mercado

- Nota: [`research/compliance-trust-baseline.md`](../../../specs/research/compliance-trust-baseline.md) (coletada em
  2026-08-21, revalidar após 2027-08-21 — dentro da validade).

**O benchmark de starters não sustenta esta spec, e vale dizer isso antes de qualquer outra coisa.** A
linha mais próxima em [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md)
é "Sessões/dispositivos gerenciáveis", com prevalência de **1 em 10** e valor classificado como baixo — e
ela descreve outra funcionalidade (a tela onde o usuário vê e encerra sessões), que pertence a
[`account-security-mfa`](../../../specs/account-security-mfa.md). Renovação de sessão não é item de prevalência naquele
levantamento, e não vou inventar um número para ela.

O que sustenta a spec é o limite do provedor e o conjunto de requisitos que a renovação não pode quebrar:

- **O Firebase aceita entre 5 minutos e 2 semanas** para o session cookie. O teto é do provedor, não uma
  escolha do repositório: qualquer política de sessão mais longa que isso **só** pode ser construída
  renovando, porque não há como pedir um cookie mais duradouro.
- **ASVS 5.0.0** (30/05/2025, substituiu a 4.0.3) traz no Level 1 o requisito **7.2.4** (novo token de
  sessão a cada autenticação) e o **7.4.2** (desabilitar ou excluir a conta encerra todas as sessões).
  Nenhum dos dois **exige** renovação deslizante — eles são o contorno que a renovação precisa respeitar
  para não virar um buraco. É a distinção que separa esta spec de um argumento de conformidade inventado.
- **Armadilha documentada pelo provedor:** `revokeRefreshTokens` **não invalida ID tokens já emitidos**, que
  seguem válidos até expirar (1 hora). Rotas sensíveis precisam de `verifySessionCookie(cookie, true)`.
  A verificação atual já faz isso (`server.ts:253-256`); a renovação precisa continuar fazendo.

## Proposta — corte de MVP

O corte descreve o que **limita** a renovação, não só o caminho feliz. Renovação deslizante sem limite é
sessão eterna, e é exatamente esse o defeito que se introduz quando a spec só descreve o sucesso.

- [ ] Existe um caminho de renovação que regrava o cookie a partir de uma sessão válida, servido pelo mesmo
      pacote que hoje monta as rotas de sessão, para que `apps/app` e `apps/web` herdem o comportamento sem
      duplicar lógica.
- [ ] A renovação só acontece depois de uma fração da vida do cookie ter passado. Nada de regravar a cada
      requisição: isso transforma toda navegação numa operação de escrita de cookie e numa chamada ao
      provedor, sem ganho.
- [ ] **Teto absoluto.** A renovação nunca estende a sessão além de um prazo contado a partir da
      **autenticação original** (`auth_time`), e não a partir da última renovação. Passado o teto, o caminho
      de renovação recusa e a pessoa autentica de novo. O prazo vem de variável de ambiente com valor padrão
      e é grampeado como o atual, para que um fork não consiga configurar sessão infinita por descuido.
- [ ] **A renovação respeita a revogação.** Passa pela verificação com `checkRevoked`, de modo que conta
      desabilitada, conta excluída e `sessionDELETE` interrompem a renovação. Quando o provedor recusa, o
      caminho de renovação **limpa o cookie** em vez de deixar uma credencial morta no navegador.
- [ ] A renovação roda em segundo plano e não bloqueia a navegação; falhar em renovar não desloga ninguém
      antes da expiração real do cookie.
- [ ] Todo texto novo visível (por exemplo, o aviso de sessão encerrada) entra no dictionary nos 3 idiomas.

### Fora do corte

- Tela de sessões e dispositivos ativos, com encerramento individual — é de
  [`account-security-mfa`](../../../specs/account-security-mfa.md), que já declara os mesmos três arquivos de
  `packages/auth` no `contends_on`.
- Rotação de refresh token com detecção de reuso: o refresh token é do Firebase, não do repositório, e não
  há onde implementar isso sem sair do provedor.
- "Continuar conectado" como escolha do usuário no login, e autenticação reforçada para operação sensível.
- Aviso de inatividade com contagem regressiva na tela.
- Carimbo de último acesso — é [`user-activity-tracking`](../user-activity-tracking/spec.md), que usa a renovação
  como gancho.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. A sessão é do cookie compartilhado, não do SDK. |
| `apps/api` | Nenhum no corte. A `apps/api` recebe credencial já resolvida e não monta rota de sessão. |
| `apps/app` | Monta o caminho de renovação (como já monta `session` e `custom-token`) e dispara a renovação em segundo plano. |
| `apps/web` | O mesmo, pelas mesmas rotas espelhadas. |
| `packages/*` | `auth`: onde mora a mudança — vida do cookie, renovação e exposição do `auth_time`. i18n para o texto de sessão encerrada. |
| Infra/env | Uma variável nova para o teto absoluto, com padrão, em `apps/app/.env.example` e `apps/web/.env.example` (onde `SESSION_COOKIE_MAX_AGE_DAYS` já está, `:36` e `:32`). Nenhum serviço externo. |

## Riscos e trade-offs

- **O risco principal é o da própria funcionalidade.** Renovação deslizante mal feita produz sessão que
  nunca morre, e o sintoma não aparece em teste: tudo funciona, o usuário nunca é deslogado, e é isso o
  defeito. O teto absoluto é o que separa as duas coisas, e por isso está no corte e não em "fora do corte".
- **Uma superfície nova que atende com o cookie e chama o provedor.** Vale notar onde ela **não** é
  protegida: o rate limit deste repositório roda no proxy da `apps/api`, sobre uma lista fechada de
  caminhos (`apps/api/proxy.ts:42-51`), e as rotas de sessão vivem na `apps/app` e na `apps/web`. Elas estão
  fora daquele mecanismo hoje, e continuarão fora — a renovação precisa do próprio limite de frequência.
- **ID token emitido antes da revogação sobrevive até uma hora.** É limite do provedor, registrado na nota
  de pesquisa. A renovação não piora isso, mas também não resolve, e não deve ser vendida como se
  resolvesse.
- **Contenção alta.** Os três arquivos que esta spec altera são exatamente os que
  [`account-security-mfa`](../../../specs/account-security-mfa.md) declara. As duas não podem rodar no mesmo lote.
- Custo herdado por fork que não usa: baixo. Nenhum serviço pago, nenhuma dependência nova, e a variável
  nova tem padrão — um fork que ignore o assunto continua funcionando.

## Sinais de pronto

- Quem está usando o produto atravessa o prazo antigo de expiração sem ser derrubado.
- Quem passa do teto absoluto é levado a autenticar de novo, mesmo estando ativo.
- Encerrar a sessão em um dos apps encerra nos dois, e a renovação não ressuscita a sessão encerrada.
- Conta desabilitada pelo admin para de renovar, e o cookie é limpo em vez de ficar apontando para nada.
- A renovação não dispara em toda navegação.

## Perguntas em aberto

- **Qual o teto absoluto padrão?** — **recomendação:** 30 dias a partir da autenticação original, com a
  variável configurável e grampeada num máximo. Justificativa: é bem maior que o cookie de 5 dias de hoje
  (então a renovação entrega valor perceptível) e bem menor que "para sempre". Não encontrei prevalência de
  mercado para esse número, e não vou apresentar o 30 como padrão de indústria — é um ponto de partida.
- **A renovação é silenciosa ou o usuário vê que a sessão foi estendida?** — **recomendação:** silenciosa.
  Sessão é assunto que só interessa quando falha; avisar a cada renovação gera ruído numa tela onde a pessoa
  está tentando fazer outra coisa.
- **Quando o teto absoluto estoura, para onde a pessoa vai?** — **recomendação:** para o login, preservando
  o destino original para retomar depois. Cuidado medido: o bounce do proxy apaga a query string fora das
  duas rotas de `oobCode` (`apps/app/proxy.ts:189-202`), então a retomada precisa ser conferida em vez de
  presumida.

## Entrega — o que foi conferido

PR **#20** mergeada em `main` em 2026-09-17T23:37:55Z (merge commit `cc93229`), CI `success` nesse SHA.
Os seis itens do corte, reabertos no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Caminho de renovação servido pelo mesmo pacote das rotas de sessão | **implementado** | `sessionRefreshPOST` em `packages/auth/session-routes.ts:87-123`, montado pelos dois front-ends em `apps/app/app/api/auth/session/refresh/route.ts` e `apps/web/app/api/auth/session/refresh/route.ts` |
| 2. Renovação só depois de uma fração da vida do cookie | **implementado** | `shouldRefreshSession` (`session.ts:137-140`) compara a idade do `iat` contra `REFRESH_AFTER_FRACTION = 0.5` (`:30`); antes do limiar a rota devolve `{ refreshed: false }` sem chamar o provedor (`session-routes.ts:108-110`) |
| 3. Teto absoluto contado do `auth_time`, por env com padrão e grampeado | **implementado** | `getSessionAbsoluteMaxAgeMs` (`session.ts:96-108`): padrão de 30 dias, piso na vida do cookie, teto de 90 dias. `resolveSessionOriginSeconds` (`:111-122`) lê a claim `sessionAuthTime` e recua para `auth_time`. `SESSION_ABSOLUTE_MAX_AGE_DAYS` está em `apps/app/.env.example:40` e `apps/web/.env.example:36` |
| 4. Renovação respeita a revogação e limpa o cookie quando o provedor recusa | **implementado** | `session-routes.ts:112-115` chama `getSessionFromCookie`, que verifica com `checkRevoked: true` (`server.ts:298-301`), e limpa o cookie na recusa. `mintFailureResponse` (`:52-60`) limpa e responde `AUTH_SESSION_EXPIRED` quando o teto estoura |
| 5. Renovação em segundo plano, sem bloquear a navegação | **implementado** | `refreshSessionCookie` em `packages/auth/provider.tsx:204-230`, chamada dentro de `applySignedInUser` (`:270`); a falha genérica vira `"error"` e não desloga ninguém — só o código `AUTH_SESSION_EXPIRED` aciona `handleSessionExpired` |
| 6. Texto novo nos 3 idiomas | **implementado** | `packages.auth.provider.session.expired` em `translations/packages/auth/index.ts:6,33,61`; `AUTH_SESSION_EXPIRED` e `AUTH_NO_SESSION` em `translations/packages/shared/utils.ts:27-28,111-112,193-194` |

### Deriva — o que saiu diferente do especificado

| especificado | implementado | leitura |
|--------------|--------------|---------|
| "**Lacuna:** nada renova. O cookie é gravado no login e nunca mais tocado" | Já renovava. `onIdTokenChanged` → `applySignedInUser` → `POST /api/auth/session` regravava o cookie de hora em hora, sem teto e sem ninguém ter decidido isso | **A spec estava errada, e o erro mudou o desenho.** O problema real não era a ausência de renovação: era renovação silenciosa e ilimitada. O item de maior valor do corte passou a ser o teto absoluto, não o caminho de renovação — que já existia de fato, sem nome |
| O teto vive no caminho de renovação | O teto é imposto em `mintSessionCookie` (`session.ts:154-156`), não na rota nova | **A implementação desviou, e o desvio é mais forte que a spec.** Só na rota o teto seria decorativo: o `provider.tsx` chama `sessionPOST` direto e passaria por cima dele |
| "A renovação nunca estende a sessão além de um prazo contado a partir da autenticação original" | A checagem do teto roda **depois** do limiar de renovação, então uma sessão pode sobreviver ao teto por até metade da vida do cookie — 32,5 dias com os padrões de 5 e 30 | **A implementação desviou, medido e registrado.** A sessão não é *estendida* além do teto, mas persiste além dele até o cookie expirar sozinho. Inverter a ordem custaria uma chamada ao provedor em toda navegação. Mantida de propósito; a decisão é de produto |

### Ressalvas que sobrevivem à entrega

- **A revogação ponta a ponta não foi verificada.** O emulador de Auth aceita o cookie depois de
  `revokeRefreshTokens`, o que atinge igualmente o `getUserFromSessionCookie` que o proxy já usava antes
  desta entrega. O caminho tem teste unitário; a prova ponta a ponta exige projeto Firebase real. Está
  classificado como 🔒 no relatório de teste — nem aprovado, nem reprovado.
- **A rota de renovação nasceu fora do rate limit**, como a própria spec antecipou nos riscos: o limitador
  deste repositório roda no proxy da `apps/api`, sobre uma lista fechada de caminhos, e as rotas de sessão
  vivem na `apps/app` e na `apps/web`. O throttle do servidor reduz o custo de cada chamada, mas não é um
  limite de frequência por origem.
- **`SESSION_ABSOLUTE_MAX_AGE_DAYS` na Vercel** é o único pré-requisito de infra, e só para quem quiser um
  teto diferente de 30 dias. Nenhum critério de aceite dependeu dele.
