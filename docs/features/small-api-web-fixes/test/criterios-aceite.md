# Critérios de Aceite (Checklist)

Lote de correções pequenas: link "esqueci a senha" no login da landing (item 2), guard de redirect sem a
segunda decodificação (item 3), `escapeRegExp` compartilhado no E2E (item 5) e porta do script `start` da
`web` e da `api` (item 6). O status de cada critério, com o meio de verificação, está em `report.md`.

- [ ] **Link "esqueci a senha" aparece no login da landing nos 3 idiomas**
  Com `NEXT_PUBLIC_APP_URL` preenchida, `/{pt-br,en,es}/sign-in` da landing mostra o link com a copy do idioma:
  "Esqueci minha senha", "Forgot your password?" e "¿Olvidaste tu contraseña?". O texto vem do dicionário
  (`apps.web.pages.signIn.forgotPassword`) e é idêntico ao do login da app. O link fica acima da linha
  "Não tem uma conta? Cadastre-se", e esta continua igual.

- [ ] **O link leva à recuperação de senha da app, no mesmo idioma**
  O `href` é `<NEXT_PUBLIC_APP_URL sem barra final>/{locale}/forgot-password`. Uma barra final na variável não
  pode gerar `//` no caminho. O clique faz carga completa (é outra origem) e abre a tela de recuperação da app,
  que é pública: um visitante sem sessão não é mandado para o login.

- [ ] **Sem `NEXT_PUBLIC_APP_URL`, o link some e a tela não muda**
  Com a variável vazia (`""`, como o `.env.example` publica) ou ausente, a landing sobe, o login renderiza sem o
  link e com o resto igual: campos, botão Google e link de cadastro. String vazia conta como ausência; ela não
  pode virar um `href` relativo como `/en/forgot-password`, que daria 404 na landing.

- [ ] **Layout e contraste do bloco de links em light, dark e mobile**
  O bloco `space-y-2` com os dois parágrafos fica centralizado e sem sobreposição em desktop e em 390 px de
  largura. O link usa `text-primary`, a mesma classe do link de cadastro, e precisa de contraste AA nos dois
  temas. Nada estoura a largura do formulário no mobile.

- [ ] **Destino de redirect com `%26` ou `%25` na query sobrevive ao login**
  `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities%3Fq%3Da%2526b` termina, depois do login, em
  `/pt-br/entities?q=a%26b`. Antes da correção o guard decodificava de novo e o destino virava `q=a&b`, com o
  parâmetro partido em dois. Um `%` solto no destino (`?v=100%25`) também chega intacto em vez de cair no
  fallback do idioma.

- [ ] **Deep link comum continua chegando ao destino exato**
  `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling` leva a `/pt-br/account?tab=billing` depois do
  login. É o caso de uso normal e não pode regredir com a remoção da decodificação.

- [ ] **Open redirect continua recusado**
  `//evil.com`, `/\evil.com`, `/pt-br/%2e%2e/%5cevil.com`, `javascript:alert(1)` e destinos sem o prefixo de um
  idioma válido caem no fallback `/{locale}`. Um valor que chega ainda codificado (`%2Fpt-br%2Fentities`) também
  cai no fallback, porque não começa com `/`.

- [ ] **Caminho com `%2F%2F` vindo do onboarding nunca sai da origem**
  Com usuário comum e onboarding pendente, abrir `/pt-br/%2F%2Fevil.com` redireciona para o onboarding com o
  destino preservado. Concluir o onboarding leva a `/pt-br/%2F%2Fevil.com` na própria app (404 da app), nunca
  a `evil.com` ou a qualquer outro host. Admin e impersonação não passam pelo onboarding.

- [ ] **Teste do guard roda no pacote dono**
  `pnpm --filter @repo/auth test` executa `packages/auth/__tests__/postAuthRedirectTarget.test.ts`, e o arquivo
  antigo em `apps/app/__tests__/` não existe mais. Restaurar a segunda decodificação faz o teste falhar.

- [ ] **E2E usa um `escapeRegExp` só**
  Os quatro specs que montam `RegExp` com texto do dicionário usam `apps/e2e/support/regExp.ts`. Um rótulo com
  metacaractere (`Plano (anual) + 50%?`) casa só com ele mesmo. A suíte `pnpm e2e` não muda de resultado.

- [ ] **`start` da `web` e da `api` sobe na porta certa, e `PORT` vence**
  Com build de produção, `pnpm --filter web start` responde em `:3001` e `pnpm --filter api start` em `:3002`
  (`/health` devolve `200 {"message":"OK"}`). Com `PORT=3105`, cada um responde em `:3105` e não na porta
  padrão. Nenhum dos dois pode subir na 3000, que é a porta da app.

- [ ] **Gates verdes**
  `pnpm test` da raiz (com `test:emulator`, JDK 21), a paridade de i18n e o `typecheck` dos workspaces tocados
  passam sem `--force` e sem afrouxar timeout.
