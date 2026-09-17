---
id: cookie-consent
title: Consentimento de cookies e Consent Mode
status: done
value: alto
effort: M
audience: confianca
area: [apps/app, apps/web, packages/analytics, packages/design-system, packages/internationalization, packages/shared]
mode: ambos
depends_on: []
contends_on: [packages/analytics/provider.tsx, apps/app/app/layout.tsx, "apps/web/app/[locale]/layout.tsx", packages/design-system/components/ui/index.ts]
feature: cookie-consent
updated: 2026-09-16
---

> **Entregue.** PR **#16**, merge commit `7c8ff7c` em `main` (2026-09-16T23:54:09Z), CI `success` nesse SHA.
> Os seis itens do corte foram reconferidos um a um no código pelo `/spec --sync` — a evidência está em
> cada item da seção "Proposta". Arquivada aqui pelo mesmo comando.

# Consentimento de cookies e Consent Mode

## Problema

Todo fork deste boilerplate que configurar o Google Analytics passa a rastrear visitantes **antes de
perguntar qualquer coisa**. Não há banner, não há escolha, não há como recusar — a tag sobe junto com a
página. O visitante não tem controle; o operador do fork não tem prova de consentimento; e o Google, para
tráfego europeu, não recebe os sinais que passou a exigir.

O custo de errar é assimétrico: a correção é uma tela pequena, e o passivo é tratamento de dados sem base
legal em cada visita desde o primeiro dia no ar — dívida que só aparece quando já está grande.

## O que já existe no repo

- `packages/analytics/provider.tsx:12` — o `AnalyticsProvider` monta **Vercel Analytics
  incondicionalmente** (`:15`) e o **Google Analytics sempre que `NEXT_PUBLIC_GA_MEASUREMENT_ID` estiver
  definido** (`:16`). **Não há nenhuma checagem de consentimento antes disso** — este é o achado central.
- `packages/analytics/keys.ts` — a env do GA é opcional e só aceita id com prefixo `G-`. Ou seja: o
  rastreio é opt-in **do desenvolvedor do fork**, nunca do visitante.
- `apps/app/app/layout.tsx:63-70` — o `AnalyticsProvider` envolve toda a aplicação autenticada (import em
  `:3`). ⚠️ *Referência corrigida em 2026-09-15: era `:39`, deslocada pela PR #12, que acrescentou 38
  linhas a este arquivo.*
- `apps/web/app/[locale]/layout.tsx` — a landing pública **não monta o `AnalyticsProvider`** (a única
  referência ao componente em todo o repo é a do `apps/app`). Ou seja, hoje o app autenticado mede sem
  consentimento e o site público, que é onde o tráfego anônimo e europeu de fato chega, não mede nada.
- `grep -rniE "consent|cookie-?banner"` em `apps/` + `packages/` = **1 ocorrência, e é ruído** (`apps/api/scripts/create-dev-admin.mjs:27`, docblock do script de seed). Banner, componente e chave de consentimento seguem inexistentes (remedido em
  2026-09-15). **Não existe banner nem componente de consentimento em lugar nenhum**, inclusive no
  `packages/design-system`.
- **O inventário de cookies dobrou desde que esta spec nasceu, e isso muda o corte.** São **5** nomes de
  cookie, não os 2 que a spec afirmava originalmente. Um banner que classifique por categoria precisa
  enumerá-los — se declarar só dois, **nasce mentindo**:

  | cookie | onde | categoria |
  |--------|------|-----------|
  | `access-token` | `packages/auth/session.ts:14` | estritamente necessário |
  | `x-locale` | `packages/internationalization/client.ts:8` · `server.ts:20` · `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | preferência |
  | `x-theme` | `apps/app/shared/lib/themePreference.ts:10` · `apps/app/app/layout.tsx:19` | preferência — criado pela PR #12 |
  | `bp:panel-request-role` · `bp:impersonate-firebase-uid` | `apps/app/shared/lib/panelState.ts:18-19` | estritamente necessário (estado de painel) |

  > **Correção da auditoria de 2026-09-16 — a própria spec estava com o inventário errado.** A rodada de
  > 2026-09-15 contou **6** cookies porque incluiu `bp:panel-state` na lista. Ele não é cookie:
  > `apps/app/shared/lib/panelState.ts:20` o declara como `PANEL_STORAGE_KEY`, chave de **localStorage**, e
  > o docblock do arquivo (`:8-13`) separa as duas coisas de propósito — cookie é a autoridade que o
  > servidor lê, localStorage é o espelho do rótulo de exibição. O erro importa mais aqui do que importaria
  > em outra spec, porque o número **6** vinha sendo usado como argumento, e porque um aviso de
  > consentimento que lista um item de localStorage como cookie comete exatamente o defeito que esta spec
  > existe para evitar. Vale a nota de método: banner de consentimento também precisa cobrir armazenamento
  > local, mas em outra seção e com outra base legal — não misturado com a lista de cookies.

  > **Correção da auditoria de fechamento (2026-09-16).** São **6** cookies, não 5: falta `sidebar_state`
  > na tabela acima (`packages/design-system/components/ui/sidebar.tsx:28,108`). O `/analyze` achou a
  > omissão e a tabela corrigida foi para a seção 2 do `analyze/plan.md`. Terceira contagem de cookies
  > desta spec a sair errada — o inventário é exatamente o tipo de fato que não se escreve de memória.

  `packages/internationalization/utils/cookies.ts:1` é só um `getCookie` **genérico**, sem nomear locale
  nenhum.
- `packages/shared/utils/helpers/cookies.ts:2,16,31` — `setCookie` / `getCookie` / `removeCookie` já
  existem como helpers de cliente (`SameSite=Lax`, sem flag `secure`). Peça reaproveitável para guardar a
  escolha — não precisa reinventar. **E agora tem precedente de produção:** a PR #12 criou o primeiro
  consumidor real do `setCookie` (`themePreference.ts:3,33,60`, TTL de 180 dias em `:5-8`), então o formato
  de persistência da escolha não precisa ser inventado — só imitado.
- **A armadilha de hidratação que esta spec listava como risco já tem solução de referência no repo**, de
  graça e por outro motivo: `apps/app/app/layout.tsx:27-32` lê o cookie **no servidor** e aplica a classe
  no `<html>` (`:50-60`) — exatamente o padrão que `apps/app/CLAUDE.md:70` prescreve. O banner deve copiar
  essa forma para não piscar na cara de quem já respondeu.
- **Lacuna:** nenhuma camada entre o visitante e as tags. O consentimento simplesmente não é um conceito
  neste repositório.

## Evidência de mercado

- Nota: [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md) (controle 5)
- **Prevalência entre starters não é o argumento** — banner de cookies não aparece na tabela de 28
  funcionalidades de [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md),
  e "analytics plugado" aparece em **6/10** justamente na forma sem consentimento que o repo já tem. Aqui
  o mercado é o mau exemplo; a obrigação é normativa.
- **Quem exige o consentimento é a ePrivacy 2002/58/CE art. 5(3)** (alterada em 2009), com exceção do
  **estritamente necessário** — **não é o GDPR**. Confundir os dois é o erro mais comum e leva a
  implementações que pedem consentimento para a coisa errada.
- O **guia orientativo da ANPD** é prescritivo e vale como requisito de projeto:
  - **1º nível** — botão de **rejeitar todos os não necessários**, com visualização **tão fácil quanto**
    aceitar;
  - **2º nível** — categorias por finalidade, com **cookies de consentimento desativados por padrão**;
  - **proíbe botão único**, **proíbe dar destaque só ao "aceitar"** e **proíbe política apenas em idioma
    estrangeiro** — este último bate direto neste repo, que já opera em pt-br/en/es e não pode entregar um
    banner traduzido apontando para uma política que não está.
- **Consent Mode v2** do Google acrescentou `ad_user_data` e `ad_personalization` a `ad_storage` e
  `analytics_storage`; a exigência do Google é para **tráfego do EEE**.

## Proposta — corte de MVP

- [x] O visitante vê, na primeira visita, um aviso com **três saídas igualmente acessíveis**: aceitar
      todos, **rejeitar todos os não necessários** e abrir as preferências. Nada de botão único, nada de
      "aceitar" em destaque e "rejeitar" escondido. — `packages/design-system/components/ui/cookie-consent.tsx:134-156`:
      rejeitar (`:137`) e aceitar (`:144`) são o mesmo `Button`, com a mesma variante e a mesma largura
      (`sm:flex-1`); rejeitar vem antes na ordem de leitura e de tabulação. Gerenciar preferências é o
      terceiro (`:149-155`).
- [x] No segundo nível, o visitante escolhe **por categoria de finalidade**, com tudo que não é
      estritamente necessário **desligado por padrão**. — mesmo arquivo, `:43-94`: categoria necessária
      travada em ligado (`:64`, `checked disabled`), medição em `Switch` livre (`:75-80`) semeado com
      `analyticsGranted`, que vale `false` enquanto não há decisão (`packages/analytics/consent.ts:22`,
      `NO_CONSENT`).
- [x] **Nenhuma tag de medição carrega antes da escolha.** Enquanto não houver decisão, o produto funciona
      normalmente e não mede nada além do estritamente necessário. — `packages/analytics/provider.tsx:101`
      calcula `measuring = snapshot.decided && snapshot.analytics`, e tanto o Vercel Analytics (`:107`)
      quanto o Google Analytics (`:108-110`) só montam sob essa condição.
- [x] A escolha **persiste entre visitas e entre os dois apps** e pode ser **revista a qualquer momento**
      por um ponto de acesso permanente — consentimento que não se pode retirar não é consentimento. —
      cookie `bp:cookie-consent` com TTL de 180 dias (`packages/analytics/consent.ts:1,9-12`), gravado com
      o domínio de `SESSION_COOKIE_DOMAIN` (`server.ts:29`), o mesmo mecanismo que já une `web` e `app` na
      sessão. Reabertura em `apps/web/app/[locale]/components/cookiePreferencesButton.tsx:13,23` e em
      `apps/app/shared/components/ui/ProfileDropdown.tsx:29,70`.
- [x] O aviso e as preferências existem nos **3 idiomas** do repo, e apontam para a política de
      privacidade no mesmo idioma. — `packages/internationalization/translations/components/ui/cookie-consent.ts:2,36,70`
      (pt-br/en/es), ligadas ao dicionário em `translations/components/index.ts:19,29,39`. O link recebe o
      locale corrente em `apps/web/app/[locale]/layout.tsx:39` e `apps/app/app/layout.tsx:48`.
- [x] Os sinais de consentimento chegam ao Google no formato que ele espera, **incluindo os quatro do
      Consent Mode v2**, para o tráfego que os exige. — `packages/analytics/consent.ts:90-93` emite os
      quatro no script de defaults; `provider.tsx:29-31,52` repete os quatro no `gtag('consent','update')`.

> **Nota de entrega — reabertura na superfície não autenticada da `apps/app`.** O ponto permanente de
> revisão da escolha está no `ProfileDropdown`, que só existe depois do login. Quem decidiu na tela de
> cadastro e nunca autenticou não tem onde mudar de ideia dentro da `apps/app`; precisa do rodapé da
> landing. Como o cookie é compartilhado entre os dois apps quando `SESSION_COOKIE_DOMAIN` está
> configurada, o caminho existe — mas depende de o fork publicar a `apps/web`. Registrado como achado da
> auditoria, não como item pendente do corte.

### Fora do corte

- **Registro auditável de consentimento** (quem consentiu o quê e quando, com prova) — é a peça que
  aparece em auditoria, mas exige persistência e trilha; pertence a `audit-log` ou a iteração seguinte.
- Varredura automática de cookies para gerar a lista por categoria: no corte, a categorização é declarada,
  não descoberta.
- CMP certificada de terceiro e TCF do IAB — arrastam serviço pago para todo fork.
- Geolocalização do visitante para exibir o banner só onde é exigido — parece economia, é fonte de bug e
  de dúvida jurídica.
- Consentimento para e-mail de marketing — outra base legal, outro fluxo.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. O consentimento é decisão do navegador, não recurso da API. |
| `apps/api` | Nenhum no corte de MVP. |
| `apps/app` | O provedor de analytics deixa de carregar direto e passa a depender da escolha; ponto permanente para rever preferências. |
| `apps/web` | Mesmo aviso na landing — é a superfície pública, onde o visitante anônimo chega primeiro; e o link para a política no idioma corrente. |
| `packages/*` | `design-system`: o banner e o painel de preferências, porque a UI é compartilhada pelos dois apps. `analytics`: passa a respeitar o estado de consentimento em vez de montar as tags direto. `shared`: reaproveita os helpers de cookie. `internationalization`: copy nos 3 idiomas. |
| Infra/env | Nenhuma variável nova obrigatória. Sem `NEXT_PUBLIC_GA_MEASUREMENT_ID`, o comportamento tem de continuar sendo o mesmo de hoje: nada de GA. |

## Riscos e trade-offs

- **Custo herdado por todo fork:** um banner é a primeira coisa que todo visitante vê. Um fork que não
  usa analytics nenhum não pode ser obrigado a exibi-lo — se não há tag não essencial para carregar, não
  há o que consentir. O padrão precisa ser **NO-OP quando não há nada a consentir**, no mesmo espírito de
  `packages/security/index.ts:42-44` (e do segundo guard equivalente em `:85`), que simplesmente retornam
  quando `ARCJET_KEY` não está definida.
- **Perda de medição é real e deve ser dita.** Rejeitar por padrão significa medir menos; trocar isso por
  um "aceitar" em destaque é exatamente o que a ANPD proíbe.
- **Consentimento no cliente é estado que precede a hidratação.** Ler a escolha no render do cliente
  enquanto o servidor renderizou outra coisa produz *flash* de banner em quem já respondeu — a armadilha
  que o `apps/app/CLAUDE.md` já documenta para estado persistido no browser.
- **Dois apps, uma escolha.** Consentir na landing e ser perguntado de novo no app transforma o
  consentimento em ruído; o escopo do cookie precisa seguir o mesmo raciocínio de domínio já usado pelo
  cookie de sessão.
- **O banner é ponto de acessibilidade crítico**: sobrepõe conteúdo, prende foco e aparece antes de tudo.
  Feito sem cuidado, quebra a navegação por teclado logo na entrada do produto.

## Sinais de pronto

- Numa primeira visita, nenhuma requisição de medição sai antes de o visitante escolher.
- Rejeitar todos é tão fácil quanto aceitar todos: mesma tela, mesmo nível, mesmo peso visual; e no
  segundo nível, tudo que não é estritamente necessário começa desligado.
- A escolha sobrevive a recarregar, a fechar o navegador e a atravessar entre a landing e o app, e o
  visitante encontra onde mudar de ideia depois sem limpar cookie na mão.
- Aviso, preferências e política estão no mesmo idioma, nos 3 idiomas do repo.
- Sem a env do GA configurada, o app sobe, o build passa e o comportamento é o de hoje.

## Perguntas em aberto

- O banner aparece para **todo visitante** ou só quando há tag não essencial configurada? —
  **recomendação:** só quando há, para não impor fricção a forks sem analytics.
- O **Vercel Analytics** entra como necessário ou como sujeito a consentimento? — **recomendação:** tratar
  como sujeito a consentimento; hoje ele carrega incondicionalmente
  (`packages/analytics/provider.tsx:15`) e presumir que é essencial é a saída confortável, não a correta.
- Quantas **categorias** no segundo nível? — **recomendação:** o mínimo que descreva honestamente o que o
  boilerplate faz (necessários + medição), crescendo por fork.
- A landing (`apps/web`) passa a montar analytics nesta spec? — **recomendação:** não; esta spec entrega o
  consentimento, e ligar a medição na landing é decisão de produto de cada fork.
