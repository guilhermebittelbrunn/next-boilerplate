# Critérios de Aceite (Checklist)

Escopo: o teste da página da equipe (`organizationOwnership.spec.ts`), a `web` da pilha do E2E com
`NEXT_PUBLIC_API_URL`, o spec novo `crossAppSignOut.spec.ts` e a remoção do `<AuthProvider>` duplicado de
`apps/web/app/[locale]/layout.tsx`. O status de cada item, com o meio de verificação, está em
[`report.md`](report.md).

- [ ] **O axe da página da equipe só roda com a tabela de convites estável**
  Depois do `reload` da página do convidado, o teste espera a resposta de `GET /organization/invitations` daquela
  carga, confere que ela voltou com sucesso e só então espera os dois botões "Atualizar" habilitados e com
  opacidade 1. No trace, a resposta da requisição chega antes do `axe.runPartial`. A regra `color-contrast`, o
  `A11Y_ALLOWLIST` vazio, o `retries` e o `failOnFlakyTests` continuam como estavam: o teste não pode ter sido
  afrouxado para passar.

- [ ] **O spec da equipe passa repetido sem reprovação por contraste**
  Com `--repeat-each` de pelo menos 10 e `--retries=0`, nenhuma execução de `organizationOwnership.spec.ts`
  reprova por `color-contrast`. Uma quebra por tempo sob `next dev` frio é registrada à parte, como achado já
  conhecido do backlog, e não conta como regressão desta tarefa. Quebra por contraste reprova.

- [ ] **A landing da suíte fala com a API**
  `buildStackEnv("web")` devolve `NEXT_PUBLIC_API_URL` igual à URL da API da pilha, mesmo com o valor vazio no
  `.env.example`. `NEXT_PUBLIC_APP_URL` continua vazia, e o CTA da landing segue abrindo o cadastro da própria
  landing (`landing.spec.ts` verde). O teste de unidade do `stackEnv` fixa os dois valores.

- [ ] **Sair na landing encerra a sessão na app**
  Entrar pela app, abrir a landing (que aparece logada pelo bootstrap da SSO) e clicar em "Sair". O
  `DELETE /api/auth/session` da landing responde com sucesso. Ao abrir a app de novo, ela termina em
  `/pt-br/sign-in` com o aviso "Esta sessão foi encerrada. Entre novamente para continuar.", e uma segunda
  navegação para `/pt-br` volta ao `sign-in`, sem cookie regravado.

- [ ] **Sair na app encerra a sessão na landing**
  Entrar pela app, abrir a landing logada, voltar à app e sair pelo menu do perfil. Ao abrir a landing de novo,
  ela mostra o mesmo aviso de sessão encerrada uma única vez (o locator é estrito) e vai para `/pt-br/sign-in` da
  landing; a app continua no `sign-in` numa navegação seguinte. Sem a variável na `web`, a landing regravaria o
  cookie e logaria a app de novo.

- [ ] **Os dois testes novos detectam o defeito que cobrem**
  Com a linha da `web` revertida temporariamente em `stackEnv.ts`, os dois testes de `crossAppSignOut.spec.ts`
  reprovam. Com a linha restaurada, passam. A reversão não entra no diff.

- [ ] **A landing monta um AuthProvider só**
  O layout raiz da `web` não monta `<AuthProvider>` próprio; o único é o que o `DesignSystemProvider` já monta.
  Um teste de unidade renderiza a árvore do layout e conta exatamente uma montagem do provider, e reprova se o
  provider interno voltar. Os consumidores de `useAuth` (header, `ClientLayout`, formulários de login, cadastro e
  contato) continuam recebendo contexto, sem erro "useAuth must be used within an AuthProvider".

- [ ] **Login com senha pela landing: um toast e o destino certo**
  Entrar em `/pt-br/sign-in` da `web` com a conta comum do seed mostra o toast "Login realizado com sucesso!" uma
  vez e leva a `/pt-br` da landing. A contagem de `POST /api/auth/session` na origem da landing fica registrada;
  se passar de um, o relatório separa o par `onAuthSuccess` + observador do token (caso aberto do backlog, presente
  também na `apps/app`, que tem um provider só) de um segundo provider.

- [ ] **Carga da landing com sessão vinda da app**
  Com a sessão aberta na app, a primeira carga da landing faz uma `POST /api/auth/custom-token` e no máximo uma
  `POST /api/auth/session/refresh`, sem `POST /api/auth/session`. Num `reload` em seguida, o cliente Firebase da
  landing já tem usuário: nenhuma `custom-token` e no máximo uma `refresh`.

- [ ] **Senha errada na landing: um toast de erro**
  Senha errada no login da `web` mostra a mensagem traduzida ("Senha incorreta." no emulador, ou a de credencial
  inválida num projeto com proteção contra enumeração) uma única vez, a página fica em `/pt-br/sign-in` e nenhuma
  chamada de sessão sai para o servidor da landing.

- [ ] **A landing renderiza igual depois da remoção do provider**
  A remoção não muda nenhum pixel: a home da landing, deslogada, em pt-br, tem a mesma captura de tela antes e
  depois da mudança em light desktop, dark desktop e light mobile. A matriz de 3 idiomas não se aplica, porque o
  provider removido não lê nem escreve copy.

- [ ] **A sessão do seed usada pelos outros specs continua viva**
  Os testes novos usam um contexto próprio e revogam só a sessão aberta nele. Os specs que rodam depois com
  `AUTH_STATE.common` (`entityCrud`, `panelSwitch` e os demais) seguem verdes na mesma execução de `pnpm e2e`.

- [ ] **Gates estáticos, suíte e documentação**
  `pnpm check`, `pnpm --filter e2e typecheck` e `pnpm --filter web typecheck` sem erro; `pnpm test` da raiz
  verde. `docs/SETUP.md` cita a saída entre apps na lista de fluxos da suíte. Nenhum comentário novo cita o fluxo
  de desenvolvimento.
