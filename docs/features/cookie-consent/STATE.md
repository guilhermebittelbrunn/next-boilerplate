---
slug: cookie-consent
title: Consentimento de cookies e Consent Mode
task: -
spec: cookie-consent
branch: feat/cookie-consent
epic: -
updated: 2026-09-16 19:55
---

# Pipeline — Consentimento de cookies e Consent Mode

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-16 17:21 | analyze/plan.md | Camada de consentimento em `packages/analytics` + banner no design system; as tags só carregam depois da escolha. |
| develop | done    | 2026-09-16 18:09 | develop/handoff.md | Consentimento implementado nas 4 camadas; a passada no browser pegou um defeito de Consent Mode no reload, corrigido e coberto por teste. |
| review  | done    | 2026-09-16 20:12 | review/review.md | Segunda rodada: além do bloqueante do login e da faixa que engolia clique, corrigido o rodapé da `apps/web` que o `/test` reprovou; as três correções estão medidas com `elementFromPoint`, com e sem banner. |
| test    | done    | 2026-09-16 20:12 | test/report.md  | 23 critérios aprovados e 4 não verificados por falta de ambiente autenticado ou de infra externa. O único reprovado (rodapé da `apps/web` sob o banner) voltou ao `/review`, foi corrigido e remedido. |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Rodada autônoma do `/cycle`: nada foi perguntado ao usuário. As 17 decisões tomadas no lugar dele, cada
  uma com a alternativa descartada, estão na seção 14 do `analyze/plan.md`.
- A spec conta 5 cookies; o código tem 6. Falta `sidebar_state`
  (`packages/design-system/components/ui/sidebar.tsx:28,108`). A tabela corrigida está na seção 2 do plano.
- Sem rota de API, sem documento no Firestore, sem mudança no `@repo/sdk`.
- Para ver o banner em desenvolvimento é preciso `NEXT_PUBLIC_GA_MEASUREMENT_ID="G-TEST00000"` no
  `.env.local`. Sem tag configurada o banner não aparece, e isso é o comportamento pedido.
- Quatro pré-requisitos manuais de infra (seção 11 do plano) não são satisfeitos por código e não devem
  reprovar a entrega no `/test`.
- O `/develop` corrigiu o plano num ponto: o script do Consent Mode precisa nascer com a escolha já gravada,
  senão a tag mede em modo restrito a cada recarga depois de um consentimento. Detalhe no `handoff.md`.
- O item de reabertura no `ProfileDropdown` da `app` não foi visto no browser (sem JDK 21, os emuladores do
  Firebase não sobem e não há como autenticar). Coberto por teste jsdom. O `/review` confirmou a limitação
  (a máquina tem JDK 17) e classificou o item como não verificado.
- O `/review` achou e corrigiu dois defeitos de interação do banner. O primeiro é bloqueante: na página de
  login, que nunca rolava, o banner cobria "Continuar com Google", "Esqueci minha senha" e "Cadastrar", e o
  visitante que ignorava o aviso ficava sem caminho para cadastro. O segundo: a faixa transparente do banner
  capturava clique em toda a largura da tela. As duas correções estão medidas com `elementFromPoint` no
  `review/review.md`.
- A folga do layout de autenticação depende do atributo `data-cookie-banner`, publicado pelo banner e lido
  por um seletor em `apps/app/app/[locale]/(unauthenticated)/layout.tsx:43`. Renomear um dos dois lados
  quebra em silêncio. O `/test` fechou essa lacuna com
  `apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`, que lê o seletor do layout e o aplica ao
  banner renderizado.
- O `/test` mediu, com `elementFromPoint`, o mesmo tipo de bloqueio no rodapé da `apps/web`: no fim da
  rolagem, o card do banner cobre 4 links no celular e 2 no desktop. **Corrigido na segunda rodada do
  `/review`** com a mesma folga condicional do login, agora no `<footer>`
  (`apps/web/app/[locale]/components/footer.tsx:56`). Reproduzi o defeito no navegador zerando a folga à
  mão antes de confirmar a correção, e remedi com e sem banner nas duas viewports.
- A sobreposição do banner era risco declarado na §8 do plano e atravessou `/develop` e a primeira rodada do
  `/review` sem medição. Quem acrescentar um terceiro app precisa medir o fim da rolagem dele: o banner é
  fixo na base da janela e afeta os 250 px (desktop) a 354 px (celular) inferiores de qualquer página.
- O rodapé da `apps/web` também consome `data-cookie-banner`, e esse segundo acoplamento não tem teste. A
  suíte da `web` roda em `environment: "node"`, sem jsdom, então o equivalente ao teste da `app` não cabe lá
  sem mudar a configuração.
- O `test/report.md` foi gravado pelo orquestrador da rodada, e não pelo `/test`: o harness bloqueou a
  escrita do arquivo pelo subagent. O conteúdo é o que o `/test` devolveu, com a seção do defeito atualizada
  para registrar a correção que veio depois.
- Os quatro pré-requisitos manuais desta feature passaram a constar na seção 7 de `docs/PRE-PRODUCTION.md`,
  que até então não mencionava consentimento em lugar nenhum.
