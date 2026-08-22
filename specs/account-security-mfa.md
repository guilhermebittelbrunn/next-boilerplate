---
id: account-security-mfa
title: "MFA, sessões ativas e política de senha"
status: proposed
value: médio
effort: M
audience: confianca
area: [apps/api, apps/app, packages/auth, packages/design-system, packages/internationalization]
mode: ambos
depends_on: [account-settings]
feature: -
updated: 2026-08-21
---

# MFA, sessões ativas e política de senha

## Problema

Hoje a conta de um usuário do fork vale exatamente o que vale a senha dele — e a senha pode ter **seis
caracteres quaisquer**. Não há segundo fator, não há como ver onde a conta está conectada, e não há como
derrubar um acesso específico: sair em um dispositivo derruba todos os outros, sem que o usuário saiba
nem tenha pedido.

Pior: o encerramento **não é imediato para todo mundo**. Existe uma janela em que uma credencial já
emitida continua sendo aceita pela API — invisível no uso normal e decisiva no único cenário que importa,
o de conta comprometida, em que o usuário sai justamente para expulsar alguém.

## O que já existe no repo

- `packages/auth/server.ts:212` — `revokeUserSessions` existe **e está em uso**: `sessionDELETE` o chama
  em `packages/auth/session-routes.ts:79`, montado em `apps/app/app/api/auth/session/route.ts:13` e
  `apps/web/app/api/auth/session/route.ts:12`, alcançado pelo botão de sair
  (`apps/app/shared/components/ui/ProfileDropdown.tsx:49` → `packages/auth/provider.tsx:244`). Não é
  código morto — **o efeito colateral é que todo logout é um "sair de todos os dispositivos"**, sem
  granularidade e sem aviso ao usuário.
- ⚠️ **`packages/auth/server.ts:123` — `verifyIdToken(token)` é chamado sem o argumento de revogação.** E
  `apps/api/(shared)/lib/resolve-api-actor.ts` tenta **primeiro** o caminho do bearer ID token. Resultado:
  depois de revogar, **um ID token já emitido continua passando no guard da API até expirar**. O outro
  caminho já faz o certo — `getUserFromSessionCookie` usa `verifySessionCookie(sessionCookie, true)`
  (`packages/auth/server.ts:193`). A base está metade correta, e é a metade errada que é tentada antes.
- `packages/auth/session.ts:14` — `SESSION_COOKIE_NAME = "access-token"`; `:22` e `:23` já clampam a
  duração aos limites do Firebase (5 min / 14 dias), com padrão de 5 dias (`:24`). Atributos em `:39`
  (`httpOnly`), `:41` (`sameSite: "lax"`) e `:52` (`secure` **apenas em produção**).
- `packages/auth/session.ts:66` — `isSameOriginRequest` é a **única** proteção contra CSRF no
  `sessionPOST` (`packages/auth/session-routes.ts:34`), e ela **retorna `true` quando não há cabeçalho
  `Origin`**. **Não há validação de csrfToken.**
- `apps/app/.../sign-up/validations/signUpSchema.ts:6` — `MIN_PASSWORD_LENGTH = 6`. A validação é só
  tamanho mínimo + conferência de confirmação. Sem complexidade, sem verificação de senha vazada.
- Busca por `multiFactor`, `MFA`, `TOTP`, `2FA` e `passkey` em `apps/` e `packages/`: **zero
  ocorrências**. Não existe segundo fator nem tela de sessões/dispositivos. Em compensação,
  `packages/design-system/components/ui/input-otp.tsx:11` já traz o primitivo de código de uso único, **não
  usado em lugar nenhum** — peça reaproveitável para o desafio e para os códigos de recuperação.
- **Lacuna:** sem MFA, sem visibilidade de sessões, sem revogação seletiva, sem política de senha — e com
  revogação que não fecha o caminho do bearer.

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
  `verifySessionCookie(cookie, true)`. É exatamente a lacuna confirmada acima.
- **OWASP Top 10:2025, A07 Authentication Failures** é a categoria que cobre este conjunto (a nota
  registra que a **ASVS 5.0.0**, de 30/05/2025, substituiu a 4.0.3 — cite a versão ao referenciar
  requisitos).
- **WCAG 2.2, critério 3.3.8 Accessible Authentication** (nível AA) — **não exigir CAPTCHA nem
  memorização no login**. Isso limita o que uma "política de senha" pode cobrar: regras de complexidade
  que forçam memorizar, ou que bloqueiam colar a senha, vão contra o critério.
- **Custo:** o preço de MFA no Google Cloud Identity Platform é **não confirmado** na nota — nenhuma
  decisão de adoção deve tratá-lo como gratuito.

## Proposta — corte de MVP

- [ ] **Fechar a janela de revogação primeiro.** Depois que a sessão é encerrada, **nenhuma credencial já
      emitida** continua sendo aceita pela API. Sem isso, tudo o mais nesta spec é decorativo.
- [ ] O usuário **vê onde a conta está conectada** — sessões ativas com dispositivo/origem e último uso —
      dentro da área de conta.
- [ ] O usuário **encerra sessões**: uma específica ou todas as outras, mantendo a atual. E o logout
      comum deixa de ser um "sair de todos" silencioso.
- [ ] **Política de senha explícita e honesta no cadastro e na troca**, com força mínima real,
      **respeitando o critério 3.3.8** — sem CAPTCHA, sem proibir colar, sem exigir decorar sequência de
      símbolos.
- [ ] **Segundo fator opcional**, ativável pelo usuário, exigido no login quando ativo — **e entregue
      junto com códigos de recuperação**, porque sem eles o recurso vira fila de suporte.
- [ ] Tudo **opt-in**: um fork que não ativa segundo fator continua subindo, buildando e funcionando como
      hoje.

### Fora do corte

- **Passkeys / WebAuthn** e segundo fator por SMS — o primeiro é a direção do mercado mas outro modelo de
  credencial; o segundo tem custo por mensagem e é o fator mais fraco.
- **MFA obrigatório por política** (para admins ou para todo o fork) — decisão de cada fork, não do core.
- **Reautenticação para ações sensíveis** (excluir conta, trocar e-mail, cancelar assinatura) — depende
  desta spec e de `data-rights-lgpd`; vira iteração própria, com o contrato de "sessão recente" definido
  num lugar só.
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
  a configuração**, como `packages/security/index.ts:16` faz com `ARCJET_KEY`.
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
