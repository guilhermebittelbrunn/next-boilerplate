---
name: i18n-sync
description: Adiciona, edita ou valida chaves de tradução no pacote @repo/internationalization garantindo paridade entre os 3 idiomas (pt-br, en, es), incluindo os apiErrors da API. Use quando precisar criar textos de UI, adicionar um código de erro novo da API, ou auditar se faltam chaves em algum idioma. Strings de interface NUNCA ficam soltas em JSX — sempre passam por aqui.
---

# Sincronizar traduções (`@repo/internationalization`)

Mantém o dicionário consistente nos 3 idiomas. Regra de ouro do repo: **nenhum texto visível literal em JSX** — tudo vem do dictionary. Regras de i18n por escopo: [`apps/app/CLAUDE.md`](../../../apps/app/CLAUDE.md) / [`apps/web/CLAUDE.md`](../../../apps/web/CLAUDE.md) (front) e [`apps/api/CLAUDE.md`](../../../apps/api/CLAUDE.md) (`error.code`).

## Como o dicionário é montado
- Base: `packages/internationalization/translations/`. Cada arquivo-folha exporta um objeto com as **3 chaves de idioma**: `"pt-br"`, `en`, `es`.
- Folhas sobem por `index.ts` (ex.: `apps/app/pages/common/index.ts`) até `translations/global.ts` (`globalTranslations`).
- No app: `const { dictionary, locale } = getDictionary()` — client de `@repo/internationalization/client`, server de `@repo/internationalization/server`. Acesso por caminho, ex.: `dictionary.apps.app.pages.common.entities.messages.created`.
- Idiomas suportados e default em `packages/internationalization/utils.ts` (`locales`, `getDefaultLocale`). Locale resolvido via cookie `x-locale`.

## Adicionar/editar chaves de UI

1. **Localize ou crie a folha** sob o caminho que reflete onde o texto aparece (ex.: textos de uma página comum → `translations/apps/app/pages/common/<recurso>.ts`). Espelhe `entities.ts` como modelo de estrutura (`title`, `fields`, `messages`, `table`, etc.).
2. **Adicione a chave nos 3 idiomas** com a **mesma estrutura/aninhamento**. Valores em pt-br/en/es como exemplos neutros — sem copy de produto único.
3. **Conecte no `index.ts`** do diretório (e acima, se for folha nova) para que apareça em `globalTranslations`.
4. Use **nomes de chave estáveis e descritivos** (`messages.created`, `fields.name.label`). No app, a variável que guarda a fatia do dictionary deve ter nome descritivo (`entitiesMessages`), nunca `t`/`d`.
5. Para mensagens de Zod, injete via `buildXSchema(dictionary)` em vez de texto fixo no schema compartilhado.

## Adicionar código de erro da API (`apiErrors`)
Quando a API passar a responder um `error.code` novo:
1. Abra `packages/internationalization/translations/packages/shared/utils.ts`.
2. Adicione a chave (ex.: `PRODUCT_NOT_FOUND`) dentro de `apiErrors` nos **3 idiomas**.
3. O app mapeia `code` → texto via `FormattedError` / `handleClientError`. Não precisa mudar o app se a chave existir aqui.

## Validar paridade (auditoria)
Para flagrar chaves presentes num idioma e ausentes em outro, rode uma checagem rápida (ajuste o caminho do arquivo):

```bash
node -e '
const m = require("./packages/internationalization/translations/packages/shared/utils.ts");
' 2>/dev/null || echo "use ts: importe e compare Object.keys de cada locale"
```

Na prática, abra a folha e compare visualmente que `Object.keys(obj["pt-br"])`, `obj.en` e `obj.es` têm o **mesmo conjunto de chaves** (recursivamente). Reporte divergências antes de concluir.

## Checklist final
- [ ] Chave existe em `pt-br`, `en` e `es` com estrutura idêntica.
- [ ] Folha nova conectada nos `index.ts` até `global.ts`.
- [ ] Código de erro novo da API refletido em `apiErrors` (3 idiomas).
- [ ] Nenhuma string literal de UI ficou no JSX.
- [ ] `pnpm --filter @repo/internationalization typecheck` (ou `pnpm check`) passa.
