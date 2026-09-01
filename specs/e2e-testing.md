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
feature: -
updated: 2026-09-01
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

- **Validação visual é obrigatória e funciona.** `CLAUDE.md:60` (regra de ouro 11) exige que todo fluxo que
  toca UI e toda entrega de código sejam validados com a skill `agent-browser` — subindo o app, percorrendo
  o fluxo e conferindo responsivo e tema. A skill vive em `.claude/skills/agent-browser`.
- A prova de que a prática é levada a sério: `docs/features/auth-panel-context/test/e2e/` guarda **22
  capturas de tela versionadas** (e mais 4 em `review/`), cobrindo desktop e mobile, tema claro e escuro,
  incluindo o fluxo de impersonação.
- Suíte automatizada atual (**medida em 2026-09-01**): **7 tasks de teste / 331 testes**, todos de
  unidade/integração estreita — `apps/api` 118, `apps/app` 135, `@repo/auth` 29, `@repo/shared` 15,
  `apps/web` 15, `@repo/internationalization` 11, `@repo/payments` 8. **Nenhum sobe um app de verdade**, e
  **nenhuma** das sete configs declara **cobertura**: não existe medida nem baseline para discutir.
- `apps/web` **entrou** na suíte (`package.json:10`, `vitest.config.mts` com `environment: "node"`,
  `__tests__/seo.test.ts`), mas só com lógica pura de SEO — **nenhum componente da landing é renderizado
  por teste**. Não há Playwright, Cypress nem `axe` em nenhum `package.json` do repositório.
  > **Deriva corrigida (`/spec --sync`, 2026-09-01):** a redação original falava em 23 arquivos, três
  > configs e `apps/web` sem script de teste. As entregas de `firestore-admin-access` e `ci-pipeline`
  > mudaram isso. **O argumento da spec não muda** — a lacuna nunca foi o número de testes unitários, e sim
  > que nada exercita um fluxo de ponta a ponta. Essa lacuna segue intacta.
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
