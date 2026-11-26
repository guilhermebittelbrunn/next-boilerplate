# Revisão: prévia do upload de imagem achatada no mobile

Escopo: `packages/design-system/components/ui/image-upload-input.tsx` (+1 linha, `className="shrink-0"` no
`ResponsiveImage` da prévia) e o caso novo em `packages/design-system/__tests__/imageUploadInput.test.tsx`
(+16 linhas). As outras tarefas do working tree não foram relidas.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. Não é protegida. Regex: `BRANCH INVALIDA`.
- Proposta, herdada do plano combinado: `feat/admin-account-forms-and-session-revocation`. Regex:
  `branch OK`.
- Nada foi criado nem renomeado, porque a rodada é do `/cycle`. O `/review` cria a branch a partir da atual
  antes do primeiro commit.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `analyze/plan.md` §3 (D1) e §4 dizem que o playground usa o `ResponsiveImage` direto. Não usa:
  `playground/page.tsx:158` só cita `"responsive-image"` numa lista de nomes, sem importar o componente. Os
  consumidores diretos são `EntitiesListClient.tsx:65` e `UsersListClient.tsx:77`. A decisão D1 continua
  valendo; só a lista estava errada. Nenhuma ação no código.
- `imageUploadInput.test.tsx:96` acha o contêiner por `getByAltText(...).parentElement`. Isso depende do
  `next/image` com `fill` renderizar o `img` direto dentro do `div` do `ResponsiveImage`
  (`responsive-image.tsx:40-83`), o que é verdade hoje. Se um wrapper entrar entre os dois, o teste reprova
  por estrutura, não por falta da classe. Aceitável para uma trava de regressão; mantido.

### ✅ OK

- A causa confere com o código. `image-upload-input.tsx:167` é `flex items-center gap-4`; a prévia
  (`:169-177`) é um `div` com `relative overflow-hidden rounded-full` e `style={{ width, height }}`
  (`responsive-image.tsx:41-42`). O `width` inline vira o `flex-basis`, o `flex-shrink` fica em 1, e o
  `overflow-hidden` faz o `min-width: auto` do item flex resolver para 0. Nada segura os 64 px na
  horizontal, e a altura fixa não encolhe no eixo cruzado. Daí a elipse.
- `shrink-0` resolve pelo motivo certo. O `cn(...)` de `responsive-image.tsx:41` repassa a classe ao `div`
  externo, que é o item flex. Com `flex-shrink: 0`, todo o aperto vai para a coluna `flex flex-col gap-2`
  (`:180`). Essa coluna não tem `overflow-hidden`, então o mínimo dela é o min-content: o botão mais largo
  (`button.tsx:8` tem `whitespace-nowrap shrink-0`) ou a palavra mais longa do hint. A linha de botões já
  é `flex-wrap` (`:181`) e o hint quebra linha.
- Sem efeito colateral nos call sites. A classe fica na chamada dentro do `ImageUploadInput`, não no
  `ResponsiveImage`, então as miniaturas de `EntitiesListClient.tsx:65` e `UsersListClient.tsx:77` não
  mudam. `HookFormImageUpload` só repassa props. Os dois formulários que chegam ao componente
  (`AccountProfileForm.tsx:116`, `EntityFormFields.tsx:123`) põem o campo em `col-span-1 md:col-span-2`,
  largura cheia da coluna, e nenhum passa `className` que dependa do encolhimento da prévia.
- Design system continua presentacional: sem fetch, sem sessão, sem tipo ou export novo, sem string de UI
  nova. i18n não muda.
- Teste no arquivo existente, imports explícitos de `vitest`, sem `toBeInTheDocument`. O handoff registra
  que ele reprovou sem a classe (`expected false to be true` na linha 98) e passou com ela.
- Comentários: nenhum adicionado.

### 👁 Verificar no `/test`

Nenhuma afirmação de layout do handoff se confirma lendo código; o jsdom não calcula layout. Passada mínima,
uma execução de `agent-browser` com storage do emulador ligado e uma imagem já enviada em cada formulário
(sem isso não há prévia):

| Tela | Largura | Tema | Idioma |
|------|---------|------|--------|
| `/account`, aba perfil | 390 | light e dark | pt-br, en, es |
| `/account`, aba perfil | 1280 | light e dark | pt-br |
| Entidade, editar com foto | 390 | light e dark | pt-br, en, es |
| Entidade, editar com foto | 1280 | light e dark | pt-br |
| `/admin/account` | 390 | light | pt-br |
| Entidade, criar (sem `value`) | 390 | light | pt-br |

Em cada célula, medir pelo console:

1. `getBoundingClientRect()` do pai do `img` dentro de `[data-slot="image-upload-input"]`: esperado 64 x 64.
   Antes da correção o `/test` de `account-avatar-polish` mediu 55,4 x 64. Esta é a afirmação que sustenta o
   corte; largura menor que a altura reprova.
2. `document.documentElement.scrollWidth <= innerWidth`. A coluna de botões e hint passa a absorver o aperto,
   então é nela que uma rolagem horizontal apareceria. Pela leitura o min-content é um botão (cerca de
   130 px) e sobra largura a 390 px, mas isso é estimativa, não medição.
3. A 1280 px, a prévia continua 64 x 64 ao lado dos botões.
4. Na criação de entidade sem foto, nenhum `img` dentro de `[data-slot="image-upload-input"]`.

## Correções aplicadas

Nenhuma. O diff está correto como veio do `/develop`.

## Raio de impacto

`ImageUploadInput` é consumido só via `HookFormImageUpload`, em `AccountProfileForm.tsx` (usado também por
`/admin/account`) e `EntityFormFields.tsx`. Nenhuma mudança de contrato: props, tipos e exports iguais.
`apps/web` não usa o componente.

## Lacunas de teste

- Proporção 64 x 64: continua aberta, só o browser prova (item 1 acima).
- Ausência de prévia sem `value`: continua aberta, nenhum teste afirma isso. Coberta pelo item 4 acima; um
  caso Vitest barato também resolveria, mas não é desta revisão criar teste.

## Decisões em aberto

Nenhuma. As duas perguntas do plano (corrigir só no `ImageUploadInput`; manter o teste de classe) seguiram
o default, e a revisão concorda.

## Gates

A revisão não mexeu em código, então os números são do handoff, sem nova medição:

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/design-system test` | 14 arquivos, 173 testes passando |
| `pnpm --filter @repo/design-system typecheck` | exit 0 |
| `pnpm --filter app typecheck` | exit 0 |
| `pnpm check` | 1156 arquivos, nenhum ajuste |
| Paridade de i18n | não se aplica, nenhuma chave mudou |

## Plano de commits

Plano combinado de `docs/features/base-repository-id-precedence/review/review.md` (48 commits), agora com
50. Esta tarefa entra como 7 e 50. Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio
(conferido nesta revisão: vazio).

Posição: o commit do design system vai depois do bloco de pacotes e tooling (1 a 6) e antes do primeiro
commit de app (antigo 7). Não depende de nenhum commit do plano e nenhum depende dele; em
`packages/design-system/` só estes dois arquivos têm mudança, então basta `git add` simples.

### Trecho alterado

1 a 6: sem mudança.

7. `fix(design-system): keep the image upload preview from shrinking` (esta tarefa)
   - `packages/design-system/components/ui/image-upload-input.tsx`,
     `packages/design-system/__tests__/imageUploadInput.test.tsx`
   - Corpo: "The preview container is a flex item with a fixed inline width and overflow hidden, so its
     minimum width resolved to zero and narrow screens squeezed the round preview into an ellipse. The
     preview no longer shrinks; the buttons and hint column takes the squeeze."
8 a 48: os antigos 7 a 47, com o mesmo conteúdo e a mesma ordem relativa.
49. `docs(features): base-repository-id-precedence` (antigo 48)
50. `docs(features): avatar-preview-mobile-shrink` (esta tarefa)
    - `docs/features/avatar-preview-mobile-shrink/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Varredura de segredo na pasta da feature: nenhuma ocorrência de senha, token, chave ou e-mail. Repetir no
que o `/test` gravar antes do commit 50.

Título de PR sugerido: o do plano combinado, sem mudança. Depois do último commit aprovado, o `/review`
pergunta se deve rodar `git push -u origin feat/admin-account-forms-and-session-revocation`.

### Commits realizados

(preenchido pelo orquestrador)
