---
id: onboarding-flow
title: Onboarding pós-cadastro
status: proposed
value: alto
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/internationalization]
mode: ambos
depends_on: []
feature: -
updated: 2026-08-21
---

# Onboarding pós-cadastro

## Problema

Quem termina o cadastro é jogado direto no painel, sem nenhum passo intermediário. O fork nasce sem
saber nada sobre o usuário além do e-mail, e o usuário nasce sem saber o que fazer — a primeira tela é
literalmente vazia. É o momento em que se decide se a pessoa fica, e hoje ele é um espaço em branco.

Para quem constrói o fork, o custo é pior: cada MVP reinventa "pegar o nome da pessoa e explicar o
produto" do zero, como um formulário solto que não sobrevive a um refresh.

## O que já existe no repo

- `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:42` — logo após o
  cadastro, resolve o caminho e faz `router.push` (`:47`); no fluxo Google, `window.location.replace`
  (`:84`). Não há qualquer passo entre "cadastrou" e "está no painel".
- `apps/app/shared/lib/postLoginNavigation.ts:31` — `resolveAppPostLoginPath` é o único ponto de decisão
  do destino: honra `?redirect=`, senão manda admin para `/{locale}/admin` (`:24`) e o resto para o
  fallback. É o gancho natural para desviar um usuário incompleto.
- `packages/auth/redirect.ts:10` — `postAuthRedirectTarget` já sanitiza o deep link (guard de
  open-redirect, coberto por `apps/app/__tests__/postAuthRedirectTarget.test.ts`). Um fluxo retomável
  precisa exatamente disso para voltar ao destino original ao terminar.
- `apps/api/(shared)/lib/user-merge.ts:47` — `ensureDefaultUserProfile` cria o perfil com apenas
  `type: COMMON` e `reference_id`. É o ponto exato onde o estado inicial de onboarding nasceria, e é
  chamado nos três caminhos de entrada (`:22`, `:41`, `apps/api/app/(routes)/auth/sign-in/google/route.ts:19`).
- `apps/app/proxy.ts:15` — `PUBLIC_PATHS` é só `/sign-in` e `/sign-up`; o proxy é default-deny, então
  qualquer rota nova de onboarding já fica protegida sem allowlist.
- `packages/sdk/src/types/user/user.ts:7` — o `UserDTO` tem `id`, `type`, `reference_id` e timestamps.
- **Lacuna:** não existe nenhuma noção de "perfil incompleto", nenhum passo guiado, nenhum estado
  persistido de progresso. O perfil não guarda sequer o nome próprio do usuário.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- Prevalência: **3 de 10** starters do painel entregam onboarding pós-signup multi-step.
- Valor atribuído na nota: **muito alto** — descrito como o **maior desequilíbrio valor/prevalência de
  todo o painel**: "é onde o usuário decide se fica, e quase nenhum kit entrega".
- Armadilha nomeada na nota: **fluxo não retomável**. Quem fecha a aba no passo 2 volta ao passo 1, ou
  pior, entra no painel com metade do cadastro.

> Prevalência baixa (3/10) é o argumento **a favor**, não contra: a nota é explícita em que a raridade é
> lacuna de mercado, não sinal de irrelevância. Mesmo assim o valor aqui não se sustenta em benchmark —
> sustenta-se em dois fatos deste repo: o perfil criado em `user-merge.ts:47` não tem dado nenhum de
> produto, e a tela de destino está vazia (ver [`dashboard-home`](dashboard-home.md)).

## Proposta — corte de MVP

- [ ] Ao entrar no painel com o perfil ainda incompleto, o usuário é levado a um fluxo de onboarding em
      vez do destino normal — decidido no servidor, não por redirect no cliente.
- [ ] Fluxo de 2 a 3 passos, com progresso visível, coletando o mínimo genérico: nome de exibição e uma
      preferência que qualquer fork usa (idioma).
- [ ] **Retomável:** o progresso é persistido a cada passo; fechar a aba e voltar cai no passo em que
      parou, e o deep link original (`?redirect=`) é honrado ao concluir.
- [ ] Concluir marca o perfil como completo e nunca mais intercepta.
- [ ] Um passo pode ser pulado quando o fork configurar assim, sem deixar o usuário preso.

### Fora do corte

- Passos condicionais por papel/plano, checklist de ativação e tour interativo — dependem de haver
  produto, e cada fork tem o seu.
- Coleta de dados de domínio (empresa, cargo, segmento) — não é genérico; é código do fork, que apenas
  encaixa um passo a mais no fluxo.
- Convite de colegas ([`teams-organizations`](teams-organizations.md)), upload de avatar
  ([`file-upload-storage`](file-upload-storage.md)) e e-mail de boas-vindas (`transactional-emails`).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Estende o recurso de usuário com o estado de onboarding e a ação de avançar/concluir. |
| `apps/api` | Rota(s) sob o guard de painel comum; o estado inicial passa a nascer em `ensureDefaultUserProfile`. Sem coleção nova — é campo no perfil existente. |
| `apps/app` | Rotas novas dentro de `(authenticated)`, formulários com os `HookForm*` já existentes; ponto de desvio no resolvedor pós-login e no `proxy.ts`. |
| `apps/web` | N/A. |
| `packages/*` | i18n nos 3 idiomas (títulos de passo, ações, progresso, erros). Nenhuma mudança em `auth`. |
| Infra/env | Nenhuma variável nova, nenhum serviço externo. Possível índice se o admin passar a filtrar por estado de onboarding — fora do corte. |

## Riscos e trade-offs

- **Interceptação mal-feita vira loop de redirect.** O repo já tem histórico nisso: a regra registrada em
  `apps/app/CLAUDE.md` é reconciliar contexto no servidor e nunca redirecionar para rota autenticada pelo
  cliente. O desvio tem de nascer server-side.
- **Custo herdado por todo fork:** um passo obrigatório entre cadastro e painel. Um fork que não quer
  onboarding precisa desligá-lo por configuração, ou vai arrancá-lo do proxy — e aí o guard de
  autenticação vai junto. O interruptor faz parte do corte, não é refinamento.
- **Perfis pré-existentes.** Contas criadas antes do recurso não têm o estado; se o default for
  "incompleto", todo usuário legado é interceptado. Concluído por omissão é mais seguro.
- Passo obrigatório aumenta o abandono entre cadastro e primeira sessão; curto (2–3 passos) e pulável é
  mitigação, não solução.

## Sinais de pronto

- Um usuário recém-cadastrado cai no onboarding, e não no painel.
- Fechar a aba no meio e voltar retoma no mesmo passo, com o que já foi preenchido.
- Concluir leva ao destino que o usuário pedia antes de ser interceptado (deep link preservado).
- Um usuário que já concluiu nunca vê o fluxo de novo, inclusive após novo login.
- Nenhuma string do fluxo está fora do dictionary, nos 3 idiomas.
- Desligar o recurso por configuração devolve o comportamento atual, sem tocar em guard de auth.

## Perguntas em aberto

- Interceptar no `proxy.ts` (todas as rotas do painel) ou só no resolvedor pós-login? — **recomendação:**
  no proxy, porque só ele cobre quem volta por sessão já existente sem passar por login.
- O onboarding é ligado por padrão no boilerplate? — **recomendação:** sim, ligado, com interruptor de
  configuração; um core de MVPs deve entregar o caminho bom por default.
- Perfis antigos entram como completos ou incompletos? — **recomendação:** completos, para não
  interceptar quem já usa o fork.
