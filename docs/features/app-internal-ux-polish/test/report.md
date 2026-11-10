# Relatório de QA: app-internal-ux-polish

Branch `feat/app-internal-ux-polish` (12 commits sobre `origin/main`). Nenhum commit nem branch criados nesta etapa; as mudanças abaixo ficam no working tree para o `/review`.

Caminhos encurtados: `ui/` = `apps/app/shared/components/ui/`.

## Resumo

- Todos os testes passaram: `pnpm test` do root com 4163 testes em 15 tarefas, e `pnpm e2e` com 29 de 29.
- Dos 13 itens de "Verificar no `/test`", 11 foram confirmados, 1 caiu (item 8, foco escondido pelo rodapé fixo, que já existia antes da mudança) e 1 ficou parcial (item 10: a URL foi confirmada, o aviso da Stripe é 🔒).
- Achei e corrigi um defeito: o sub-item ativo de Configurações no menu lateral tinha `aria-current` mas nenhum destaque visual.
- As 5 lacunas herdadas foram fechadas: 2 com teste novo e 3 por medição no navegador.
- Criei 7 testes Vitest, todos na faixa barata.

## Cobertura

### Comandos e resultados

| comando | resultado |
|---------|-----------|
| `pnpm --filter app test` (antes dos testes novos) | 135 arquivos, 1191 testes, verdes |
| `pnpm --filter app test` (depois dos testes novos e da correção) | 135 arquivos, 1198 testes, verdes |
| `pnpm --filter @repo/design-system test` | 1ª execução: 4 falhas e 1 erro, com carga média da máquina entre 31 e 39 e 236 s de duração. 2ª execução: 14 arquivos, 172 testes verdes. No `pnpm test` do root: 172 verdes |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes verdes (paridade pt-br/en/es) |
| `pnpm --filter e2e test` | 2 arquivos, 17 testes verdes |
| `pnpm --filter app typecheck` | sem erro (rodado de novo depois da correção) |
| `pnpm --filter @repo/design-system typecheck` | sem erro |
| `pnpm --filter e2e typecheck` | sem erro |
| `pnpm check` | 1069 arquivos, nenhum erro |
| `pnpm e2e` (JDK 21) | 29 passed em 3,3 min, saída 0 |
| `pnpm test` (root, JDK 21, sem `--force`) | 15 tarefas com sucesso, 0 do cache, 2 min 2 s, saída 0 |

As falhas da primeira execução do design system não se repetiram em duas execuções seguintes. Só guardei o fim da saída, então não sei quais foram os 4 testes. A duração quatro vezes maior que a normal e a carga da máquina apontam para timeout, mas isso é inferência. Se reaparecer no CI, vale investigar.

Números do `pnpm test` do root, por tarefa:

```
@repo/security:test          45
@repo/payments:test          22
@repo/next-config:test       32
@repo/shared:test            56
@repo/internationalization   67
@repo/auth:test             136
@repo/sdk:test               15
@repo/email:test            208
@repo/design-system:test    172
@repo/analytics:test         34
web:test                    208
api:test                   1679
api:test:emulator           274
app:test                   1198
e2e:test                     17
total                      4163
```

O `pnpm e2e` rodou o setup (seed, compilação, login do usuário comum e do admin), `a11yDark.spec.ts` (12 rotas, incluindo `account?tab=profile`, `security` e `privacy`), `accountSettings.spec.ts` (3 testes), `entityCrud`, `landing`, `organizationOwnership`, `panelSwitch`, `signIn` (4) e `signUp`. O log do app mostra `[request] failed ... /pt-br/onboarding` e `Could not request the verification email ... 503` durante `signUp` e `signIn`. Os testes passaram; os erros vêm do envio de e-mail sem Resend no ambiente, fora do escopo desta entrega.

### Testes criados

| arquivo | caso | o que prova |
|---------|------|-------------|
| `apps/app/__tests__/entitiesListReadOnly.test.tsx` | `renders the add action next to the page title and keeps the breadcrumb bar free of it` | um único `h1`; o `AddButton` fica no bloco do `PageHeader` e fora do `<header>` do breadcrumb |
| idem | `keeps the title visible while the list is loading` | `h1` e ação continuam na tela com `isLoading`, sem a tabela |
| `apps/app/__tests__/usersListLastAccess.test.tsx` | `renders the add action next to the page title and keeps the breadcrumb bar free of it` | o mesmo para a lista de usuários do admin |
| `apps/app/__tests__/pageShell.test.tsx` | `reserva a barra do breadcrumb com a mesma altura do Header` | o `PageSkeleton` abre com a faixa `h-16` |
| idem | `usa a mesma classe de corpo e de largura que o Container` | corpo do skeleton e `Container` com `width="narrow"` têm a mesma classe |
| idem | `só reserva descrição e ações quando a tela tem` | `description` e `actions` acrescentam exatamente dois placeholders |
| idem | `renderiza o corpo da carga abaixo do título` | o filho (tabela, formulário) é renderizado |

## Decisões de custo de teste

Nenhum teste da faixa cara foi criado. A entrega não mexe em API, Firestore, regras nem sessão: é UI e roteamento do cliente.

| módulo tocado | decisão |
|---------------|---------|
| `EntitiesListClient`, `UsersListClient` | caso novo no arquivo de teste que já existia, reaproveitando os mocks. A posição na tela foi medida no navegador |
| `PageSkeleton` | unitário barato para o contrato de classes; a geometria real foi medida no navegador |
| `Sidebar` (correção de classe) | sem teste novo. `sidebarActiveQuery.test.tsx` já cobre `aria-current` e `data-active`; a classe é visual e foi medida no navegador |
| `AccountTabs`, `accountTabRouting`, `navActive` | já cobertos pelos testes do `/develop` e pelo `accountSettings.spec.ts`, que rodou nesta etapa |
| blocos da conta, diálogos | já cobertos por `accountSecurityForm`, `accountSessionsPanel`, `accountSignInMethodsPanel`, `accountPrivacyPanel` e `settingsSection`; o comportamento no navegador foi medido aqui |

## Verificar no `/test`

| # | item | veredito | instrumento e medida |
|---|------|----------|----------------------|
| 1 | `replaceState` atualiza `useSearchParams` e o link do menu troca a seção sem recarregar | confirmado | `pnpm e2e`: os 3 testes de `accountSettings.spec.ts` passaram. No agent-browser, ao clicar em "Segurança" no menu: `sameH1: true`, `navEntries: 1` (sem reload), `aria-current` em "Segurança", aba selecionada "Segurança" |
| 2 | link do menu com a conta aberta: flash, remontagem, texto digitado | confirmado, com uma observação | `MutationObserver` contou 0 nós de skeleton inseridos; mesmo nó de `h1` e de `tablist` antes e depois. O texto digitado no nome sem salvar se perdeu ao voltar ao perfil, porque o `TabsContent` do Radix desmonta o painel inativo. A perda vem da troca de seção, não do menu. Medi saindo pelo menu; pela aba o painel também desmonta, mas não medi esse caminho separadamente |
| 3 | botão voltar depois de várias abas | confirmado | `history.length` igual a 6 antes e depois de clicar em Segurança, Preferências e Privacidade; `back` levou a `/pt-br/entities` |
| 4 | navegação da conta a 375 e 1280 px em en e es | confirmado | `en ?tab=preferences`, `es ?tab=privacy` e `pt-br` nas duas larguras: `scrollWidth <= innerWidth` em todas; select visível só a 375 px (224 px de largura) e lista vertical só a 1280 px (192 px); 5 abas com 38 px de altura cada, sem sobreposição |
| 5 | contraste do gatilho inativo em light | confirmado | cálculo WCAG no navegador sobre a cor composta: 5,25:1 em light e 7,66:1 em dark |
| 6 | salto entre `loading.tsx` e conteúdo | confirmado para título e breadcrumb | `MutationObserver` gravou a posição do placeholder do título durante a navegação e comparei com o `h1` final: deslocamento de 0 px em x e y nas oito rotas. O placeholder do breadcrumb tem 16 px de altura e o breadcrumb real 20 px, os dois centrados na faixa de 64 px. Não medi se a carga de `min-h-[50vh]` empurra o rodapé |
| 7 | breadcrumb alinhado ao título sem o `px-4` do `Header` | confirmado; `onboarding` 🔒 | `crumbLeft == h1Left` em 13 rotas medidas (273 px a 1280 px, 16 px a 375 px). No `playground`, breadcrumb e painel ficam em 273 px. O `onboarding` redireciona para a home com o usuário do seed já onboarded e `ONBOARDING_ENABLED` vazio; o `signUp.spec.ts` passa por ele, sem medir alinhamento |
| 8 | `Footer` fixo a 375 px esconde o campo focado | derrubado | em editar entidade a 375 px, a seta no grupo "Gênero" levou o foco ao rádio "Outro", que ficou 100% atrás da barra (rádio de 764 a 780 px, barra de 743 a 812 px), sem rolagem. Com Tab, nenhum campo ficou coberto. Em editar usuário, 0 campos cobertos. Ver "Achados" |
| 9 | diálogos de trocar e-mail e excluir conta a 375 px | confirmado | `flexDirection: column-reverse`, botões com 293 px; foco inicial em `newEmail` e em `currentPassword`; cancelar `type="button"`; com campo preenchido, Cancelar fechou sem requisição à API e o foco voltou para "Trocar e-mail" e para "Excluir minha conta" |
| 10 | `checkout` preservado entre seções | confirmado na URL; aviso 🔒 | `?tab=billing&checkout=success&plan=price_qa`, depois Perfil (`?tab=profile&checkout=success&plan=price_qa`) e de volta Cobrança (`?tab=billing&checkout=success&plan=price_qa`). Sem Stripe, o painel mostra "Cobrança em breve" e não há aviso para conferir |
| 11 | personificação | confirmado | admin do seed em "Painel do usuário" atuando como o usuário comum: aviso "Modo somente leitura" como primeiro elemento da coluna, acima do `h2`, nas cinco seções; nenhum botão de ação habilitado (ficam habilitados só os campos, os botões de mostrar senha, "Atualizar" das sessões e "Escolher imagem", sem botão de salvar ativo); `aria-current` em "Privacidade" |
| 12 | modo `simple` | confirmado | app reiniciado com `NEXT_PUBLIC_PRODUCT_MODE=simple`: `?tab=billing&checkout=success` virou `?tab=profile&checkout=success`; abas, opções do select e menu sem "Cobrança" |
| 13 | `AddButton` primário em light e dark | confirmado | `variant="default"`, 17,18:1 nos dois temas, nas listas de entidades e de usuários, no topo a 128 px junto ao `h1` e fora do `header` |

## Achados

### Corrigido nesta etapa: sub-item ativo do menu sem destaque

`ui/Sidebar.tsx`: o `SidebarMenuSubButton` dos sub-itens de Configurações recebeu `className={ACTIVE_ITEM_CLASS}`, a mesma classe dos itens de primeiro nível.

Antes, o sub-item ativo tinha `aria-current="page"` e `data-active="true"`, mas peso 400, fundo transparente e nenhuma barra; nada o distinguia visualmente dos outros. A causa: o estilo global do antd `a { background-color: transparent }` fica fora de `@layer` e vence a utilitária `data-[active=true]:bg-sidebar-accent`, que está em `@layer utilities`. Por isso os itens de primeiro nível também ficam sem fundo e mostram só o negrito e a barra. Depois da correção, o sub-item ativo tem peso 600 e barra de 3 px; os outros continuam com 400.

Rodei de novo `pnpm --filter app test` (1198 verdes), `pnpm --filter app typecheck` e `pnpm check`.

### Não corrigido: foco escondido pelo rodapé fixo

Repro: editar entidade a 375 x 812, focar o rádio marcado de "Gênero" e apertar seta para baixo duas vezes. O rádio "Outro" recebe o foco e é selecionado atrás da barra fixa de ações, sem rolagem. Isso falha o WCAG 2.2 SC 2.4.11. O rodapé fixo já existia antes desta entrega, e o plano decidiu mantê-lo nos formulários de página inteira. Corrigir exige `scroll-padding-bottom` no contêiner de rolagem ou `scroll-margin` nos campos, o que muda todas as telas com `Footer` fixo; por isso não corrigi aqui. O usuário decidiu deixar a correção fora desta entrega e tratá-la como tarefa própria.

## Lacunas herdadas

| lacuna | veredito |
|--------|----------|
| Nenhum teste de componente das telas da F2 confere a posição do `PageHeader` nem que o `AddButton` saiu do `Header` | fechada com teste: 3 casos novos nas listas de entidades e de usuários, as duas telas que têm `AddButton`. A posição do `h1` nas outras telas foi medida no navegador |
| `PageSkeleton` sem teste | fechada com teste (4 casos em `pageShell.test.tsx`) e com a medida de 0 px no navegador |
| Troca de seção pelo select coberta só no jsdom | fechada na passada: no navegador real a 375 px, o select levou a `?tab=privacy` com o `h2` "Privacy" e sem nova entrada no histórico. Continua sem teste no Playwright |
| `Header` sem o `px-4` interno não tem teste | fechada por medição (item 7); `onboarding` não medido |
| Remontagem ao navegar pelo menu com a conta aberta | fechada por medição (item 2). A observação sobre texto não salvo foi para os follow-ups |

## Evidências e2e

Os screenshots ficam em `docs/features/app-internal-ux-polish/test/e2e/` e são descartados pelo `.gitignore`. A prova é o texto deste relatório.

- `01` e `02`: conta em en a 375 px, dark e light, com o select mostrando "Preferences".
- `03`: privacidade em pt-br a 375 px. "Excluir minha conta" fica por último, com borda e título vermelhos.
- `04` e `05`: segurança a 1280 px, antes e depois da correção do sub-item ativo. No `05`, "Segurança" aparece em negrito e com barra.
- `06` e `07`: editar entidade a 1280 px (896 px de largura) e a 375 px com o foco no rádio atrás da barra.
- `08` e `09`: diálogos de e-mail e de exclusão a 375 px, com o rodapé empilhado.
- `10` e `11`: lista de entidades a 1280 px em light e dark. "Novo" é primário e a tabela antd fica escura.
- `12`: `playground` em dark, com o breadcrumb alinhado ao painel.
- `13`: segurança a 375 px em dark.
- `14`: cobrança com `checkout=success`, mostrando "Cobrança em breve".
- `15`: editar usuário do admin a 375 px em dark.
- `16`: privacidade durante a personificação, com o aviso no topo.
- `17`: conta no modo `simple`, sem "Cobrança".

O tema do agent-browser segue o do sistema operacional, que estava escuro. Forcei o tema de cada medida com `set media`.

## Ambiente do e2e

Às 11:55 e de novo antes de subir, as portas 3000, 3001, 3002, 3003, 9099, 8080, 4001 e 9199 estavam livres. Não reutilizei nada do usuário.

1. O `pnpm e2e` subiu e derrubou o próprio stack (emuladores, api, app, web) pelo `webServer` do Playwright. Ao terminar, as portas estavam livres.
2. Para a passada com agent-browser, subi com o ambiente do `buildStackEnv` do E2E (só emulador, sem o `.env` local):
   - `pnpm emulators` (PID 65869), depois `scripts/seed-emulator.mjs`;
   - `next dev -p 3002` da api (PID 66026);
   - `next dev -p 3000` do app (PID 66028). Reiniciei o app como PID 15153 com `NEXT_PUBLIC_PRODUCT_MODE=simple` para o item 12.
3. No fim, matei esses PIDs e seus filhos (o `next-server` de cada um) e mandei SIGINT aos emuladores. Conferi com `lsof -ti tcp:<porta> -sTCP:LISTEN` que 3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199 e 9150 voltaram vazias. Nenhum `pkill -f node`.

O `next dev` do Next 16 gerou `apps/api/AGENTS.md`, `apps/app/AGENTS.md` e `apps/web/AGENTS.md` ao subir ("Generated AGENTS.md for AI agents"). Apaguei os três, que não existiam antes da etapa. Para evitar que voltem, dá para ligar `agentRules: false` no `next.config` ou ignorar esses arquivos no `.gitignore`.

A carga média da máquina ficou entre 16 e 39 durante a etapa, e alguns comandos do agent-browser falharam com `Resource temporarily unavailable`. Repeti cada um isoladamente, sempre em sequência.

## Estado de dev alterado

Só no emulador, que morre com o processo e é recriado pelo seed: o nome de exibição do usuário comum virou "Usuario QA", uma sessão extra desse usuário foi criada e encerrada, e as preferências foram salvas sem mudar valor. Nenhuma conta foi criada em projeto Firebase real, então nada entra no `docs/PRE-PRODUCTION.md`.

## Cross-check

| eixo | resultado |
|------|-----------|
| `apps/app` × `apps/web` | só o `apps/app` mudou; o CTA de preços do `web` (`?tab=billing&plan=`) cai na cobrança, como mostra o item 10 |
| comum × admin × personificação | os três medidos |
| `subscription` × `simple` | os dois medidos |
| mobile × desktop | 375 e 1280 px em todas as telas do corte |
| light × dark | os dois, em todas as telas do corte |
| pt-br × en × es | conta nos três idiomas e nas duas larguras; listas, criar, equipe e home em en ou es a 375 px |

## O que falta testar e follow-ups

- Foco escondido pelo rodapé fixo nos formulários de página inteira (achado acima). Sugestão: `scroll-padding-bottom` do tamanho da barra no contêiner de rolagem.
- O estilo global `a` do antd fora de `@layer` anula utilitárias de fundo em links do app inteiro. A correção desta etapa contorna o problema no menu; a origem continua lá.
- Texto não salvo se perde ao trocar de seção da conta. Falta decidir entre um aviso de alterações pendentes e `forceMount` nos painéis.
- O aviso de checkout com Stripe real e a conta só com Google ficam 🔒 até existir Stripe de teste e OAuth no ambiente.
- Não há teste no Playwright para o select abaixo de `lg`.
- O alinhamento do breadcrumb no `onboarding` não foi medido.
- As 4 falhas intermitentes da primeira execução do `@repo/design-system` não foram identificadas.

## Segredos

Varri este arquivo e o `criterios-aceite.md` atrás de senha, token e chave. As contas aparecem só por papel ("usuário comum do seed", "admin do seed"); a senha do seed não está aqui.
