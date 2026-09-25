---
id: e2e-testing
title: Testes E2E e acessibilidade automatizada
status: proposed
value: médio
effort: G
audience: dx
area: [raiz, apps/app, apps/web, packages/design-system]
mode: ambos
depends_on: [ci-pipeline, firebase-emulator-seed]
contends_on: [package.json, turbo.json, .github/workflows/ci.yml]
feature: -
updated: 2026-09-25
---

# Testes E2E e acessibilidade automatizada

## Problema

Os fluxos que mais importam neste boilerplate — cadastrar, entrar, trocar de painel, criar um registro,
assinar — nunca são exercitados de ponta a ponta por nada que rode sozinho. Eles são validados **muito
bem**, mas por uma pessoa ou um agent dirigindo o navegador, uma vez, no momento da entrega. A garantia
expira: um refactor duas semanas depois quebra o login e nada acusa até alguém repetir o roteiro. Como
cada fork herda esses fluxos praticamente intactos, uma regressão no core é uma regressão em todos os MVPs
gerados. O mesmo vale para acessibilidade: contraste, rótulo e `aria-label` sem tradução só aparecem se
alguém olhar.

## O que já existe no repo

- **Validação visual é obrigatória e funciona.** `CLAUDE.md:70` (regra de ouro 11) exige que todo fluxo que
  toca UI e toda entrega de código sejam validados com a skill `agent-browser` — subindo o app, percorrendo
  o fluxo e conferindo responsivo e tema. A regra é reforçada em `:70` e `:146` — as duas únicas menções a `agent-browser` no arquivo. A skill vive em
  `.claude/skills/agent-browser`.
- A prova de que a prática é levada a sério: `docs/features/auth-panel-context/test/e2e/` guarda **22
  capturas de tela versionadas** (e mais **4** em `review/` — eram 5 na contagem anterior, que somou o
  `review.md` junto dos PNGs), cobrindo desktop e mobile, tema claro e escuro, incluindo o fluxo de
  impersonação.
- Suíte automatizada atual (**remedida em 2026-09-25, rodando o gate sem cache com o `HEAD` em `a1f87d0`,
  já com a PR #25 mergeada**): **10 tasks de teste / 1817 testes em 180 arquivos**, todos de
  unidade/integração estreita — `apps/api` 804 em 66 arquivos, `apps/app` 559 em 73, `@repo/email` 137 em 7,
  `@repo/auth` 101 em 8, `@repo/shared` 44 em 4, `@repo/internationalization` 44 em 5, `apps/web` 41 em 8,
  `@repo/analytics` 34 em 2, `@repo/security` 31 em 3, `@repo/payments` 22 em 4. **Nenhum sobe um
  app de verdade**, e **nenhuma** das dez configs declara **cobertura**: não existe medida nem baseline para
  discutir. *(Eram 573 em 63 arquivos, depois 750 em 74, 860 em 88, 918 em 94, 981 em 102, 1038 em 107,
  1091 em 112, 1227 em 124, 1276 em 130, 1325 em 134, 1378 em 137, 1434 em 145, 1547 em 158 e 1615 em 164; o
  crescimento vem das PRs #10 a #25. A PR #25 acrescentou 6 arquivos em `apps/api`, 5 em `apps/app`, 2 em
  `apps/web` e 3 em `@repo/payments`. Seguem **10** tasks e **10** configs de Vitest, e não há
  Playwright, Cypress nem `axe` em `package.json` nenhum. O número subiu; a lacuna é a mesma.)*
  > ✅ **O teste instável de 2026-09-19 foi consertado, e com ele caiu o argumento mais concreto que esta
  > spec tinha.** A execução de CI da PR #21 (`gh run 35456187047`) havia fechado vermelha porque
  > `apps/api/__tests__/baseRepository.test.ts:477` afirma `created.updatedAt === created.createdAt` e o
  > repositório produzia os dois instantes com duas chamadas separadas a `new Date()`. O primeiro commit da
  > PR #22 trocou isso por um `const createdAt` único, reusado nos dois campos
  > (`apps/api/(shared)/repositories/base.repository.ts:167-171`, âncora remedida em 2026-09-23), com a regra escrita em `:164-166`. A CI
  > da branch da PR #22 fechou `success` (`gh run 35544220556`) e a de merge também (`gh run 35544765975`).
  > **O que continua verdadeiro é a parte estrutural, e é menor:** nenhum gate deste repositório distingue
  > teste que passa de teste que passa quase sempre. A diferença é que agora não há caso concreto em
  > aberto, só a ausência do mecanismo. Uma ocorrência consertada não sustenta esforço **G**.

  > **Estes números envelhecem a cada PR, e o método de medição pegou.** Os valores anteriores
  > (1227 em 124) tinham sido gravados dentro da própria PR #19, antes de os commits de código dela
  > entrarem. Os de 2026-09-17, os de 2026-09-19, os da rodada pós-PR #22 e estes saíram do gate sem
  > cache com o merge já em `main` — quatro rodadas seguidas medindo depois, e não durante.
  > **O maior salto foi em `@repo/auth`: 62 → 101 testes, 6 → 8 arquivos** — 39 dos 49 que a PR #20 somou.
  > E é um argumento para esta spec, não contra: o caminho que ganhou os 39 testes é justamente aquele cuja
  > verificação ponta a ponta ficou 🔒, porque o emulador de Auth aceita o cookie depois de
  > `revokeRefreshTokens`. Os testes provam o que o emulador alcança. O que ele não alcança continua sem
  > prova, e é disso que esta spec trata.
- 🆕 **A PR #23 trouxe um caso concreto novo, e ele é do tipo que esta spec existe para pegar.** A quinta aba
  da área de conta fez a faixa de abas medir 429 px num viewport de 375 px, e a página inteira ganhou
  rolagem horizontal (`docs/features/data-rights-lgpd/test/report.md`, defeito D1). Nenhum teste da suíte
  acusou: quem pegou foi a passada manual de browser do `/test`. A correção veio com
  um teste jsdom (`apps/app/__tests__/accountTabsOverflow.test.tsx`), que fixa a classe do contêiner e não
  mede largura nenhuma, porque jsdom não faz layout. É a mesma lacuna vista do outro lado: regressão de
  layout só é detectada por quem renderiza de verdade.
- 🆕 **A PR #24 mudou o primeiro fluxo do corte.** Desde o onboarding, quem se cadastra não cai no painel:
  o layout da área comum desvia a conta nova para `/{locale}/onboarding` (`apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:38-41`).
  O fluxo "cadastro" do item 1 passa a atravessar dois passos a mais, ou precisa rodar com
  `ONBOARDING_ENABLED="false"`. As contas do seed não têm o campo e contam como concluídas, então o fluxo
  "login" segue igual. O `/test` da PR #24 fechou 20 critérios dirigindo o browser à mão, e dois deles só
  caíram nessa passada (o idioma pré-selecionado errado e o 409 que não voltava de passo). A mesma passada
  achou a perda da query string no deep link, que nenhum teste da suíte cobre.
- 🆕 **`@repo/design-system` não tem task de teste, e isso já empurrou um teste para o workspace errado.**
  `packages/design-system/package.json` declara só `clean` e `typecheck`. A PR #22 precisou fixar um limite
  de largura de rótulo do `CategoryBarChart` e, sem onde pôr o teste, gravou-o em
  `packages/internationalization/__tests__/chartAxisLabels.test.ts`: ele lê o dicionário da home do admin e
  recusa rótulo com mais de 7 caracteres, com a aritmética de 375 px, 52 px por categoria e fonte de 12 px
  escrita no comentário. O teste roda e protege a tela, mas afirma algo sobre um componente que ele não
  importa, num pacote que não é o dele. O pacote de UI compartilhada é o que mais se beneficiaria de teste
  de componente, e é o único sem infraestrutura para tê-lo.
  **Segundo caso, na PR #23 (remedido em 2026-09-23):** o `ActionsMenu`
  (`packages/design-system/components/ui/action-menu.tsx`) ganhou uma prop opcional para o chamador trocar
  os rótulos, com volta ao dicionário compartilhado quando ninguém a passa. O único teste que exercita a
  mudança (`apps/app/__tests__/usersListArchiveLabels.test.tsx:37`) **substitui o componente por um mock** e
  confere só as props que a tela entrega. O caminho de volta ao dicionário, que é o que todo outro chamador
  usa, não tem teste. `git grep "components/ui/action-menu"` nos diretórios `__tests__` devolve zero.
- ✅ **O gate instável foi corrigido — e o argumento mais forte desta spec caiu junto.** Em 2026-09-15 a
  auditoria registrou aqui uma falha real: `pnpm turbo run lint typecheck test --force` rodado duas vezes
  seguidas falhou na primeira (`app#test`, 21/23 tasks), com
  `apps/app/__tests__/accountSecurityForm.test.tsx > "só encerra as sessões depois da confirmação no
  diálogo"` estourando o default de 5000 ms do Vitest. Taxa de falha observada: 1 em 2.
  **A PR #13 declarou `testTimeout: 20_000` nas 9 configs de então** (de `apps/api/vitest.config.mts:11` a
  `packages/shared/vitest.config.mts:10`); hoje são **10 de 10**, porque
  `packages/analytics/vitest.config.mts:6` nasceu na PR #16 já com o teto. A auditoria de **2026-09-16**
  remediu: o gate completo fechou **24/24 tasks, 0 em cache**, e o teste que estourava rodou em
  **1273 ms**.
  Duas coisas que o episódio ensinou sobrevivem à correção. A primeira: o teto do
  Vitest é medido **sob contenção do turbo**, não isolado — o mesmo teste levava 390–986 ms sozinho.
  A segunda: durante a discussão toda a suspeita apontava para os dois `securityPolicySources.test.ts`,
  e quem estourou foi um terceiro arquivo, de componente, recém-chegado. **A margem de tempo do gate não
  é medida por nada**, então qual arquivo está mais perto de estourar é sempre descoberta tardia. Isso é
  argumento para a prática 5 (cobertura e instrumentação do gate), não mais para E2E.
- `apps/web` **entrou** na suíte (`package.json:10`, `vitest.config.mts` com `environment: "node"`) e hoje
  `__tests__/` tem **5 arquivos**: `seo.test.ts`, `contactAction.test.ts`, `securityHeaders.test.ts`,
  `securityPolicySources.test.ts` e `instrumentationRequestError.test.ts` (novo na PR #15) — todos com
  lógica pura (SEO, proxy e a action de contato exercitados
  isoladamente), **nenhum componente da landing é renderizado por teste**. Não há Playwright, Cypress nem
  `axe` em nenhum `package.json` do repositório.
  > **Deriva corrigida (`/spec --sync`; números reatualizados em 2026-09-09, 2ª rodada):** a redação
  > original falava em 23 arquivos, três configs e `apps/web` sem script de teste. Quatro entregas mudaram
  > isso — `firestore-admin-access`, `ci-pipeline`, `api-hardening` (oitava config, `@repo/security`) e
  > `transactional-emails`, que acrescentou a **nona** (`@repo/email`, 131 testes) e levou o total de 421 a
  > **573**. **O argumento da spec não muda** — a lacuna nunca foi o número de testes unitários, e sim que
  > nada exercita um fluxo de ponta a ponta. Essa lacuna segue intacta: os 131 testes novos de e-mail
  > cobrem render e política de log, e **nenhum** deles alcança o único consumidor de produção da feature,
  > que é inalcançável pela UI.
- **O emulador e o seed, que eram pré-requisito desta spec, existem desde a PR #13.** Bloco `emulators`
  em `firebase.json:9-21`, `pnpm emulators` e `pnpm seed` em `package.json:14-15`, estado inicial em
  `apps/api/scripts/seed-emulator.mjs` (um admin e dois comuns em `:21-25`, registros de `entity` em
  `:32-87`) e uma trava que recusa semear fora do emulador em `apps/api/scripts/emulatorTarget.mjs:26-45`.
  O `depends_on` desta spec está satisfeito: **`ci-pipeline` e `firebase-emulator-seed` foram os dois
  entregues**, e o que falta aqui é trabalho próprio, não espera.
- **Teste de security rules continua sendo o buraco maior.** `@firebase/rules-unit-testing` não aparece em
  nenhum `package.json`, e `firestore.rules` e `storage.rules` seguem sem nada que exercite a regra em si.
  O emulador removeu o impedimento; a suíte é desta spec.
- **Lacuna:** a única garantia de que os fluxos principais funcionam é **humana e pontual**; nada a repete
  sozinho, e nada disso pode rodar como gate de merge.

## Evidência de mercado

- Nota: [`research/engineering-baseline.md`](research/engineering-baseline.md)
- **Prática 2 (testes E2E)** — *padrão de facto*, esforço M–G; a dor evitada é "regressão em login/checkout",
  que é exatamente o inventário de fluxos deste repo. A nota recomenda escopo enxuto — **5 a 10 fluxos**,
  não cobertura ampla — apontando para o **emulador**, nunca para o Firebase real, com rastro guardado
  quando um teste falha. Sharding só quando um runner passar de 10–15 minutos: não é o caso aqui.
- **Prática 5 (cobertura)** — *consolidada*, com a ressalva honesta de que o limiar é opcional, que limiar
  global alto "vira teatro" e que relatório por workspace **não soma** (exige consolidação na raiz).
- **Prática 17 (a11y automatizada com axe)** — *em consolidação*, **não** padrão de facto. A nota é
  explicitamente cética: axe pega **cerca de 30–40%** dos problemas reais e **não substitui** teste de
  teclado ou leitor de tela. Registra também o que costuma quebrar — não o componente de biblioteca, mas o
  wrapper do time: rótulo ausente, contraste do tema, `aria-label` sem tradução — e recomenda começar com
  lista de exceções para não travar o repositório no dia 1.
- Custo: a nota lista E2E, cobertura e axe entre os itens de **zero custo em dinheiro**.

## Proposta — corte de MVP

- [ ] Um punhado de fluxos críticos (cadastro, login, criar/editar/excluir um registro do slice de
      referência, e a troca entre painel comum e admin) roda automaticamente do navegador ao banco,
      contra o **emulador** e o estado inicial do seed — nunca contra dados reais.
- [ ] Esses fluxos rodam no CI a cada PR e bloqueiam o merge quando quebram, com evidência suficiente
      para diagnosticar a falha sem reproduzir localmente.
- [ ] Verificação automática de acessibilidade nas telas percorridas por esses fluxos, falhando apenas nas
      violações mais graves e com lista de exceções inicial, para não travar o repositório no dia 1.
- [ ] Cobertura de teste passa a ser **medida e consolidada** no repositório inteiro — sem limiar de
      bloqueio neste corte.
- [ ] A convivência com a validação visual fica **escrita**: a suíte é rede de segurança contra regressão
      e **não substitui** a regra de ouro 11 — julgamento visual, tema, responsivo e qualidade de layout
      continuam sendo do `agent-browser` e de quem entrega.

### Fora do corte

- **Substituir a validação visual do `agent-browser`.** Explicitamente fora: E2E verifica que o fluxo ainda
  funciona; não julga se a tela está bonita, alinhada ou legível no tema escuro. As duas coisas ficam, com
  papéis distintos.
- Comparação automática de imagens (regressão visual pixel a pixel): frágil, ruidosa, e concorreria mal
  com a validação por captura de tela que já existe e funciona.
- Fluxo de assinatura Stripe de ponta a ponta: depende de ambiente de teste do provedor e de webhook;
  entra depois que o básico estiver verde.
- Sharding (prática 2), limiar de cobertura que bloqueia merge, e cobertura medida em teste de navegador.
- Teste manual de teclado e leitor de tela — axe não cobre isso; continua sendo trabalho humano.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | Nenhum código; passa a ser exercitada de verdade pelos fluxos. |
| `apps/app` | Possível necessidade de identificadores estáveis nos elementos que os testes acionam. |
| `apps/web` | Entra na verificação automatizada pela primeira vez, ao menos na página inicial e no CTA. |
| `packages/*` | `design-system`: violações de acessibilidade encontradas tendem a se concentrar aqui e nos wrappers de formulário. |
| Infra/env | Ferramenta de navegador automatizado na raiz; consumo do emulador e do seed; execução no CI, com o binário do navegador em cache. Nenhum serviço pago. |

## Riscos e trade-offs

- **Teste instável é pior que teste nenhum.** Suíte de navegador é a que mais produz falha intermitente, e
  três falsos negativos bastam para o time começar a reexecutar sem ler. Se não houver disciplina de tratar
  instabilidade como bug, o valor da spec vira zero — é a razão de o `value` aqui ser **médio** e não alto.
- **Custo herdado por todo fork:** cada fork passa a arrastar uma suíte lenta que precisa ser mantida
  junto com as telas que ele mesmo mudar. Um fork que redesenha o cadastro herda testes que quebram na
  primeira hora. Mitigação é manter o escopo pequeno (5–10 fluxos) e cobrir só o que é comum a todos.
- **Sobreposição com o `agent-browser`.** Se a fronteira não estiver clara, o time acha que E2E dispensa a
  validação visual — e a qualidade de layout, que é um diferencial deste repo, se degrada sem ninguém
  perceber. A fronteira precisa estar escrita, não subentendida.
- ✅ **As duas dependências duras foram satisfeitas.** Sem `firebase-emulator-seed` os testes escreveriam
  num Firebase real, disputando dados entre execuções; sem `ci-pipeline`, uma suíte que só roda localmente
  seria a validação manual de hoje com mais manutenção. As duas specs foram entregues — `ci-pipeline` na
  PR #5 e `firebase-emulator-seed` na PR #13 —, então esta spec está **desbloqueada**. O que ela herda
  junto é uma restrição a respeitar: o seed só roda contra project id `demo-*` e recusa qualquer outro
  alvo (`apps/api/scripts/emulatorTarget.mjs:37-45`), o que a suíte E2E precisa honrar em vez de
  contornar.
- **Acessibilidade automatizada dá falsa sensação de conformidade** (prática 17): passar no axe não é ser
  acessível. Se isso não estiver dito, a spec produz o oposto do que promete.

## Sinais de pronto

- Quebrar o login de propósito faz o CI ficar vermelho na PR, sem ninguém abrir o navegador.
- Os fluxos rodam sem nenhuma credencial de projeto Firebase real configurada.
- Uma falha traz evidência suficiente para diagnosticar sem reproduzir a mão.
- Introduzir um campo de formulário sem rótulo acessível é apontado automaticamente.
- Existe um número de cobertura consolidado do repositório, comparável entre execuções.
- A documentação do fluxo de trabalho diz, sem ambiguidade, que a validação visual com `agent-browser`
  continua obrigatória em entregas de front-end.

## Perguntas em aberto

- ~~Adotar Playwright, `@axe-core/playwright` e um provedor de cobertura do Vitest como dependências de
  desenvolvimento?~~ **Aprovado pelo usuário em 2026-09-24**, como `devDependencies`.
- Executar E2E em toda PR ou só quando o diff toca `apps/`? — **recomendação:** só quando toca app ou
  design system; PRs de documentação não devem esperar por navegador.
- Quais fluxos entram nos 5–10 iniciais? — **recomendação:** cadastro, login, CRUD do slice de referência,
  troca de painel comum/admin e a página inicial da landing. Assinatura fica de fora até estabilizar.
- Falhar em violações graves de acessibilidade já no primeiro corte, ou só reportar por um período?
  — **recomendação:** falhar só nas mais graves, com lista de exceções inicial, como a prática 17 sugere.
