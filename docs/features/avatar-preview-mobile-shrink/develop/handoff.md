# Handoff do develop: prévia do upload de imagem achatada no mobile

## Blueprint e arquivos

| Item do plano (§8) | Arquivo | Mudança |
|--------------------|---------|---------|
| Correção | `packages/design-system/components/ui/image-upload-input.tsx` | `className="shrink-0"` na chamada do `ResponsiveImage` da prévia (+1 linha) |
| Teste | `packages/design-system/__tests__/imageUploadInput.test.tsx` | caso novo `keeps the preview from shrinking when the row runs out of width` (+16 linhas) |

O `ResponsiveImage` em si não mudou (decisão D1 do plano). As miniaturas das listas e o playground continuam
sem a classe.

## Contrato

Nenhum. Sem DTO, action do SDK, rota, env ou chave de i18n. A prop `className` já existia no
`ResponsiveImage` e o `cn(...)` dele já a aplicava ao `div` externo (`responsive-image.tsx:41`).

## Códigos de erro novos

Nenhum.

## Desvios

Nenhum.

## Decisões em aberto

As duas perguntas do plano seguiram o default: correção só no `ImageUploadInput` e teste de classe mantido
como trava de regressão.

## Validação

O teste foi escrito antes da correção e rodado contra o componente sem a classe:

- sem `shrink-0`: `pnpm --filter @repo/design-system test` reprovou 1 de 173, com `expected false to be
  true` em `imageUploadInput.test.tsx:98`. O elemento pai foi encontrado; faltava só a classe, então a
  falha é pelo motivo certo;
- com `shrink-0`: `pnpm --filter @repo/design-system test` passou 173 de 173 (14 arquivos).

Gates, todos sem `--force`:

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/design-system test` | 14 arquivos, 173 testes, todos passando |
| `pnpm --filter @repo/design-system typecheck` | exit 0 |
| `pnpm --filter app typecheck` | exit 0 |
| `pnpm exec vitest run __tests__/imageUploadInput.test.tsx` em `apps/app` | 6 de 6 passando |
| `pnpm check` | 1156 arquivos, nenhum ajuste |

Paridade de i18n não se aplica: nenhuma chave mudou.

## A verificar no `/test`

Nada de layout foi medido aqui. O jsdom não calcula layout e esta etapa não subiu app nem browser. Tudo
abaixo depende da passada com `agent-browser` descrita no §6 do plano:

- a 390 px, com imagem já enviada, o `div` pai da imagem dentro de `[data-slot="image-upload-input"]` mede
  64 x 64 (`getBoundingClientRect()`) no perfil da conta e na edição de entidade, em pt-br, en e es, light e
  dark. Antes da correção o `/test` de `account-avatar-polish` mediu 55,4 x 64;
- a 390 px, `document.documentElement.scrollWidth <= innerWidth` nas mesmas células. A coluna de botões e
  hint passa a absorver todo o aperto, então é ali que uma rolagem horizontal apareceria;
- a 1280 px, a prévia segue 64 x 64 e na mesma posição;
- `/admin/account`, uma célula (390, pt-br, light);
- sem `value`, a prévia não aparece. Nenhum teste afirma essa ausência; os casos antigos só renderizam o
  campo sem valor. Repro: abrir a criação de entidade com storage ligado e conferir que não há `img` dentro
  de `[data-slot="image-upload-input"]`.

## Lacunas de teste conhecidas

O teste novo só prova que a classe está no contêiner. A proporção de 64 x 64 só se prova no browser.
