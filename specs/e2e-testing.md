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
updated: 2026-09-15
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
  o fluxo e conferindo responsivo e tema. A regra é reforçada em `:143` e `:152`. A skill vive em
  `.claude/skills/agent-browser`.
- A prova de que a prática é levada a sério: `docs/features/auth-panel-context/test/e2e/` guarda **22
  capturas de tela versionadas** (e mais 5 em `review/`), cobrindo desktop e mobile, tema claro e escuro,
  incluindo o fluxo de impersonação.
- Suíte automatizada atual (**remedida em 2026-09-15, rodando o gate**): **9 tasks de teste / 860 testes
  em 88 arquivos**, todos de unidade/integração estreita — `apps/api` 315, `apps/app` 262,
  `@repo/email` 137, `@repo/auth` 38, `@repo/security` 31, `apps/web` 27, `@repo/internationalization` 27,
  `@repo/shared` 15, `@repo/payments` 8. **Nenhum sobe um app de verdade**, e **nenhuma** das nove configs
  declara **cobertura**: não existe medida nem baseline para discutir. *(Eram 573 em 63 arquivos, depois
  750 em 74; o crescimento é das PRs #10, #11 e #12. O que **não** mudou em nenhuma rodada: seguem **9**
  tasks e **9** configs de Vitest, **nenhuma** declara `testTimeout` — 0 ocorrências no repo — e não há
  Playwright, Cypress nem `axe` em `package.json` nenhum. O número subiu; a lacuna é a mesma.)*
- 🔴 **O gate instável deixou de ser previsão: ele FALHOU na auditoria de 2026-09-15.** Rodando
  `pnpm turbo run lint typecheck test --force` duas vezes seguidas no mesmo workspace, a **primeira
  falhou** (`app#test`, 21/23 tasks) e a segunda passou —
  `apps/app/__tests__/accountSecurityForm.test.tsx > "só encerra as sessões depois da confirmação no
  diálogo"` estourou o default de **5000 ms**. Isolado, o mesmo teste leva **390–986 ms**.
  **Taxa de falha observada: 1 em 2.**
  Repare no que isso diz sobre a causa: o arquivo que estourou **não é** nenhum dos dois
  `securityPolicySources.test.ts` que a discussão vinha perseguindo — é um teste de **componente**, novo,
  da PR #12. Ou seja, a causa não é "estes dois arquivos são lentos": é que **9 configs sem `testTimeout`**
  deixam a suíte inteira correndo contra 5 s **medidos sob contenção do turbo**, de modo que cada PR que
  acrescenta teste de interação aumenta a probabilidade de falha aleatória. É o argumento mais forte desta
  spec — e ele **não depende** de E2E: declarar `testTimeout` é correção de minutos, já registrada em
  `docs/PRE-PRODUCTION.md` como pré-requisito do branch protection.
- `apps/web` **entrou** na suíte (`package.json:10`, `vitest.config.mts` com `environment: "node"`) e hoje
  `__tests__/` tem **4 arquivos**: `seo.test.ts`, `contactAction.test.ts`, `securityHeaders.test.ts` e
  `securityPolicySources.test.ts` — todos com lógica pura (SEO, proxy e a action de contato exercitados
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
- **Argumento a favor desta spec, revisto (remedido em 2026-09-14):** uma auditoria anterior observou
  `apps/app/__tests__/securityPolicySources.test.ts:94` estourar o `testTimeout` padrão de 5000 ms numa
  execução de `pnpm turbo run lint typecheck test --force`. Reexecutado **3 vezes seguidas**, o mesmo
  comando fechou **23/23 tasks verdes** nas três rodadas — a falha **não reproduziu**. A causa estrutural
  que a explicaria continua real e sem mitigação: cada caso faz `vi.resetModules()` + `await
  import("@/proxy")` (`:63-64`), reconstruindo o grafo inteiro do proxy, e **nenhuma config de vitest do
  repositório declara `testTimeout`**. Ou seja: é uma observação isolada e não reproduzida, não um gate
  vermelho de pé — mas o risco estrutural que a explicaria segue de pé, e é exatamente o que a prática 2
  desta spec precisa que seja confiável.
  > 🔴 **A documentação estava olhando para o arquivo errado (achado de 2026-09-14).** Existem **DOIS**
  > arquivos `securityPolicySources.test.ts` — `apps/app/__tests__/` e `apps/web/__tests__/` — e toda a
  > análise acima só conhecia o primeiro. Medido no gate completo
  > (`pnpm turbo run lint typecheck test --force`): o da **`apps/web`** levou **3491 ms** de arquivo, com
  > um **único teste em 3089 ms**, contra 387–556 ms quando rodado isolado; o da `apps/app` levou 3577 ms
  > com pior caso de 2434 ms, contra 616–914 ms isolado. Com o default de **5 s** do Vitest, **sob
  > contenção o pior caso chega a 62% do timeout** — e **o arquivo mais próximo de estourar não é o que a
  > documentação nomeia**. A PR #11 ainda acrescentou 41 linhas ao arquivo da `apps/app` (o bloco
  > `describe("image sources follow the storage bucket")`, `:155`). O argumento estrutural desta spec
  > ficou **mais forte**, não mais fraco: o gate depende de margem de tempo que ninguém mede, num arquivo
  > que ninguém estava vigiando.
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
- **Dependências duras.** Sem `firebase-emulator-seed` os testes escreveriam num Firebase real, disputando
  dados entre execuções; sem `ci-pipeline`, uma suíte que só roda localmente é a validação manual de hoje,
  com mais manutenção e menos julgamento.
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

- Executar E2E em toda PR ou só quando o diff toca `apps/`? — **recomendação:** só quando toca app ou
  design system; PRs de documentação não devem esperar por navegador.
- Quais fluxos entram nos 5–10 iniciais? — **recomendação:** cadastro, login, CRUD do slice de referência,
  troca de painel comum/admin e a página inicial da landing. Assinatura fica de fora até estabilizar.
- Falhar em violações graves de acessibilidade já no primeiro corte, ou só reportar por um período?
  — **recomendação:** falhar só nas mais graves, com lista de exceções inicial, como a prática 17 sugere.
