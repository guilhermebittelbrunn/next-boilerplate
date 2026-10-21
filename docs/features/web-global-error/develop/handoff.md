# Handoff do develop: tela de erro global efetiva na landing

Só `apps/web`. Sem SDK, API, i18n, env ou dependência nova.

## Blueprint → arquivos

| item do blueprint (§10.2) | arquivo |
|---|---|
| mover a tela para a raiz de `app/` e alinhar à versão da app | `apps/web/app/[locale]/global-error.tsx` (apagado) → `apps/web/app/global-error.tsx` (novo) |
| T1 | `apps/web/__tests__/globalErrorLocale.test.tsx` (novo) |

O componente ficou como o pseudo-diff da §10.3: `getDictionary()` no corpo, `lang={locale}` sem fallback,
`globalErrorCopy = dictionary.apps.web.pages.error`, sem o `console.error` de desenvolvimento (D2) e com o
comentário de duas linhas sobre a falta do `LocaleProvider`, o mesmo da app. A prop `error` continua no tipo
porque o Next a passa; o componente não a lê.

## Estado do índice git

O `git mv` foi feito e o `git status` mostrou `R  apps/web/app/[locale]/global-error.tsx -> apps/web/app/global-error.tsx`.
Em seguida rodei `git reset -q -- "apps/web/app/[locale]/global-error.tsx" apps/web/app/global-error.tsx` para
deixar o índice vazio, como o plano de commits exige. Resultado: `git diff --cached --stat` sem saída, e o
working tree mostra ` D apps/web/app/[locale]/global-error.tsx` e `?? apps/web/app/global-error.tsx`.

Quem commita precisa preparar os dois caminhos juntos (`git add -A -- "apps/web/app/[locale]/global-error.tsx" apps/web/app/global-error.tsx`)
para o Git voltar a detectar o rename.

## Contrato

Nenhum DTO ou action mexido. O único consumidor de `apps.web.pages.error` continua sendo este arquivo.

## Códigos de erro novos

Nenhum. Nenhuma entrada em `apiErrors`.

## Desvios

1. **Similaridade do rename é 52%, não "longe do limite".** A §10.4 diz que a edição troca cerca de 10 de
   32 linhas e fica longe dos 50% de similaridade que o Git usa para detectar rename. Medi num índice
   descartável (`GIT_INDEX_FILE=/tmp/wge-index git add -A -- <os dois caminhos>` e
   `git diff --cached -M --summary`): `rename apps/web/app/{[locale] => }/global-error.tsx (52%)`. O rename é
   detectado, mas por margem curta. Qualquer linha a mais que o `/review` mude no arquivo pode fazer o
   diff virar apagar + criar. Não mudei o código para ganhar margem; fica o aviso.
2. **Um caso a mais no T1.** Além dos 4 casos do esqueleto (3 idiomas e o fallback sem cookie), acrescentei
   `never prints the error details`, que confere que a mensagem do erro (`"boom"`) não sai no HTML. Cobre o
   critério "Nenhum detalhe do erro na tela" no nível de componente. O `digest` não entra nesse teste.

## Validação

| gate | comando | resultado |
|---|---|---|
| typecheck | `pnpm --filter web typecheck` | exit 0 |
| teste novo | `pnpm --filter web exec vitest run __tests__/globalErrorLocale.test.tsx` | 5 passed |
| teste novo com o arquivo de volta em `[locale]` | `mv` temporário para `apps/web/app/[locale]/global-error.tsx`, mesmo comando, restauração por `trap` | falha com `Failed to resolve import "@/app/global-error"`; arquivo restaurado (`ls` confirma só o caminho novo) |
| suíte da web | `pnpm --filter web test` | 24 arquivos, 189 testes passados (inclui o `signInSchema.test.ts` da tarefa irmã, que está no working tree) |
| lint | `pnpm check` | `Checked 969 files`, `No fixes applied`, exit 0 |
| paridade i18n | não rodado | nenhuma chave mexida |

### Smoke de build

`pnpm --filter web build` terminou com exit 0. O log tem `Next.js 16.0.0 (Turbopack)`, `Compiled successfully`
e `Generating static pages (8/8)`, sem erro sobre a falta de `app/layout.tsx` na raiz. Em
`apps/web/.next/server/app/` existem `_global-error.html`, `.meta`, `.rsc` e `.segments`.

- `grep -rl "apps/web/app/global-error.tsx" apps/web/.next/server/app | wc -l` → `9` (os manifests de client
  reference de todas as páginas apontam para o arquivo novo).
- `grep -rl "\[locale\]/global-error" apps/web/.next/server` → nenhum resultado.
- `_global-error.html` abre com `<html id="__next_error__">`, sem `lang`, e não contém
  `Application error`. É a casca que o risco R2 do plano descreve; a tela real é montada no cliente.

O `apps/web/.next` já existia antes do build (é gitignored); o build só o regravou. Não subi servidor nem
abri navegador.

## A verificar no `/test`

Nada de comportamento em navegador foi medido aqui. Ficam para o `/test`, pelo roteiro da §8 do plano
(`throw` temporário em `apps/web/app/[locale]/layout.tsx`, `pnpm --filter web build && pnpm --filter web start`):

- a tela mostrada com o layout quebrado é a de `apps/web/app/global-error.tsx`, sem o texto
  "Application error: a server-side exception has occurred";
- `document.documentElement.lang`, `<h1>` e botão em `/pt-br`, `/en` e `/es`, e em `/` sem cookie
  (redireciona para `/pt-br`);
- clique no botão chama `reset()` e não gera erro novo no console;
- status HTTP da resposta (o plano espera 500).

## Lacunas de teste conhecidas

- Clique no botão (`reset()`) não tem teste de componente; o `onClick` não mudou. Continua aberto para o `/test`.
- O caso R1 (root layout quebrando numa troca de idioma no cliente) não tem teste. Fora de escopo pelo plano.
- O `digest` fora da tela não tem teste de componente; o componente não lê `error`, então só o navegador
  confirma que nenhum outro ponto o imprime.
