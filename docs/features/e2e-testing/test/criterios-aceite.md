# Critérios de Aceite (Checklist)

Feature `e2e-testing`: suíte Playwright em `apps/e2e`, verificação de acessibilidade com axe, cobertura
consolidada e jobs `changes`, `e2e` e `coverage` no CI. Os critérios vêm da seção 9 do
`analyze/plan.md`. O status de cada um, com a medição, está em [`report.md`](report.md).

- [ ] **A suíte sobe o próprio ambiente e fecha verde**
  Com os emuladores e as portas 3000/3001/3002 livres, `pnpm e2e` sobe emulador, API, app e web, roda o seed
  e termina com os 22 testes verdes (4 de setup, 9 de fluxo, 9 de acessibilidade no dark). Se o emulador já
  estiver de pé, a suíte o reaproveita; API, app e web nunca são reaproveitados.

- [ ] **Porta ocupada interrompe a suíte sem reaproveitar o servidor**
  Se qualquer uma das portas da API, do app ou da web já responde (200 ou outro status), `pnpm e2e` sai com
  código 1 antes de rodar qualquer teste, com mensagem que nomeia a URL ou a porta. Um servidor já de pé pode
  ser um `pnpm dev` carregando o `.env` real, então a suíte não pode conversar com ele. Com 200, a mensagem
  esperada é a do Playwright (`… is already used …`); com outra resposta, o `EADDRINUSE` do Next.

- [ ] **Nenhuma conexão com o projeto Firebase real**
  Mesmo com o `apps/api/.env` da máquina apontando para um projeto real, durante uma execução inteira a API
  e o app só falam com `127.0.0.1:8080`, `127.0.0.1:9099` e entre si. A conta `e2e-signup-*` criada no
  cadastro aparece no emulador. A ausência dessa conta no projeto real só se confirma com acesso a ele.

- [ ] **Alvo fora do emulador é recusado antes de subir servidor**
  Se o ambiente montado para qualquer app tiver project id sem o prefixo `demo-`, a config do Playwright lança
  no carregamento com a mensagem de `refuseSeedReason` (`Refusing to seed: the target project is "…"`), antes
  de qualquer log de `webServer`. Hosts do emulador ausentes também são recusados, com a mensagem própria.

- [ ] **Os 9 fluxos cobertos passam com URL e texto esperados**
  Landing com CTA de cadastro, cadastro com onboarding, login comum, login admin, senha errada com mensagem
  traduzida (aceita `auth/wrong-password` e `auth/invalid-credential`), deep link sem sessão voltando ao
  destino, CRUD de `entity` (criar, editar, excluir), troca de painel do admin com aviso de somente leitura em
  `/pt-br/entities` e usuário comum barrado em `/pt-br/admin`.

- [ ] **Login quebrado deixa a suíte vermelha**
  Se o `SignInForm` deixa de chamar o submit, a execução termina com código 1. O `setup` falha em "sign in as
  the common user" e os specs que dependem de sessão (`signIn`, `entityCrud`, `panelSwitch`) ficam como "did
  not run". Revertida a quebra, a suíte volta ao verde.

- [ ] **Falha deixa evidência navegável**
  Um teste que falha gera `playwright-report/` e `test-results/<teste>/` com `trace.zip`, screenshot, vídeo e
  `error-context.md`. O trace traz as requisições de rede com status e as mensagens de console do momento da
  falha.

- [ ] **Campo sem nome acessível reprova a verificação de acessibilidade**
  Um campo de formulário sem `label`, `aria-label` nem `placeholder` faz a verificação falhar com a regra
  `label`, a rota e o alvo na mensagem. A asserção é `expect.soft`: o teste continua o fluxo, reporta todas
  as telas afetadas e termina como falho. Um campo que perde o `label` mas mantém o `placeholder` passa no
  axe (o axe aceita placeholder como nome) e só é pego pelos locators `getByLabel` dos specs.

- [ ] **Allowlist tolera só o que declara**
  Violação `minor` ou `moderate` não reprova. Cada entrada da allowlist tem rota, regra, seletor e motivo, e
  só tolera o elemento que casa com o seletor naquela rota e tema. Entrada que não casa mais nada vira
  anotação `a11y-stale-exception` sem reprovar.

- [ ] **Resultado da acessibilidade é estável entre execuções**
  A mesma tela, no mesmo estado, tem o mesmo resultado do axe em execuções seguidas. Com `CI=1` (retry 1 e
  `failOnFlakyTests`), duas execuções completas seguidas terminam sem nenhum teste `flaky`, porque um teste
  que só passa no retry reprova o job.

- [ ] **Gatilho do menu de perfil tem nome desde o primeiro render**
  O botão que abre o `ProfileDropdown` no painel tem nome acessível vindo do dicionário ("Abrir menu do
  perfil", "Open profile menu", "Abrir menú del perfil") antes de o usuário do Firebase e o `GET /account`
  carregarem, com conta e usuário `null`. O nome não depende de breakpoint: no mobile, onde o primeiro nome
  fica oculto, o botão continua nomeado. O axe não acusa `button-name` nesse gatilho em nenhuma rota do painel.

- [ ] **Header da web hidrata sem refazer a árvore**
  O seletor de idioma da web não aninha `button` dentro de `button`, então o HTML do servidor já traz o
  gatilho com conteúdo e o React não registra erro de hidratação. Sem isso, o axe pode varrer o gatilho vazio
  antes de o cliente refazer a árvore e reprovar `web:/pt-br` ou `web:/pt-br/sign-up` de forma intermitente.

- [ ] **Cobertura consolidada é determinística**
  `pnpm coverage` imprime o total e grava `coverage/coverage-summary.json` e `coverage/index.html`. Duas
  execuções seguidas dão o mesmo total. `node scripts/coverage-summary.mjs` imprime uma tabela markdown com
  uma linha por workspace e o total, sem linha de `apps/e2e`.

- [ ] **O gate do CI continua sem browser**
  `pnpm turbo run lint typecheck test` segue verde, inclui `e2e#typecheck` e `e2e#test`, e nenhuma task sobe
  servidor ou browser. O `test` de `apps/e2e` é Vitest restrito a `__tests__/**/*.test.ts`.

- [ ] **Jobs do CI e pulo em PR de documentação**
  O `ci.yml` tem `verify` inalterado, `changes`, `e2e` e `coverage`. PR que só toca `docs/`, `specs/`,
  `.claude/` ou arquivos `*.md` pula `e2e` e `coverage`, e o job pulado conta como sucesso num check
  obrigatório. Push na `main` roda sempre. Nenhum job usa `secrets.`.

- [ ] **Documentação separa a suíte da passada com agent-browser**
  `CLAUDE.md`, `docs/review-checklist.md` §7, `docs/AI-WORKFLOW.md` e `docs/SETUP.md` dizem que a suíte E2E é
  rede de regressão e não substitui a passada com `agent-browser` em entrega de front-end.

- [ ] **Branch protection pede os dois checks**
  `docs/PRE-PRODUCTION.md` §9 e o runbook de `docs/SETUP.md` pedem `verify` e `e2e` como checks obrigatórios,
  e explicam que o `e2e` só aparece na busca do ruleset depois de rodar numa PR. O bloqueio real do merge
  depende dessa configuração manual no GitHub.
