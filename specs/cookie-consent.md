---
id: cookie-consent
title: Consentimento de cookies e Consent Mode
status: proposed
value: alto
effort: M
audience: confianca
area: [apps/app, apps/web, packages/analytics, packages/design-system, packages/internationalization, packages/shared]
mode: ambos
depends_on: []
feature: -
updated: 2026-08-21
---

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
- `apps/app/app/layout.tsx:39` — o `AnalyticsProvider` envolve toda a aplicação autenticada.
- `apps/web/app/[locale]/layout.tsx` — a landing pública **não monta o `AnalyticsProvider`** (a única
  referência ao componente em todo o repo é a do `apps/app`). Ou seja, hoje o app autenticado mede sem
  consentimento e o site público, que é onde o tráfego anônimo e europeu de fato chega, não mede nada.
- Busca por `cookie`, `consent` e `banner` em `apps/` e `packages/`: as únicas ocorrências são o cookie de
  idioma (`packages/internationalization/utils/cookies.ts:1`) e o cookie de sessão
  (`packages/auth/session.ts:14`). **Não existe banner nem componente de consentimento em lugar nenhum**,
  inclusive no `packages/design-system`.
- `packages/shared/utils/helpers/cookies.ts:2,16,38` — `setCookie` / `getCookie` / `removeCookie` já
  existem como helpers de cliente (`SameSite=Lax`, sem flag `secure`). Peça reaproveitável para guardar a
  escolha — não precisa reinventar.
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

- [ ] O visitante vê, na primeira visita, um aviso com **três saídas igualmente acessíveis**: aceitar
      todos, **rejeitar todos os não necessários** e abrir as preferências. Nada de botão único, nada de
      "aceitar" em destaque e "rejeitar" escondido.
- [ ] No segundo nível, o visitante escolhe **por categoria de finalidade**, com tudo que não é
      estritamente necessário **desligado por padrão**.
- [ ] **Nenhuma tag de medição carrega antes da escolha.** Enquanto não houver decisão, o produto funciona
      normalmente e não mede nada além do estritamente necessário.
- [ ] A escolha **persiste entre visitas e entre os dois apps** e pode ser **revista a qualquer momento**
      por um ponto de acesso permanente — consentimento que não se pode retirar não é consentimento.
- [ ] O aviso e as preferências existem nos **3 idiomas** do repo, e apontam para a política de
      privacidade no mesmo idioma.
- [ ] Os sinais de consentimento chegam ao Google no formato que ele espera, **incluindo os quatro do
      Consent Mode v2**, para o tráfego que os exige.

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
  `packages/security/index.ts:16`, que simplesmente retorna quando `ARCJET_KEY` não está definida.
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
