---
slug: data-rights-lgpd
title: "Direitos do titular: exportar dados e excluir conta"
task: -
spec: data-rights-lgpd
branch: feat/data-rights-lgpd
epic: -
updated: 2026-09-23 23:30
---

# Pipeline — Direitos do titular: exportar dados e excluir conta

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-23 20:19 | analyze/plan.md | Export síncrono e expurgo real da conta pelo titular, com arquivos e assinatura como pontos de extensão que degradam |
| develop | done    | 2026-09-23 21:04 | develop/handoff.md | Slice inteiro entregue: export síncrono, expurgo em 6 passos nomeados, aba de privacidade e páginas legais; 8 desvios registrados |
| review  | done    | 2026-09-23 23:30 | review/review.md | 5 correções com teste, a última sendo a faixa de abas que alargava a página em 375 px (D1 do `/test`); D2 fica como achado; branch `feat/data-rights-lgpd`; 20 commits aplicados |
| test    | done    | 2026-09-23 23:07 | test/report.md | 38 critérios aprovados, 1 reprovado e 6 não verificáveis em 2 rodadas; expurgo provado contra o emulador, inclusive o recadastro com o mesmo e-mail; a rolagem horizontal em 375 px foi corrigida e remedida nos 3 idiomas |
| observe | pending | -                | -               | - (opcional) |

## Notas

- Os 5 itens do corte da spec entram nesta rodada. O item 3 entra recortado: Cloud Storage não está
  ativado no projeto de referência e não há chave da Stripe nem vínculo perfil↔cliente, então o expurgo de
  arquivos e o cancelamento de assinatura viram passos declarados do orquestrador que reportam `skipped`
  com motivo, verificáveis por unidade.
- As três perguntas em aberto da spec foram adotadas com a recomendação escrita nela: anonimizar o que tem
  retenção obrigatória e apagar o resto, anunciar 15 dias, e exigir reautenticação com exportação síncrona.
- O `/test` recebe uma lista de 5 itens marcados 🔒 na seção 8 do plano. Nenhum deles é falha de código.
- Nenhum índice composto novo. O desenho evita `orderBy` de propósito, porque só 1 dos 7 índices declarados
  está publicado.
- Previsão de 9 commits, com ponto de corte limpo entre a API e a superfície.
- O `/develop` corrigiu um defeito do `Footer` compartilhado que deixava o duplo clique passar durante o
  request. Afeta 8 formulários da `apps/app`, sempre no sentido de bloquear mais. Está no desvio D-7 do
  handoff.
- `NEXT_PUBLIC_PRIVACY_CONTACT` teve de ser declarada também em `apps/web/env.ts`: com `skipValidation`,
  o `createEnv` não mescla as chaves do `extends`. Desvio D-1.
- Nada do fluxo de exclusão rodou contra Firestore real ou emulador. O `/test` precisa provar o
  recadastro com o mesmo e-mail depois da exclusão.
- O `/cycle` decidiu as 3 decisões em aberto do `review.md` e elas foram implementadas na própria revisão:
  `PageFormFooter` corrigido junto do `Footer`, asserção de sujeito↔ator na rota de exclusão, e
  `anonymizeUserLabels` paginada por cursor com teto que reporta o passo como `failed`.
- O teto de 100 passagens da anonimização e o `orderBy(FieldPath.documentId())` sobre `array-contains`
  nunca rodaram contra Firestore real. Entram no item de emulador que o `/test` já tinha.
- O `/test` rodou o fluxo inteiro contra o emulador de Auth e Firestore. O expurgo apaga o perfil, as
  entidades (inclusive a soft-deletada) e a conta de Auth, e o mesmo e-mail completa um cadastro novo
  depois. A trilha sobrevive com o rótulo do titular nulo e o do operador preservado.
- Duas consultas que nunca tinham rodado contra Firestore real foram sondadas em modo leitura no projeto
  de referência: `array-contains` com `orderBy(FieldPath.documentId())`, com e sem cursor. As duas são
  servidas pelo índice automático, sem `FAILED_PRECONDITION`.
- Rodada 1 reprovou a rolagem horizontal em 375 px: a faixa de abas passou a medir 429 px com a quinta aba,
  contra 344 px com quatro, e o `TabsList` é `inline-flex w-fit`. O `revisor-codigo` envolveu a faixa num
  contêiner `overflow-x-auto overflow-y-hidden`, sem tocar no pacote de design system (que o
  `pnpm bump-ui` sobrescreveria).
- Rodada 2 mediu a correção nos 3 idiomas a 375 px: `scrollWidth` do documento é 375 em pt-br, en e es, e a
  página parou de rolar. A faixa em si mede 429, 366 e 433, agora contida. Todas as 5 abas seguem
  alcançáveis (percurso de 86 px em pt-br, 90 em es, 23 em en) e o `overflow-y-hidden` não esconde
  indicador, porque a variante `default` marca a seleção com pílula de fundo e o `after:` tem opacidade 0.
  Aresta registrada: a aba ativa não é rolada para o centro na montagem.
- Defeito pré-existente confirmado na tela: trocar de aba pela barra lateral muda a URL e não muda a aba.
  Acontece igual com `?tab=security`, então não é regressão desta entrega. A entrega acrescentou um
  terceiro item de barra lateral que exercita o mecanismo, então a superfície cresceu sem o defeito ser
  novo. A correção ingênua está descartada com motivo: `window.history.replaceState` deixa o
  `useSearchParams()` desatualizado.
- Duas das quatro lacunas de teste foram fechadas nesta etapa (exceção de `readStorageObjects` e o teto de
  passadas do `purgeAll`). As outras duas seguem abertas: `listObjectPaths`/`deleteObjectsByPrefix` por
  falta de bucket, e o deep link do `AccountTabs` de propósito, porque o teste nasceria fixando o defeito.
- Rodada 2 do vai-e-volta com o `/test`: a faixa de abas ganhou contêiner de rolagem no call site, porque
  `pnpm bump-ui` usa `--overwrite` e uma correção em `tabs.tsx` não sobreviveria. `h-auto flex-wrap` foi
  descartado com medição: o `h-9` da variante `group-data` sobrevive ao `tailwind-merge` e cortaria a
  segunda linha de abas.
- O deep link das abas (`?tab=`) fica defeituoso de propósito, e a lacuna de teste correspondente fica
  **aberta de propósito**. Corrigir exige trocar `history.replaceState` por `router.replace`, revertendo a
  decisão comentada em `AccountTabs.tsx:48-50`. É decisão de produto.
- O usuário respondeu as três perguntas de produto do relatório do ciclo: o teto de 5000 registros do
  export fica como está; a inacessibilidade da aba no modo `simple` vira pendência escrita em
  `docs/PRE-PRODUCTION.md`, para ser tratada depois; e a ação do admin muda de nome.
- A ação do admin virou **Arquivar**, não "Desativar" como a recomendação original dizia. A linha da tabela
  de usuários já tem um `Switch` que liga e desliga a conta no Firebase Auth, rotulado "Ativo"/"Desativado",
  e reusar essa palavra para o soft delete trocaria uma ambiguidade por outra pior. A `ActionsMenu` ganhou
  uma prop opcional para o call site sobrescrever os rótulos, com os três textos nos 3 idiomas. Cinco casos
  em `usersListArchiveLabels.test.tsx`, conferidos por mutação.
- A mudança de nome entrou **depois** da passada de browser do `/test`, então ela tem prova por teste e não
  por tela. É copy e uma prop opcional, e a `ActionsMenu` cai de volta no dicionário compartilhado quando
  ninguém passa a prop.
