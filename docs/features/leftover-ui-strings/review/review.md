# Revisão: leftover-ui-strings

Rodada autônoma do `/cycle`, sem ninguém acompanhando. Revisão por leitura do diff mais os gates estáticos. Não subi
app, não usei navegador e não rodei a suíte de testes.

Escopo: `apps/web` (login da landing), `apps/app` (tela de erro global) e `packages/internationalization` (chaves
novas). Sem SDK, API, `error.code`, env ou infra.

## Branch

- Atual: `guilhermebittelbrunn/cycle-command-v7`, sem upstream e sem commit à frente de `origin/main`.
- Regex do padrão `<project>/<type>/<title>`: **inválida** (`BRANCH INVALIDA: guilhermebittelbrunn/cycle-command-v7`).
  O prefixo `guilhermebittelbrunn/` não é projeto e `cycle-command-v7` não é `<type>/<title>`.
- Nesta rodada autônoma não criei nem renomeei branch, por instrução do orquestrador. Fica como decisão em aberto.
- Nome proposto: `fix/leftover-ui-strings`. O diff cruza dois apps (`web` e `app`) e um pacote, então o `project` sai,
  que é a forma sem prefixo aceita pela regra. O nome passou no regex (`proposta OK: fix/leftover-ui-strings`).
- Como a branch não tem remoto nem commit de terceiro, o caminho previsto é o renome:
  `git branch -m fix/leftover-ui-strings`.

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- Branch fora do padrão (seção acima). Não bloqueia o código, mas o `/review` precisa resolver antes do primeiro
  commit.

### 🟢 Sugestão / nit

- `apps/app/app/global-error.tsx:15`: o comentário dizia que o proxy grava o cookie "on every request". O `matcher` de
  `apps/app/proxy.ts:122` exclui `_next/static`, `_next/image`, `favicon.ico` e `api`, e `route()` devolve antes de
  gravar quando o caminho é arquivo estático (`proxy.ts:210-212`). Troquei por "on each page request". Corrigido.

### ✅ OK

- Comentário de duas linhas em `apps/app/app/global-error.tsx:14-15` conferido contra
  `.claude/rules/code-comments.md`. Ele cabe na exceção de "restrição não evidente": quem lê o arquivo vê
  `getDictionary()` e supõe o `LocaleProvider` montado, mas essa tela substitui o root layout, que é onde o provider
  vive (`apps/app/app/layout.tsx:79`). O texto traz a regra em si, explica o porquê e não cita plano, etapa nem
  artefato. Mantido, só com o ajuste do 🟢 acima.
- `apps/web/app/[locale]/sign-in/validations/signInSchema.ts` segue a mesma forma de `buildSignUpSchema`
  (`apps/web/app/[locale]/sign-up/validations/signUp.ts:5-26`) e do `buildSignInSchema` da app. O mínimo continua
  `EXISTING_PASSWORD_MIN_LENGTH`, não `PASSWORD_MIN_LENGTH`.
- `sign-in-form-client.tsx:29` monta o schema com `useMemo` a partir do `dictionary` já lido no corpo, o que respeita o
  aviso de `packages/internationalization/client.ts:59-63` (não ler contexto dentro do callback).
- `signInSchema` não tem outro consumidor: `grep` em `apps/web` só acha o formulário e o teste novo. Confirma o que o
  handoff dizia.
- Texto das chaves novas igual ao de origem, conferido nos três idiomas: `apps.web.pages.signIn.validation` bate com
  `apps.app.pages.signIn.validation` (`translations/apps/app/pages/signIn/index.ts:15-16`, `:39-40`, `:63-64`), e
  `apps.app.pages.common.globalError` bate com `apps.web.pages.error`.
- `lang={locale}` sem fallback: `dictionaryFor()` (`client.ts:21-28`) sempre devolve um dos três idiomas.
- Testes no lugar e no nível certos: schema com o dicionário real (T1), cópia da política de senha (T2) e componente
  com `renderToString` (T3). O `vi.mock` de `@repo/design-system/lib/fonts` vem antes do `await import`. Os dois
  `biome-ignore` do T3 trazem o motivo.
- Afirmação do handoff confirmada lendo a fonte do Next 16.0.0: quando o root layout falha no SSR,
  `dist/server/app-render/app-render.js:811-820` monta só a casca `<html id="__next_error__">` e manda o
  `GlobalError` no payload `G`. O `global-error` não é renderizado no servidor nesse caminho, então o HTML do servidor
  não sai no idioma padrão para divergir do cliente.
- Afirmação do handoff confirmada por leitura: o T3 com o arquivo antigo falharia em pt-br, es e sem cookie e passaria
  em en, porque o arquivo antigo tinha `lang="en"` e o texto em inglês fixos.
- R1 do plano (cookie legível no cliente): `proxy.ts:234` chama `cookieStore.set("x-locale", currentLocale)` sem
  opções, e o cookie sai sem `HttpOnly`. Confirmado por leitura; o `/test` só precisa medir se for barato.
- `/code-review` (nível low) sem achado.

### 👁 Verificar no `/test`

1. Ligação schema → formulário → mensagem na tela do login da landing. Só o schema foi medido (T1). Repro:
   `apps/web` de pé, sem sessão, em `/pt-br/sign-in`, `/en/sign-in` e `/es/sign-in`. Enviar o formulário vazio e
   depois `qa@example` com senha `12345`. Esperado nos dois casos: `emailInvalid` e `passwordMin` no idioma da URL.
   Não usar valor sem `@`, porque o balão nativo do navegador aparece antes do Zod. Registrar o texto exato por idioma.
   É a afirmação que sustenta o corte da tarefa.
2. Mensagens em espanhol no cartão do login a 375 px, claro e escuro (o texto em espanhol é o mais longo).
3. Tela de erro global no caminho real. O T3 prova o render com o cookie, mas ninguém montou o root layout quebrando.
   Repro: `throw` temporário em `apps/app/app/layout.tsx`, `pnpm --filter app build && start`, visitar `/en` e `/es`,
   conferir título, botão e `lang` do `<html>`, e remover o `throw` antes de terminar. Sem esse repro, fica 🔒 com o
   T3 como evidência.
4. O build da app pré-renderiza `/_global-error` (`next/dist/build/index.js`) com o `getDictionary()` no servidor, que
   cai no idioma padrão. A leitura indica que não quebra, mas ninguém rodou o build. Repro: o mesmo
   `pnpm --filter app build` do item 3, conferindo que termina sem erro.

## Correções aplicadas

| Arquivo | O que mudou |
|---|---|
| `apps/app/app/global-error.tsx:15` | "on every request" virou "on each page request" no comentário, para refletir o `matcher` do proxy |

Nenhuma mudança de comportamento.

## Raio de impacto

- O único contrato tocado é o tipo do dicionário, com duas chaves novas: `apps.web.pages.signIn.validation` e
  `apps.app.pages.common.globalError`. Nenhuma chave existente mudou de nome ou saiu.
- `signInSchema` (a constante) deixou de existir em `apps/web`. O único consumidor era o formulário, já ajustado.
- `apps/app/app/global-error.tsx` não é importado por ninguém além do Next e do T3.

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---|---|
| Sem teste de componente do `sign-in-form-client.tsx` | Continua aberta, por decisão do plano (§7). Fica coberta pelo item 1 do "Verificar no `/test`" |
| O T3 não clica no botão para conferir `reset()` | Continua aberta. O `onClick` não mudou neste diff, então não recomendo escrever teste só para isso |

Não encontrei lacuna nova.

## Decisões em aberto

1. **Branch.** Renomear `guilhermebittelbrunn/cycle-command-v7` para `fix/leftover-ui-strings` antes de commitar
   (`git branch -m fix/leftover-ui-strings`). Recomendação: renomear. Não há remoto nem commit na branch, então o
   renome não custa nada.
2. **Commits intermediários sem typecheck.** Na ordem da regra (i18n por último), os commits 3, 4 e 5 do plano abaixo
   não passam no `typecheck` sozinhos, porque as chaves só chegam no commit 6. Decidi manter a ordem e os commits
   separados: as PRs deste repositório entram por squash, o CI roda na ponta da branch, e juntar tudo num commit só
   misturaria dois apps e um pacote, que a regra proíbe. Se o usuário preferir cada commit verde, a alternativa é
   subir o commit de i18n para antes dos de web e app.
3. **Fora de escopo, herdado do plano (§1.5).** `noValidate` no login da landing, o `global-error` inerte da
   `apps/web` e a tela de erro da app sem `styles.css` continuam abertos e são do `/spec --sync`. Nenhum foi tocado
   aqui.

## Gates estáticos

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `pnpm check` | 968 arquivos, nenhuma correção |
| Typecheck | `pnpm turbo run typecheck --filter=web --filter=app --filter=@repo/internationalization` | 3/3 tarefas ok (2 do cache; `app` rodou de novo por causa do comentário) |
| Paridade de i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes ok |

Sem `--force`. Não rodei as suítes de `web` e `app`; o handoff mediu 184 e 975 testes, e a minha única mudança foi um
comentário.

## Segredos nos artefatos

Varri `docs/features/leftover-ui-strings/` e as linhas adicionadas em `specs/BACKLOG.md` por senha, token, chave e
e-mail. Só aparecem nomes de chave (`passwordMin`), a senha de exemplo `12345` do roteiro de validação e endereços
`@example.com`. Nada a remover.

## Plano de commits

A tarefa irmã `web-global-error` entrou no mesmo working tree e na mesma branch. O plano único, com os comandos
`git add` exatos, está em `docs/features/web-global-error/review/review.md`. A lista abaixo é a mesma, com o commit da
tela de erro da web como 2. As mensagens desta tarefa não mudaram, só a numeração.

Antes do primeiro commit, `git diff --cached --stat` precisa sair vazio (hoje sai). Depois de cada um, conferir
`git show --stat -M --oneline HEAD` contra a lista.

1. `docs(specs): reconcile the backlog after #53`
   - `specs/BACKLOG.md`
2. `fix(web): render the landing global error screen from the app root` (tarefa `web-global-error`)
   - `apps/web/app/[locale]/global-error.tsx` (apagado) e `apps/web/app/global-error.tsx`, no mesmo `git add -A`
   - `apps/web/__tests__/globalErrorLocale.test.tsx`
3. `fix(web): build the sign-in schema from the dictionary`
   - `apps/web/app/[locale]/sign-in/validations/signInSchema.ts`
   - `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`
   - `apps/web/__tests__/signInSchema.test.ts`
4. `fix(app): show the global error screen in the visitor's language`
   - `apps/app/app/global-error.tsx`
   - `apps/app/__tests__/globalErrorLocale.test.tsx`
5. `test(app): pin the web sign-in password copy to the existing-password minimum`
   - `apps/app/__tests__/passwordPolicyCopy.test.ts`
6. `feat(internationalization): add web sign-in validation and app global error copy`
   - `packages/internationalization/translations/apps/web/pages/signIn/index.ts`
   - `packages/internationalization/translations/apps/app/pages/common/globalError.ts`
   - `packages/internationalization/translations/apps/app/pages/common/index.ts`
7. `docs(features): leftover-ui-strings`
   - `docs/features/leftover-ui-strings/` (inteira: `STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
     `review/review.md`, `test/criterios-aceite.md` e `test/report.md`; os PNG de `test/e2e/` ficam fora pelo
     `.gitignore`)
8. `docs(features): web-global-error`
   - `docs/features/web-global-error/`

Os commits 3, 4 e 5 não passam no `typecheck` sozinhos (as chaves chegam no 6). O 2 passa.

Título de PR sugerido para as duas tarefas: `fix: translate leftover ui strings and render the landing global error
screen`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar `git push -u origin <branch>`.

### Commits realizados

(preenchido pelo orquestrador)
