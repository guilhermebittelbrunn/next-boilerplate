# Revisão: web-global-error

Rodada autônoma do `/cycle`. Revisão por leitura do diff mais os gates estáticos. Não subi app, não usei navegador e
não rodei a suíte de testes.

Escopo: só `apps/web`. O arquivo `apps/web/app/[locale]/global-error.tsx` foi apagado e
`apps/web/app/global-error.tsx` criado (rename a 52% de similaridade quando os dois caminhos são preparados juntos), mais
o teste `apps/web/__tests__/globalErrorLocale.test.tsx`. Sem SDK, API, chave de tradução, env ou infra. Nenhum arquivo
em comum com `leftover-ui-strings`, que está no mesmo working tree.

## Branch

Mesma situação de `leftover-ui-strings` (ver `docs/features/leftover-ui-strings/review/review.md`):
`guilhermebittelbrunn/cycle-command-v7` reprova no regex do padrão, não tem upstream nem commit à frente de
`origin/main`. Não criei nem renomeei, por instrução do orquestrador. O nome proposto continua
`fix/leftover-ui-strings`, que passou no regex. A pergunta já está com o usuário. Se ele preferir um nome que cubra
as duas tarefas, `fix/ui-strings-and-web-global-error` também passa no padrão (`fix/<slug>`, sem `project`, porque o
diff cruza `web`, `app` e um pacote).

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum além da branch, que já está registrada na revisão de `leftover-ui-strings`.

### 🟢 Sugestão / nit

Nenhum. Não editei nenhum arquivo desta tarefa. Isso também preserva a similaridade de 52% do rename (ver "Rename" abaixo).

### ✅ OK

- `apps/web/app/global-error.tsx` está na raiz de `app/`, onde o Next procura o `global-error`. O componente é igual ao
  da app (`apps/app/app/global-error.tsx`) a menos da chave do dicionário: `getDictionary()` no corpo, `lang={locale}`
  sem fallback e nenhuma leitura da prop `error`. O tipo ainda declara `error` porque o Next a passa.
- O `console.error` de desenvolvimento saiu (D2 do plano). O Next já registra o erro capturado, e a app não tinha esse
  log.
- O comentário de duas linhas (`apps/web/app/global-error.tsx:14-15`) passa na `.claude/rules/code-comments.md` e é
  verdadeiro para a web. O root layout da landing é `apps/web/app/[locale]/layout.tsx`, que monta o `LocaleProvider`
  (`:34`), e o proxy da web grava `x-locale` em toda página que passa pelo `matcher` (`apps/web/proxy.ts:60-62`, `:111`,
  `:115`). O comentário não cita plano, etapa nem artefato.
- `lang={locale}` sem `|| "pt-br"`: `dictionaryFor()` (`packages/internationalization/client.ts:21-28`) sempre devolve
  um dos três idiomas.
- A chave `apps.web.pages.error` continua com um único consumidor, o arquivo novo, mais o teste. `grep` por
  `global-error` em `apps/`, `packages/` e `.github/` não acha nenhuma referência ao caminho antigo.
- O teste T1 segue o padrão do teste da app. Abre com `// @vitest-environment jsdom` porque a suíte da web roda em
  `node` (`apps/web/vitest.config.mts:10`), e o `jsdom` já é dependência da web (`apps/web/package.json:44`). O
  `vi.mock` das fontes vem antes do `await import`, e os dois `biome-ignore` trazem o motivo.
- O `await import("@/app/global-error")` também fixa o lugar do arquivo. Com ele de volta em `[locale]`, o import
  falha. Confirmado por leitura: o alias `@` aponta para a raiz da web (`vitest.config.mts`), então o caminho só resolve
  com o arquivo em `apps/web/app/`.
- O caso `never prints the error details` é barato e protege contra alguém passar a ler `error.message` na tela. Não é
  redundante.

### 👁 Verificar no `/test`

O defeito e a correção vivem no bundle do Turbopack, que é binário nativo e não dá para ler. Tudo abaixo depende de
build de produção. Repro comum: `throw new Error("global-error probe")` temporário em
`apps/web/app/[locale]/layout.tsx`, logo depois do `Promise.all`, e `pnpm --filter web build && pnpm --filter web start`
na porta 3001. O `throw` sai antes de terminar, e o `git status --short` volta ao do início.

1. O build termina sem reclamar da falta de `app/layout.tsx` na raiz e gera `/_global-error`. O handoff mediu isso
   (`Compiled successfully`, `_global-error.html` presente, 9 manifests apontando para o arquivo novo). Não dá para
   confirmar lendo o código.
2. A tela que aparece com o layout quebrado é a de `apps/web/app/global-error.tsx`, sem o texto "Application error: a
   server-side exception has occurred" da tela embutida. É a afirmação que sustenta a tarefa.
3. Em `/pt-br`, `/en` e `/es`: `document.documentElement.lang`, texto do `<h1>` e do botão no idioma da URL, e o status
   HTTP (o plano espera 500).
4. Em `/` sem cookie: o proxy redireciona para `/pt-br`, grava `x-locale=pt-br` e a tela sai em português.
5. Clicar no botão com o layout ainda quebrado chama `reset()`, a tela continua e não aparece erro novo no console.
6. Nem a mensagem do erro nem o `digest` aparecem na tela.

## Rename

O dev deixou o índice vazio depois do `git mv`, e o working tree mostra ` D` no caminho antigo e `??` no novo. Remedi
a similaridade num índice descartável, sem tocar no índice real:

```
GIT_INDEX_FILE=/tmp/rv-wge-index git add -A -- "apps/web/app/[locale]/global-error.tsx" apps/web/app/global-error.tsx
GIT_INDEX_FILE=/tmp/rv-wge-index git diff --cached -M --summary
 rename apps/web/app/{[locale] => }/global-error.tsx (52%)
```

O valor bate com o do handoff, e o índice real continua vazio (`git diff --cached --stat` sem saída). O plano dizia
"longe do limite de 50%". A margem real é de dois pontos: a troca de `copy` por `globalErrorCopy`, a saída do
`console.error` e o comentário novo somam 7 linhas adicionadas e 10 removidas (`git diff --cached -M --stat`).

Decisão: manter o arquivo como está e preparar os dois caminhos no mesmo `git add -A`, no mesmo commit. Motivos:

- Se os caminhos forem preparados em commits diferentes, o Git vê um apagar e um criar soltos e perde o rename,
  qualquer que seja a similaridade.
- Mexer no código para ganhar margem (voltar a variável para `copy`, por exemplo) seria mudança só para agradar a
  heurística do Git, e afastaria a web da versão da app.
- Se o rename deixar de ser detectado, o conteúdo do commit é o mesmo. Muda só a exibição na PR e o
  `git log --follow` do arquivo novo, que deixaria de ver o histórico de `[locale]`.
- Depois do commit, `git show --stat -M --oneline HEAD` precisa mostrar `rename ... (52%)`. Se mostrar apagar e criar,
  alguém mudou o arquivo no meio do caminho e vale conferir o que mudou antes do próximo commit.

## Correções aplicadas

Nenhuma nesta tarefa.

## Raio de impacto

- O Next passa a usar a tela da web no lugar da embutida em qualquer erro do root layout da landing. Nenhum outro
  código importa o arquivo.
- A chave `apps.web.pages.error` não muda.
- O arquivo apagado não tinha efeito em produção (o handoff e o plano mediram isso no build), então apagar não remove
  comportamento.

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---|---|
| Clique no botão (`reset()`) sem teste de componente | Continua aberta. O `onClick` não mudou; fica no item 5 do "Verificar no `/test`" |
| Root layout quebrando numa troca de idioma no cliente (R1) | Fora de escopo, pelo plano. É o mesmo comportamento aceito na app |
| `digest` fora da tela sem teste de componente | Continua aberta. O componente não lê `error`; fica no item 6 do "Verificar no `/test`" |

Não encontrei lacuna nova.

## Decisões em aberto

1. Branch: a mesma pergunta de `leftover-ui-strings` (renomear para `fix/leftover-ui-strings` ou para
   `fix/ui-strings-and-web-global-error`). Recomendação: renomear antes do primeiro commit. As duas tarefas vão na
   mesma PR.
2. Fora de escopo, herdado do plano: estilo e tema das duas telas de erro global (sem `styles.css` e sem o provider de
   design) e `not-found`/`error` de segmento na web. Ficam para o `/spec --sync`.

## Gates estáticos

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `pnpm check` | 969 arquivos, nenhuma correção |
| Typecheck | `pnpm turbo run typecheck --filter=web` | 1/1 ok |
| Paridade de i18n | não rodado | nenhuma chave mexida nesta tarefa; a medição de `leftover-ui-strings` (67 testes) continua valendo |

Sem `--force`. A suíte da web não foi rodada aqui. O handoff mediu 189 testes em 24 arquivos, e eu não mudei nenhum
arquivo.

## Segredos nos artefatos

Varri `docs/features/web-global-error/`, os artefatos novos do `/test` de `leftover-ui-strings` (`test/report.md` e
`test/criterios-aceite.md`) e as linhas adicionadas em `specs/BACKLOG.md` por senha, token, chave e e-mail. Só aparecem
textos de validação, a senha de exemplo `12345` e endereços `qa-*@example.com`. Os prints de
`docs/features/leftover-ui-strings/test/e2e/` são descartados pelo `.gitignore:300` e não entram no commit.

## Plano de commits (working tree inteiro)

Um plano só para as duas tarefas e a auditoria. A ordem segue a dependência: auditoria, `apps/web`, `apps/app`,
`packages/internationalization`, artefatos por último, um commit por feature.

Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio (hoje sai). Depois de cada commit, conferir
`git show --stat -M --oneline HEAD` contra a lista.

1. `docs(specs): reconcile the backlog after #53`

   ```
   git add -- specs/BACKLOG.md
   ```

2. `fix(web): render the landing global error screen from the app root`

   ```
   git add -A -- "apps/web/app/[locale]/global-error.tsx" apps/web/app/global-error.tsx apps/web/__tests__/globalErrorLocale.test.tsx
   ```

   Conferir `rename apps/web/app/{[locale] => }/global-error.tsx (52%)` no `git show`.

3. `fix(web): build the sign-in schema from the dictionary`

   ```
   git add -- "apps/web/app/[locale]/sign-in/validations/signInSchema.ts" "apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx" apps/web/__tests__/signInSchema.test.ts
   ```

4. `fix(app): show the global error screen in the visitor's language`

   ```
   git add -- apps/app/app/global-error.tsx apps/app/__tests__/globalErrorLocale.test.tsx
   ```

5. `test(app): pin the web sign-in password copy to the existing-password minimum`

   ```
   git add -- apps/app/__tests__/passwordPolicyCopy.test.ts
   ```

6. `feat(internationalization): add web sign-in validation and app global error copy`

   ```
   git add -- packages/internationalization/translations/apps/web/pages/signIn/index.ts packages/internationalization/translations/apps/app/pages/common/globalError.ts packages/internationalization/translations/apps/app/pages/common/index.ts
   ```

7. `docs(features): leftover-ui-strings`

   ```
   git add -- docs/features/leftover-ui-strings
   ```

   Os PNG de `test/e2e/` ficam de fora sozinhos, porque o `.gitignore` os descarta.

8. `docs(features): web-global-error`

   ```
   git add -- docs/features/web-global-error
   ```

Typecheck dos commits intermediários: o 2 passa sozinho, porque usa uma chave que já existe. O 3, o 4 e o 5 não passam
sem as chaves do 6, que é a consequência da ordem com i18n por último. Mantive a ordem, porque as PRs entram por squash
e o CI roda na ponta da branch. A alternativa, se o usuário quiser cada commit verde, é subir o 6 para antes do 3.

Título de PR sugerido: `fix: translate leftover ui strings and render the landing global error screen`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar `git push -u origin <branch>`.

### Commits realizados

(preenchido pelo orquestrador)
