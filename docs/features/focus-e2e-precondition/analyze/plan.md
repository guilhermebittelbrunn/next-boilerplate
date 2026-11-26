# Plano: pré-condição determinística no primeiro caso do E2E de foco

Tarefa direta, sem spec. Origem: achado 🟢 "O primeiro caso do E2E de foco passa por margem estreita" em
`specs/reference/AUDIT.md:1856` (seção "Achados do `/test` de `app-form-layout-centered`").

Escopo: só `apps/e2e/tests/focusNotObscured.spec.ts`. Nenhum código de produção muda. O arquivo já tem
alteração no working tree (o `toPass` do caso 3, em `:195-204`, vindo de `app-form-layout-centered`); essa
alteração fica como está.

## 1. Contexto

O caso 1 (`focusNotObscured.spec.ts:97-130`) percorre o formulário de criar entidade a 375×812 com Tab até a
barra de ações e volta com Shift+Tab até o campo de nome. A cada parada, `expectFocusUnobscured`
(`:60-62`) exige que o controle focado não termine abaixo do topo da barra fixa (`[data-sticky-action-bar]`)
nem comece acima da base da navbar (`[data-panel-navbar]`).

O que ele prova é a reserva de foco do `<html>`: `has-[[data-sticky-action-bar]]:scroll-pb-20` e
`has-[[data-panel-navbar]]:scroll-pt-20` (`apps/app/app/layout.tsx:71`), descrita em `apps/app/CLAUDE.md:44`
(WCAG 2.4.11). Sem essa reserva, o navegador rola só até o campo entrar na viewport, e a área sob a barra
fixa conta como viewport, então o campo fica escondido.

O caso só prova isso se algum campo, com a página no topo, estiver abaixo da barra. Se todos os campos
cabem acima dela, o Tab nunca rola o documento e o teste passa com ou sem reserva. Por isso existe a
pré-condição de `:106-109`: conta os controles cujo topo está abaixo do topo da barra e exige mais de zero.

## 2. A fragilidade

Medido pelo `/test` de `app-form-layout-centered` (`docs/features/app-form-layout-centered/test/report.md:51-54`):
a 375×812, só o campo `birthdate` começa abaixo da barra. A barra começa em 743 px e o campo em 749 px. O
`birthdate` é o último campo do formulário de criar (`EntityFormFields.tsx:154-157`; o `enabled` em `:163`
só aparece na edição).

Seis pixels de folga. Qualquer mudança de espaçamento, label ou campo removido no formulário de criar faz
a pré-condição reprovar. O teste hoje não passa vazio, porque a asserção é explícita e falha com mensagem,
mas reprova por um motivo que não é foco obscurecido, e quem vê o vermelho tende a mexer no teste em vez
de no formulário.

## 3. Correção

Dar ao caso 1 a mesma folga que o caso 2 já usa: preencher a descrição com `LONG_DESCRIPTION_LINES` (12)
linhas antes da pré-condição. O `Textarea` do design system cresce com o conteúdo (`field-sizing-content` em
`packages/design-system/components/ui/textarea.tsx:11`), e a descrição é o segundo campo
(`EntityFormFields.tsx:103-106`), logo empurra para baixo `type`, `photo`, `genre` e `birthdate`. A folga
passa de 6 px para algo na ordem de 200 px (12 linhas contra as 4 do `rows={4}`; o `/test` mede o número
real).

Depois do preenchimento, a página volta ao topo antes da pré-condição, para a medida não depender de onde
o `fill` deixou a rolagem.

Duas defesas contra passar vazio:

1. A pré-condição existente (`:106-109`) continua, com a mensagem atual.
2. Asserção nova ao fim da volta com Tab: `window.scrollY` maior que zero quando o foco chega na barra.
   Prova que o percurso de fato rolou o documento. Se um dia a barra deixar de ser fixa ou o formulário
   encolher demais, isso reprova com mensagem própria.

Alternativas descartadas:

- Viewport mais baixa só para o caso 1 (ex.: 375×667). Aumenta a folga, mas ela continua dependendo da
  altura do formulário, e 375×812 é o cenário que os três casos compartilham hoje.
- Escolher o primeiro campo abaixo da barra e focá-lo direto. O percurso completo com Tab já passa por
  todos os campos; escolher um não acrescenta folga e perde a cobertura do Shift+Tab.

Riscos:

- Textarea alta demais. Com reserva de 80 px em cima e embaixo, sobram cerca de 652 px de scrollport a
  812 px de altura. Doze linhas a 24 px dão em torno de 306 px de campo, então cabe. Se não coubesse, o
  navegador alinharia o topo e a base ficaria sob a barra, e o teste reprovaria sem defeito real. O `/test`
  mede a altura da descrição preenchida.
- Smooth scroll. A checagem de `scrollY` vem depois do `expect.poll` da última parada, que já espera a
  rolagem assentar.

## 4. Itens N/A

Dados, contrato do SDK, API, i18n, autorização e impersonação: N/A. Nenhum app de produto muda. Testes
Vitest: N/A, o objeto do teste é o layout real no navegador, e a parte unitária da reserva já existe em
`apps/app/__tests__/focusNotObscuredScrollPadding.test.tsx`.

## 5. Blueprint

Pseudo-diff em `apps/e2e/tests/focusNotObscured.spec.ts`, caso 1:

```ts
test("Tab and Shift+Tab keep every focused field clear of the sticky bars", async ({ page }) => {
    await page.goto(createPath);
    await expectFormWithStickyBars(page);

+   // A longer description pushes the lower fields under the action bar, so the Tab walk
+   // has to scroll the document.
+   await page.getByLabel(entitiesForm.description).fill(
+       Array.from({ length: LONG_DESCRIPTION_LINES }, (_, line) => `${line + 1}`).join("\n")
+   );
+   await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

    const nameInput = page.getByLabel(entitiesForm.name);
    await nameInput.focus();
    await expectFocusUnobscured(page);
    expect(await fieldsStartingUnderActionBar(page), "some field must start under the action bar with the page at the top").toBeGreaterThan(0);

    let stops = 0;
    while (!(await focusIsInside(page, ACTION_BAR))) { ... }
+   expect(
+       await page.evaluate(() => window.scrollY),
+       "the Tab walk must scroll the document"
+   ).toBeGreaterThan(0);

    stops = 0;
    while (...) { ... Shift+Tab ... }
});
```

Opcional, se reduzir duplicação sem mexer no caso 2 além do necessário: extrair o `Array.from(...)` para
uma constante de módulo (`LONG_DESCRIPTION`) usada pelos dois casos. Os casos 2 e 3 não mudam de
comportamento.

Ordem: um commit só, `test(e2e): ...`, separado do commit do `toPass` do caso 3 se este ainda não tiver
entrado.

## 6. Como medir

`pnpm e2e` sobe emulador (JDK 21), api, app e web pelo `webServer` de `apps/e2e/playwright.config.ts`. O
arquivo só roda no projeto `chromium` (o `mobile` filtra por `CRITICAL_FLOWS`, `:19`).

1. Repetição do arquivo inteiro:
   `pnpm --filter e2e exec playwright test tests/focusNotObscured.spec.ts --project=chromium --repeat-each=10`.
   Esperado 30/30.
2. Folga medida: com a descrição preenchida e a página no topo, registrar no `report.md` o número de
   controles abaixo da barra, a menor diferença `top - bar.top` entre eles e a altura da descrição. Medida
   avulsa (evaluate no Playwright ou `agent-browser`), sem deixar log no teste.
3. Prova de que o teste reprova quando deve, cada uma revertida antes da próxima:
   - P1, reserva removida: tirar `has-[[data-sticky-action-bar]]:scroll-pb-20` de
     `apps/app/app/layout.tsx:71` e rodar só o caso 1 (`-g "Tab and Shift+Tab"`). Tem de reprovar em
     `expectFocusUnobscured` com a mensagem "... under the action bar that starts at ...". Restaurar com
     Edit e conferir `git diff --stat apps/app/app/layout.tsx` vazio (o arquivo não tem mudança no
     working tree hoje).
   - P2, pré-condição ausente: comentar temporariamente o `fill` da descrição e trocar a viewport do caso
     para 375×1600. Tem de reprovar na pré-condição, não passar. Restaurar e conferir que o diff do spec é
     só o planejado.
   - P3, sem o `fill` e com a viewport original (o estado de hoje), o caso passa: registra que a folga
     antiga era a única coisa segurando o teste.

## 7. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **O caso 1 garante a própria pré-condição**
  O caso preenche a descrição com 12 linhas antes de medir, e a página volta ao topo antes da contagem. Com
  isso, mais de um controle começa abaixo da barra de ações a 375×812, com folga medida e registrada no
  `report.md` bem acima dos 6 px de hoje.

- [ ] **O caso 1 não passa vazio**
  Se nenhum campo começar abaixo da barra, a pré-condição reprova com a mensagem "some field must start
  under the action bar with the page at the top". Se o percurso com Tab chegar à barra sem ter rolado o
  documento, a asserção nova reprova com "the Tab walk must scroll the document". A prova P2 mostra a
  primeira reprovação acontecendo.

- [ ] **O caso 1 reprova sem a reserva de foco**
  Com `scroll-pb-20` removido do `<html>`, o caso reprova numa parada do Tab com a mensagem que nomeia o
  campo e as posições do campo e da barra. A prova P1 registra a mensagem literal, e o `layout.tsx` volta
  idêntico ao HEAD.

- [ ] **O arquivo fica estável em repetição**
  Os três casos passam 10 vezes seguidas cada no projeto `chromium` (30/30). O `toPass` do caso 3 e o caso
  2 continuam como estão no working tree.

- [ ] **Nenhum código de produção muda**
  O diff da tarefa toca só `apps/e2e/tests/focusNotObscured.spec.ts`. `pnpm check` e
  `pnpm --filter e2e typecheck` passam.

## Perguntas em aberto

Nenhuma decisão de produto. Decisão técnica tomada pelo `/cycle`: folga por conteúdo (descrição longa) em
vez de viewport mais baixa, porque reaproveita a técnica do caso 2 e mantém 375×812 nos três casos.
