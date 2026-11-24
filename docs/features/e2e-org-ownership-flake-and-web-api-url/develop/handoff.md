# Handoff do develop: E2E instável de `organizationOwnership` e a `web` sem `NEXT_PUBLIC_API_URL`

Implementado sobre o working tree das fatias 2 e 3 de `delivery-security-review`, sem tocar nos arquivos delas.
Em `docs/SETUP.md` entrou um hunk só (a lista de fluxos da seção "Testes E2E"); os três hunks de cima são da
outra fatia.

## Blueprint → arquivos

| item do plano | arquivo | o que mudou |
|---------------|---------|-------------|
| 10.1 | `apps/e2e/tests/organizationOwnership.spec.ts` | constante `INVITATIONS_API_PATH`; `waitForResponse` da `GET /organization/invitations` registrado antes do `reload` do convidado; `expect(response.ok())`; `toBeEnabled()` antes do `toHaveCSS("opacity", "1")` em cada "Atualizar". O comentário antigo virou um de 3 linhas explicando por que esperar a busca |
| 10.2 | `apps/e2e/support/stackEnv.ts` | `crossAppUrls("web")` devolve `{ NEXT_PUBLIC_API_URL: urls.api }`, com o comentário de 2 linhas sobre `NEXT_PUBLIC_APP_URL` ficar vazia |
| 10.3 | `apps/e2e/__tests__/stackEnv.test.ts` | caso "points each app at the other two" fixa `NEXT_PUBLIC_API_URL === urls.api` e `NEXT_PUBLIC_APP_URL === ""` na `web`, com a chave vazia no `.env.example` |
| 10.4 | `apps/e2e/tests/crossAppSignOut.spec.ts` (novo) | os dois testes do esqueleto, com um ajuste de locator (ver Desvios) |
| 10.5 | `apps/e2e/tests/global.setup.ts` | aquecimento compila `${WEB_URL}/pt-br/sign-in` |
| 10.6 | `docs/SETUP.md` | a lista de fluxos cita a saída entre apps |
| fora do plano | `apps/web/app/[locale]/layout.tsx` | remove o `<AuthProvider>` duplicado (ver Desvios) |

## Contrato

Nenhum DTO, action ou rota muda. A pilha do E2E passa a dar `NEXT_PUBLIC_API_URL` à `web`; nenhum fork precisa
configurar nada.

## Códigos de erro novos

Nenhum. Nenhuma chave de i18n nova; os testes leem `components.header.signOut`/`signIn`,
`apps.app.shared.profileDropdown.triggerLabel`/`signOut` e `packages.auth.provider.session.revoked`.

## Desvios

1. **`<AuthProvider>` duplicado na `web` (correção de produto fora do plano).** O plano dizia que nenhum código
   de produto mudava. Na primeira execução, o teste "signing out in the app ends the session on the landing"
   reprovou em strict mode porque a landing mostrou **dois** toasts iguais de sessão encerrada. A causa está no
   código: `apps/web/app/[locale]/layout.tsx` monta `<AuthProvider>` dentro do `<DesignSystemProvider>`, que já
   monta o seu (`AuthProviderWithAlerts`, `packages/design-system/index.tsx:44`). São duas assinaturas de
   `onIdTokenChanged`, cada uma com seus próprios refs de proteção. No trace dessa execução, a landing fez duas
   `POST /api/auth/custom-token`, duas `POST /api/auth/session/refresh` por carga e duas `POST /api/auth/session`
   no fim. Tirei o provider interno. Os dois são equivalentes em props: o externo passa `getRedirectPath`
   = `/${locale}` (o mesmo padrão do interno) e `onError`, que o `AuthProvider` nem desestrutura. Escolhi corrigir
   em vez de usar `.first()` no teste, que esconderia o defeito. O `/review` deve separar isso num commit
   `fix(web)` próprio.
2. **Locator do "Entrar" da landing.** `getByRole("link", { name: "Entrar" })` casou três links (o do header e
   dois "Entrar em contato" que levam a `/pt-br/contact`). Passou a ser
   `getByRole("banner").getByRole("link", { name, exact: true })`.
3. Nenhum outro desvio. O restante seguiu o esqueleto do plano, incluindo o padrão de repetir o clique no
   gatilho do menu do perfil até o item "Sair" aparecer.

## Decisões em aberto / bloqueios

- Nenhum bloqueio.
- O desvio 1 mexe em `apps/web`, fora do escopo declarado. Se preferirem não mexer no produto nesta tarefa, a
  alternativa é reverter o `layout.tsx` e trocar a asserção do toast por `.first()`, registrando o toast duplo
  no backlog. Não recomendo: o teste deixaria de pegar o defeito.

## Validação

Ambiente: macOS, JDK 21 (`/opt/homebrew/opt/openjdk@21`), portas 3000 a 3003, 8080 e 9099 livres antes de cada
execução (`lsof -nP -iTCP:... -sTCP:LISTEN` vazio). O Playwright subiu e derrubou o próprio stack; nenhum
processo sobrou. Os `apps/*/AGENTS.md` gerados pelo `next dev` foram apagados.

| gate | comando | resultado |
|------|---------|-----------|
| vitest do e2e | `pnpm --filter e2e test` | 3 arquivos, 38 testes, todos verdes (`stackEnv.test.ts` com 9) |
| typecheck e2e | `pnpm --filter e2e typecheck` | sem erro |
| typecheck web | `pnpm --filter web typecheck` | sem erro |
| vitest da web | `pnpm --filter web test` | 34 arquivos, 313 testes, todos verdes |
| lint | `pnpm check` | 1121 arquivos, nenhum ajuste |
| estabilidade | `playwright test tests/organizationOwnership.spec.ts tests/crossAppSignOut.spec.ts --project=chromium --repeat-each=6 --retries=0` | 22 passed (4 de setup, 6 de `organizationOwnership`, 12 de `crossAppSignOut`), 4,3 min, nenhuma reprovação |
| landing e vizinhos | `playwright test tests/landing.spec.ts tests/a11yDark.spec.ts tests/signUp.spec.ts --retries=0` (chromium e mobile) | 24 passed, inclusive `landing.spec.ts:11` (CTA abre o cadastro da landing) nos dois projetos e o axe da landing no escuro |
| detecção do defeito | `support/stackEnv.ts` revertido temporariamente para `return {}`, `playwright test tests/crossAppSignOut.spec.ts --project=chromium --retries=0` | os dois testes reprovaram em `getByText(sessionEndedNotice)`: `element(s) not found`. Linha restaurada logo depois (`grep` confirma `NEXT_PUBLIC_API_URL: urls.api`) |

Sobre o toast duplo: depois da correção, o `getByText(sessionEndedNotice)` em strict mode passou nas 6 repetições
do teste 2, o que só acontece com um toast. O log do servidor da execução com trace mostra uma
`[web] POST /api/auth/custom-token` por carga da landing.

O `organizationOwnership` levou entre 14,4 s e 25,2 s nas repetições. Nenhuma reprovação por tempo apareceu,
mas a pilha já estava aquecida pelo setup.

## A verificar no `/test`

- V4 do plano: ordem no trace. Rodar `organizationOwnership.spec.ts` com `--trace on` e conferir, no contexto do
  convidado, que a `GET /organization/invitations` termina antes do `axe.runPartial`. Não abri esse trace.
- V2 do plano: `pnpm e2e` inteiro, uma vez, para confirmar que a sessão do seed em `AUTH_STATE.common` continua
  viva para `entityCrud`, `panelSwitch` e os outros depois dos testes novos. Não rodei a suíte inteira.
- Login pela própria landing (`/pt-br/sign-in` da `web`) com um provider só: entrar, ver o toast de sucesso uma
  vez e cair no destino certo. Nenhum spec cobre esse caminho; repro manual com `user@example.com` do seed.
- Ausência de toast duplo em outras mensagens da landing (erro de login com senha errada). Inferido pelo código,
  não medido.

## Lacunas de teste conhecidas

- Nenhum teste de unidade fixa que a `web` monta um `AuthProvider` só. A cobertura do desvio 1 é indireta: o
  strict mode do `getByText` em `crossAppSignOut.spec.ts`.
- As quebras por tempo sob `next dev` frio do mesmo spec continuam fora de escopo (linha 1648 do backlog).
