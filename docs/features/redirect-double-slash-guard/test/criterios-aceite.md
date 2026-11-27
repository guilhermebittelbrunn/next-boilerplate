# Critérios de Aceite (Checklist)

Tarefa: `postAuthRedirectTarget` (`packages/auth/redirect.ts`) recusa o destino cujo `pathname`, depois de
resolvido pelo parser de URL, contém `//`. Função pura, sem tela, rota de API, chave de i18n ou `error.code`
novos. Autorização, ownership, modo de produto, tema, responsivo e idiomas não se aplicam: o guard não
depende de usuário nem renderiza nada, e trata `pt-br`, `en` e `es` pela mesma regra de prefixo.

- [x] **Caminho que resolve com barra dupla cai no fallback**
  `postAuthRedirectTarget` devolve o fallback para `"/pt-br/\t/evil.com"`, `"/pt-br/\n/evil.com"`,
  `"/pt-br/\r/evil.com"`, `"/pt-br/\\evil.com"`, `"/pt-br/\\/evil.com"` e `"/pt-br/x/\\y"`. Em todos, o valor
  bruto não tem `//`, mas o `pathname` resolvido tem. O caso literal `"/pt-br//evil.com"` continua recusado
  pela checagem anterior.

- [x] **Destino legítimo continua aceito sem alteração**
  Caminhos com prefixo de idioma, com segmentos de ponto que ficam dentro de um idioma, com query (inclusive
  `%26`, `%25` e `%` solto) e com `%2F`, `%5C` e `%09` codificados voltam exatamente como entraram.
  `"/pt-br/"` e `"/pt-br/x\t/y"` também são aceitos, porque o caminho resolvido não tem `//`.

- [x] **A regra nova olha só o pathname**
  A checagem nova usa `new URL(...).pathname`, que exclui query e hash. `//` em query ou hash continua
  caindo no fallback pela checagem que já existia sobre o valor bruto. A tarefa não muda esse
  comportamento, e o teste passa a documentá-lo.

- [x] **Chamadores inalterados**
  Nenhum chamador do guard muda (`apps/app/proxy.ts`, `apps/app/shared/lib/postLoginNavigation.ts`,
  `apps/app/shared/lib/authRedirectLink.ts`, `apps/app/shared/lib/onboarding.ts`,
  `packages/auth/provider.tsx`, `packages/auth/middleware.ts`). Cada um recebe o mesmo fallback que já
  recebia para qualquer outra entrada recusada; `withRedirectQuery` gera o link sem `?redirect=`.

- [x] **O teste prende a regra**
  Com a condição `&& !resolvedPath.includes("//")` removida, o
  `it("rejects a path the URL parser resolves to a double slash")` falha e as seis entradas de recusa
  passam a ser devolvidas como vieram. Com a condição de volta, as seis caem no fallback.

- [x] **Suíte e gates verdes**
  `pnpm --filter @repo/auth test`, typecheck do pacote e da app, `pnpm check` e o `pnpm test` da raiz
  passam. O resultado de cada um, com a carga da máquina na hora, está em `test/report.md`.
