# Handoff do develop: pré-condição determinística no caso 1 do E2E de foco

## Blueprint → arquivos

Só um arquivo: `apps/e2e/tests/focusNotObscured.spec.ts`. Nenhum código de produção, contrato de SDK, rota,
i18n ou `apiErrors` mudou.

- Constante de módulo `LONG_DESCRIPTION` (a extração opcional do plano), usada pelos casos 1 e 2.
- Caso 1: preenche a descrição com as 12 linhas, põe o caret no início do textarea, volta a página ao topo
  e só então roda a pré-condição existente, que ficou intacta.
- Caso 1: asserção nova logo depois do laço de Tab, `window.scrollY > 0` com a mensagem "the Tab walk must
  scroll the document".
- Caso 2: o `Array.from(...)` inline virou `LONG_DESCRIPTION`. Mesmo valor, comportamento igual.

Nenhuma asserção existente foi removida nem afrouxada.

## Separar do hunk de `app-form-layout-centered`

O arquivo tem cinco hunks no `git diff`. Os quatro primeiros são desta tarefa; o quinto é o `toPass` do
caso 3, que pertence a `app-form-layout-centered` e ficou como estava.

| Hunk (`git diff -U1`) | Tarefa |
|-----------------------|--------|
| `@@ -19,2 +19,6 @@`, constante `LONG_DESCRIPTION` | esta |
| `@@ -102,2 +106,13 @@`, fill, caret e `scrollTo` no caso 1 | esta |
| `@@ -119,2 +134,6 @@`, asserção de `scrollY` no caso 1 | esta |
| `@@ -140,8 +159,3 @@`, caso 2 passa a usar `LONG_DESCRIPTION` | esta |
| `@@ -191,8 +205,16 @@`, `toPass` do menu de ações no caso 3 | `app-form-layout-centered` |

No `git add -p` com o contexto padrão (3 linhas) os hunks podem se fundir de outro jeito. A regra é:
tudo acima da linha `test("arrow keys keep the focused genre option ...` é desta tarefa; o bloco do
`editItem`/`toPass` é da outra. Se o commit de `app-form-layout-centered` entrar antes, o diff restante
é só desta tarefa.

## Desvio do plano: caret no início do textarea

O blueprint não previa a linha `setSelectionRange(0, 0)`. Sem ela, o primeiro run reprovou o caso 1 na volta
com Shift+Tab:

```
Received: "description starts at -59px, under the navbar that ends at 64px"
  at focusNotObscured.spec.ts:140 (laço de Shift+Tab)
```

Depois do `fill`, o caret fica na linha 12. Ao receber foco, o Chrome rola o caret para a área visível, não
o campo inteiro. Vindo de baixo, a linha 12 para logo abaixo da navbar e o topo do textarea fica acima dela.
A altura do campo não é o problema: no print da falha as 12 linhas cabem com folga entre as barras.

Com o caret na linha 1, a rolagem de volta revela o começo do campo e a asserção passa. Isso é ajuste de
setup, não afrouxa a regra: a asserção continua exigindo o controle inteiro fora das barras. O comentário no
código explica o porquê.

Leitura de produto, para o `/review` e o `/test` decidirem: um usuário que digita uma descrição longa e
volta com Shift+Tab vê o mesmo comportamento, com o topo do campo sob a navbar e o caret visível. A WCAG
2.4.11 (AA) pede que o componente focado não fique inteiramente escondido, e o caret à vista atende isso.
Não tratei como defeito e não mexi em produção.

A prova P2 do plano ("comentar o `fill`") agora precisa comentar também o `setSelectionRange`, ou o
`evaluate` roda num textarea vazio sem efeito. Não muda o resultado esperado.

## Validação

| Instrumento | Resultado |
|-------------|-----------|
| `pnpm --filter e2e typecheck` | passou (`tsc --noEmit`, sem erro) |
| `pnpm check` | passou, 1155 arquivos, nenhum fix |
| `pnpm --filter e2e exec playwright test tests/focusNotObscured.spec.ts --project=chromium` com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`, sem o ajuste do caret | caso 1 reprovou (mensagem acima), casos 2 e 3 passaram |
| o mesmo comando com o ajuste | 7 passed (4 de setup e os 3 casos), 1,3 min |
| portas 3000–3003, 8080, 9099, 9199, 4000, 4400 e 4500 (`lsof -ti tcp:<p> -sTCP:LISTEN`) | livres antes de cada run e depois do segundo |

Foram dois runs, não um: o segundo confirma a correção do desvio. Nenhum `--repeat-each`.

Vitest e paridade de i18n: N/A, nenhum workspace com teste unitário mudou.

## A verificar no `/test`

- Estabilidade: `--repeat-each=10` no arquivo, 30/30 esperado. Rodei uma vez.
- Folga com a página no topo: número de controles abaixo da barra, menor `top - bar.top` entre eles e altura
  da descrição preenchida. O run não expõe esses números e não deixei log no teste. Repro: `page.evaluate`
  avulso depois do `fill` e do `scrollTo(0)`, ou `agent-browser` a 375×812.
- Provas P1, P2 e P3 do plano (seção 6). Na P2, comente o `fill` e o `setSelectionRange`.
- `scrollY` ao chegar na barra: a asserção passou, então o valor é maior que zero, mas o número exato não
  foi registrado.

## Lacunas de teste conhecidas

Nenhum teste novo além do E2E. As provas de reprovação (P1 a P3) e a medida da folga ficam para o `/test`.

## Decisões em aberto

Nenhuma que bloqueie. Fica para o `/review` confirmar a leitura de produto sobre o caret ao voltar para um
textarea longo (ver "Desvio do plano").
