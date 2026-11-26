# Revisão: pré-condição determinística no caso 1 do E2E de foco

Escopo: hunks 1 a 4 de `apps/e2e/tests/focusNotObscured.spec.ts`. O hunk 5 (`toPass` do caso 3) é de
`app-form-layout-centered`, já revisado lá, e não foi relido.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. Não é protegida. Regex: `BRANCH INVALIDA`.
- Proposta, herdada do plano combinado (`docs/features/stripe-customer-lookup-mapper/review/review.md`):
  `feat/admin-account-forms-and-session-revocation`. Regex: `branch OK`. A tarefa só acrescenta um commit
  de teste E2E e um de docs, então o nome continua servindo.
- Nada foi criado nem renomeado: a rodada é do `/cycle`, que não cria branch. O `/review` cria a branch a
  partir da atual antes do primeiro commit.

## Revisão: `apps/e2e` (caso 1 e caso 2 do E2E de foco)

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/app/app/layout.tsx:71` e `packages/design-system/components/ui/textarea.tsx:11`: comportamento do
  produto, não do teste. Quando um textarea com várias linhas recebe foco, o Chrome rola o caret para a
  área visível, não o campo inteiro. A reserva de 80 px no `scroll-padding` vale para o caret: no run sem
  o ajuste, a linha 12 parou logo abaixo da navbar e o topo do campo ficou em -59 px. Um usuário que
  digitou uma descrição longa e volta com Shift+Tab vê exatamente isso. A WCAG 2.4.11 (AA) só reprova
  foco inteiramente encoberto, e o caret à vista atende; a 2.4.12 (AAA) não seria atendida, porque a
  parte do campo entre 0 e 64 px fica sob a navbar. Ação: nenhuma correção de produção. Forçar
  `scrollIntoView` no foco do textarea (no design system, que atinge todos os apps) brigaria com a rolagem
  nativa do caret e, num campo mais alto que a área útil (cerca de 652 px a 812 px de altura), esconderia
  o caret, que é onde o usuário está editando. `scroll-margin` no elemento não resolve, porque o alvo da
  rolagem é o caret. Registrado aqui para o `/spec --sync` avaliar se vira item de backlog.

### ✅ OK

- `setSelectionRange(0, 0)` em `focusNotObscured.spec.ts:113-115`: ajuste legítimo de setup, mantido.
  Decisão e fundamento na seção abaixo.
- A asserção de foco (`focusOverlap`, `:30-61`) não mudou: continua exigindo o controle inteiro fora das
  duas barras, em toda parada do Tab e do Shift+Tab.
- Pré-condição de `:121-124` intacta, com a mensagem original. A asserção nova de `scrollY` (`:135-138`)
  roda depois do `expect.poll` da última parada, então a rolagem suave já assentou.
- `scrollTo(0)` com `behavior: "instant"` em `:116`: a medida da pré-condição não depende de onde o `fill`
  deixou a página. Typecheck aceita o valor `"instant"` (número do handoff).
- Caso 2 (`:160`): `LONG_DESCRIPTION` tem o mesmo valor do `Array.from` inline de antes.
- Comentários de `:107-108` e `:111-112`: explicam o porquê (a finalidade da descrição longa; a rolagem
  nativa do caret, que é um caso contraintuitivo), em duas linhas cada, sem citar plano, etapa nem
  artefato do fluxo. Cumprem as duas exceções de `.claude/rules/code-comments.md`.
- Nenhum código de produção mudou. `apps/app/app/layout.tsx` sem diff.

### 👁 Verificar no `/test`

- Estabilidade: o handoff rodou o arquivo uma vez com o ajuste. Repro:
  `pnpm --filter e2e exec playwright test tests/focusNotObscured.spec.ts --project=chromium --repeat-each=10`.
  Esperado 30/30.
- Folga real com a descrição preenchida e a página no topo: número de controles abaixo da barra, menor
  `top - bar.top` entre eles e altura da descrição. O plano estima cerca de 200 px de folga e 306 px de
  campo. Repro: `page.evaluate` avulso depois do `fill`, do `setSelectionRange` e do `scrollTo(0)`, sem
  deixar log no teste.
- `scrollY` ao chegar na barra: a asserção passou, mas o número não foi registrado.
- P1 do plano (seção 6): sem `has-[[data-sticky-action-bar]]:scroll-pb-20` em `layout.tsx:71`, o caso 1
  reprova numa parada do Tab. Registrar a mensagem literal e conferir `git diff --stat apps/app/app/layout.tsx`
  vazio depois.
- P2: sem o `fill` e com viewport 375×1600, reprova na pré-condição. O handoff diz que é preciso comentar
  também o `setSelectionRange`; não é: `setSelectionRange(0, 0)` num textarea vazio é válido e não muda
  nada. Comentar só o `fill` basta.
- P3: sem o `fill` e com a viewport original, o caso passa (o estado anterior à tarefa).
- Para o achado 🟢: com o `setSelectionRange` comentado, confirmar que a reprovação é a mesma do handoff
  (`description starts at -59px, under the navbar that ends at 64px`) e que o caret da última linha fica
  visível abaixo da navbar. Restaurar depois.

## Decisão: `setSelectionRange(0, 0)` fica

A pergunta era se a linha afrouxa o teste para esconder um comportamento do produto. Não afrouxa, pelos
motivos abaixo.

1. O que o caso 1 prova é a reserva de `scroll-padding` do `<html>` contra as barras fixas. A asserção que
   mede isso não mudou e continua mais estrita que a WCAG 2.4.11: exige o controle inteiro visível.
2. Antes desta tarefa o caso 1 não preenchia a descrição. O cenário "caret na última linha, volta com
   Shift+Tab" nunca foi coberto. A linha não remove cobertura nenhuma; ela neutraliza uma condição que a
   própria folga introduziu.
3. Com o caret no fim, o navegador rola o caret, não o campo, e respeita a reserva (a linha 12 parou abaixo
   da navbar). O que reprovou não foi a reserva, foi a régua "campo inteiro" aplicada a um alvo de rolagem
   que não é o campo. Deixar o teste assim faria o caso reprovar por um comportamento nativo do navegador
   que nenhuma mudança na reserva corrige.
4. O comportamento não fica escondido: o comentário em `:111-112` descreve o que acontece com o caret no
   fim, e o achado 🟢 acima registra o efeito para o usuário, com a leitura de WCAG.

Alternativas consideradas:

- Folga por outro campo: o formulário de criar não tem outro campo que cresça com o conteúdo. Preencher
  o nome com texto longo não aumenta a altura.
- Viewport mais baixa só no caso 1: elimina o textarea do caminho, mas o plano já descartou porque a folga
  volta a depender da altura do formulário, e muda a viewport que os três casos compartilham.
- Checar a visibilidade do caret em vez do campo quando o foco está num textarea: daria cobertura ao
  cenário realista, mas o DOM não expõe o retângulo do caret de forma direta. Seria um helper novo num teste
  que a tarefa só devia estabilizar. Fica como opção se o achado 🟢 virar item de backlog.
- Corrigir no produto: ver o achado 🟢. A correção piora o caso do campo alto e tem raio de todos os apps.

## Correções aplicadas

Nenhuma.

## Raio de impacto

Só o arquivo de teste. Nenhum contrato, rota, chave de i18n, `error.code` ou componente compartilhado
mudou. O projeto `mobile` não roda este arquivo (filtra por `CRITICAL_FLOWS`).

## Lacunas de teste

- Folga medida, P1 a P3 e repetição: o handoff listava as três. Continuam abertas, para o `/test`.
- Cenário do caret no fim do textarea ao voltar com Shift+Tab: aberto, sem cobertura. Depende do destino
  do achado 🟢; fora de escopo desta tarefa.

## Decisões em aberto

Nenhuma que bloqueie. O achado 🟢 fica para o `/spec --sync` decidir se vira backlog.

## Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter e2e typecheck` | número do handoff: sem erro. Nenhum arquivo foi editado nesta revisão |
| `pnpm check` | número do handoff: 1155 arquivos, nenhum fix |
| Paridade de i18n | não se aplica |
| E2E | não rodado aqui (é do `/test`) |

## Plano de commits

Plano combinado de `docs/features/stripe-customer-lookup-mapper/review/review.md`, agora com 42 commits.
Esta tarefa entra como 6 e 42. Os demais mantêm conteúdo e ordem relativa; os números a partir do antigo 6
sobem uma posição. Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio (conferido nesta
revisão: vazio).

O arquivo `apps/e2e/tests/focusNotObscured.spec.ts` tem cinco hunks com o contexto padrão do `git add -p`
(conferido com `git diff -U3`: os cinco saem separados). O commit 5 passa a usar `-p` e leva só o último
hunk; o 6 leva o resto do arquivo.

- Commit 5, `git add -p apps/e2e/tests/focusNotObscured.spec.ts`: responder `n` nos hunks 1 a 4
  (`LONG_DESCRIPTION`, fill e caret no caso 1, asserção de `scrollY`, caso 2) e `y` no 5.º (`editItem` e
  `toPass` no caso 3). Conferir com `git show HEAD`: o diff contém `toPass` e não contém
  `LONG_DESCRIPTION`.
- Commit 6, `git add apps/e2e/tests/focusNotObscured.spec.ts`: o que sobrou são os hunks 1 a 4. Depois,
  `git diff apps/e2e/tests/focusNotObscured.spec.ts` sai vazio.

1. `docs(specs): audit backlog against b7f9124`
2. `test(auth): mark the fictitious JWT fixture as a gitleaks false positive`
3. `chore(next-config): stop next dev from writing AGENTS.md into the apps`
4. `ci: ignore major Stripe SDK updates in Dependabot`
5. `test(e2e): retry action menu trigger until the row dropdown hydrates` (agora com `git add -p`, só o
   5.º hunk)
6. `test(e2e): give the focus walk a long description so fields start under the action bar` (esta tarefa)
   - `apps/e2e/tests/focusNotObscured.spec.ts` (hunks 1 a 4, o que sobrou depois do commit 5)
   - Corpo: "Only one field started under the action bar at 375x812, by 6 px. Filling the description
     pushes the lower fields down, the page returns to the top before the precondition, and the walk now
     asserts that it scrolled. The caret goes to the start of the textarea because focus scrolls the caret,
     not the whole field, into view."
7. `feat(app): center the narrow page column` (antigo 6)
8. `feat(app): size full-page forms and account panels to their content` (antigo 7)
9. `feat(app): add narrow loading skeletons to the create and edit form pages` (antigo 8)
10. `docs(app): document centered narrow pages and content-height forms` (antigo 9)
11. `feat(api): add requireOwnAccountApi guard for the caller's own account` (antigo 10)
12. `feat(api): open the own-account routes to the admin` (antigo 11)
13. `feat(api): route personal uploads through the own-account guard` (antigo 12)
14. `fix(api): log the provider code when a session revocation is refused` (antigo 13)
15. `fix(api): report a refused session revocation when unlinking the password` (antigo 14)
16. `fix(api): stop the admin disable and archive from swallowing a refused session revocation` (antigo 15)
17. `fix(api): read user profile instants as Date through a mapper` (antigo 16)
18. `fix(app): disable the avatar upload while impersonating` (antigo 17, `git add -p`)
19. `fix(app): unmount the profile menu avatar image when the picture goes away` (antigo 18, `git add -p`)
20. `feat(app): let the account forms hide what the admin area does not offer` (antigo 19)
21. `feat(app): add the admin section set to the account tabs` (antigo 20)
22. `feat(app): add the admin account page` (antigo 21)
23. `feat(app): point the admin navigation to the admin account` (antigo 22)
24. `test(app): harden three tests against a loaded machine` (antigo 23)
25. `fix(app): keep the user disabled in the list when only the session revocation failed` (antigo 24)
26. `feat(internationalization): add the admin account copy` (antigo 25)
27. `fix(internationalization): add the USERS_SESSIONS_NOT_REVOKED message` (antigo 26)
28. `docs(api): list requireOwnAccountApi among the guards` (antigo 27, `git add -p`, só o 1.º hunk)
29. `docs(api): name organization as the repository without a mapper` (antigo 28)
30. `docs: document the own-account guard in the auth panel and review checklist` (antigo 29)
31. `docs: describe how a refused session revocation is reported` (antigo 30)
32. `docs: describe the inline gitleaks allow for test fixtures` (antigo 31)
33. `docs: stop citing the user repository as one without a mapper` (antigo 32)
34. `docs(claude): point the new-api-route skill at a repository without a mapper` (antigo 33)
35. `docs(features): app-form-layout-centered` (antigo 34)
36. `docs(features): admin-own-account` (antigo 35)
37. `docs(features): app-test-suite-stability` (antigo 36)
38. `docs(features): account-avatar-polish` (antigo 37)
39. `docs(features): auth-revocation-failure` (antigo 38)
40. `docs(features): repo-hygiene-ci` (antigo 39)
41. `docs(features): stripe-customer-lookup-mapper` (antigo 40)
42. `docs(features): focus-e2e-precondition` (esta tarefa)
    - `docs/features/focus-e2e-precondition/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Arquivos e corpos dos commits antigos continuam os dos planos de origem.

Varredura de segredo em `docs/features/focus-e2e-precondition/` e no spec (grep por `eyJ`, `senha`,
`password`, `sk_`, `whsec_`, `AIza` e endereço de e-mail): sem acerto. Repetir no que o `/test` gravar
antes do commit 42.

Título de PR sugerido: `feat: admin own account area, centered form pages, session revocation errors, CI hygiene, user profile mapper and focus E2E precondition`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin feat/admin-account-forms-and-session-revocation`.

### Commits realizados

(preenchido pelo orquestrador)
