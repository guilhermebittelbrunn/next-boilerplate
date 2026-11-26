# Revisão: higiene de repositório e CI

Rodada autônoma do `/cycle`, 2026-11-26. Escopo: os cinco arquivos do `develop/handoff.md`
(`packages/auth/__tests__/serverErrorLogging.test.ts`, `docs/SETUP.md`, `packages/next-config/index.ts`,
`packages/next-config/__tests__/config.test.ts`, `.github/dependabot.yml`). As outras cinco tarefas do
working tree já foram revisadas e ficaram fora desta leitura. A passada genérica de bugs foi feita à mão,
sem a skill `/code-review`: o diff desta tarefa tem 16 linhas, e a skill varreria o working tree inteiro.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. **Reprova** no regex do Passo 3 de
  `.claude/commands/review.md`. Sem upstream e sem commit à frente de `origin/main`.
- Esta rodada não cria nem renomeia branch (regra do `/cycle`).
- Proposta mantida: `feat/admin-account-forms-and-session-revocation`, que passa no regex (conferido nesta
  revisão). O nome não cita a higiene de CI, mas ela é a menor das seis tarefas (5 arquivos, nenhum de
  produto). Um nome que listasse as seis ficaria longo sem ajudar a filtrar o histórico. O título de PR
  abaixo cita a higiene.

## Revisão: repo-hygiene-ci

### 🔴 Bloqueante

- `analyze/plan.md:70` (antes desta revisão): o bloco `diff` do plano copiava a declaração
  `const LEAKY_TOKEN = "<literal>"` sem a diretiva, na linha de remoção. O commit `docs(features)` entra no
  intervalo que o job `secrets` varre, e a linha tem a mesma forma (`TOKEN = "<valor longo>"`) que o
  Gitleaks marcou no teste. Com a cópia, o job reprovaria no último commit da PR, depois de o fixture já
  estar resolvido. Corrigido: o literal saiu do plano e do handoff (ver "Correções aplicadas"). Que a regra
  dispararia nessa linha é leitura, não medição; o Gitleaks não está instalado aqui.

### 🟡 Atenção

- `.github/dependabot.yml:10-13`: não está confirmado se o `ignore` com `update-types` também bloqueia as
  atualizações de segurança do `stripe`. Evidência parcial, coletada pelo orquestrador: a referência de
  opções do Dependabot
  (<https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference>)
  diz, na seção `allow`, "`update-types` only affects *version* updates, not *security updates*". A seção
  `ignore` não foi lida, e a frase de `allow` não prova nada sobre `ignore`. Fica 🔒 até alguém ler a seção
  `ignore` ou observar uma PR de segurança do `stripe` depois do merge. Se o `ignore` bloquear, uma correção
  que só exista numa versão maior chega apenas pelo alerta de segurança, que segue desligado
  (`docs/PRE-PRODUCTION.md` §9). O arquivo não mudou por causa disso.

### 🟢 Sugestão / nit

- Nenhum.

### ✅ OK

- `packages/auth/__tests__/serverErrorLogging.test.ts:62`: `// gitleaks:allow` é diretiva lida por
  ferramenta, do mesmo tipo de `biome-ignore`. Não explica código, não narra a etapa nem cita o fluxo, então
  não entra no que `.claude/rules/code-comments.md` proíbe. Vai sozinha, sem justificativa. O valor do
  token não mudou e a diretiva está na mesma linha do literal depois do `pnpm check` do handoff (conferido
  por `grep`).
- O `LEAKY_TOKEN` é fictício: o cabeçalho decodifica para `{"alg":"RS256"}`, e as duas outras partes são as
  palavras `ficticio` e `assinatura`, sem base64 nem assinatura real.
- `docs/SETUP.md:210-215` bate com `.github/workflows/ci.yml:56-95`: o job baixa o Gitleaks 8.30.1 e roda
  `gitleaks git --redact --no-banner --log-opts="$range"` só sobre os commits da PR (`BASE..HEAD`) ou do push
  (`BEFORE..SHA`). O argumento contra o `.gitleaksignore` vale para esse modo: a impressão digital carrega o
  SHA, e o push na `main` depois do squash varre um commit novo. A linha com a diretiva entra no squash, então
  esse caminho também passa. Não há `.gitleaks.toml` nem `.gitleaksignore` no repositório.
- `packages/next-config/index.ts:5`: `agentRules?: boolean` existe no `NextConfig` do Next 16.4.6
  (`node_modules/next/dist/server/config-shared.d.ts`, default `true`). As três apps herdam:
  `apps/api/next.config.ts:4` e `apps/web/next.config.ts:4` usam `config` direto, e
  `apps/app/next.config.ts:16` espalha `...config`. Nenhuma app sobrescreve a chave. A `apps/email` não tem
  `next.config`.
- Genérico no pacote: `agentRules: false` é configuração de ferramenta, sem domínio de produto, e vale para
  todo fork. Ver a decisão 1 abaixo.
- `packages/next-config/__tests__/config.test.ts:14-16`: teste no nível mais barato, no arquivo que já cobre
  a config, com imports explícitos de `vitest`.
- `.github/dependabot.yml:10`: o comentário registra uma restrição externa (a versão maior do SDK da Stripe
  fixa uma versão nova da API), uma das duas exceções da regra de comentários. A sintaxe do `ignore` é a
  documentada.
- Nenhum arquivo de outra tarefa foi tocado; `docs/SETUP.md` tem um único hunk, o desta tarefa.

### 👁 Verificar no `/test`

1. **O fixture deixa de disparar com a diretiva** (é a afirmação que sustenta o item 1). O `/test` mede local
   com o Gitleaks 8.30.1 (Docker `zricethezav/gitleaks:v8.30.1` ou binário do release numa pasta temporária
   fora do repositório), em modo `dir` sobre `packages/auth/__tests__/serverErrorLogging.test.ts`. Antes:
   a versão de `HEAD` (`git show HEAD:<arquivo>` gravada na pasta temporária, sem `git stash`) deve dar
   `leaks found: 1` com a regra identificada. Depois: o arquivo do working tree deve dar `no leaks found`. Se nada baixar, 🔒 e a prova fica
   com o job `secrets` da PR, que é a medição que vale para o modo `git`.
2. **Os artefatos da feature não disparam.** Mesmo comando em modo `dir` sobre `docs/features/repo-hygiene-ci/`
   depois desta revisão: esperado `no leaks found`. Repetir no que o `/test` gravar.
3. **`docs/SETUP.md` diz "um único fixture dispara".** Não foi medido em nenhuma etapa. Se o binário
   baixar, rodar `gitleaks dir . --no-banner --redact` (excluindo `node_modules`) e conferir que só a linha
   62 aparecia antes da diretiva. Se aparecer outro achado, a frase do SETUP.md está errada.
4. **`next dev` remove o `AGENTS.md` semeado.** O handoff mediu uma vez (log "Removed agent rules from
   AGENTS.md because `agentRules` is disabled"). Repetir como no handoff: `apps/api/AGENTS.md` só com o bloco
   gerenciado, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` no ambiente (sem ele o processo morre antes do sync),
   `pnpm dev` em `apps/api`, esperar o "Ready", derrubar pelo PID. Esperado: arquivo ausente,
   `git status --porcelain -- AGENTS.md 'apps/*/AGENTS.md'` vazio. Sem browser.
5. **Dependabot:** schema e efeito sobre a PR #69 ficam 🔒 até o merge na `main`. A pergunta sobre
   atualizações de segurança também (ver 🟡).

Nada disso pede browser: o diff não tem superfície de UI.

## Correções aplicadas

| Arquivo | Mudança |
|---------|---------|
| `docs/features/repo-hygiene-ci/analyze/plan.md:68-75` | o literal do `LEAKY_TOKEN` virou `"…"` nas duas linhas do bloco `diff`, com uma frase dizendo que o valor está na linha 62 do teste e por que foi omitido |
| `docs/features/repo-hygiene-ci/develop/handoff.md:35` | a saída do `grep` deixou de copiar a linha inteira; agora descreve a linha 62 com a diretiva no fim |

Nenhum código mudou.

## Raio de impacto

- `@repo/next-config`: as três apps Next (`api`, `app`, `web`) passam a ter `agentRules: false`. Efeito só no
  `next dev`: o Next não cria `AGENTS.md` em `apps/<app>` e apaga o bloco gerenciado de um que já exista. O
  `AGENTS.md` da raiz não é tocado, porque o Next só escreve no diretório da app. Build e runtime não mudam.
- `@repo/auth`: só o arquivo de teste. O valor do fixture é o mesmo, então a asserção de mascaramento não muda.
- Dependabot: deixa de abrir PR de versão maior do `stripe`. Menores e patches seguem no grupo `production`.
- Nenhum DTO, action do SDK, rota, `error.code` ou chave de i18n.

## Lacunas de teste

- Do handoff: "o teste unitário prova o valor da config, não que o Next o respeita". **Continua aberta**, e
  não pede teste novo: o schema estrito do Next reprova chave desconhecida no `next dev`, e o item 4 da lista
  acima cobre o comportamento nesta rodada.
- Nenhuma lacuna nova.

## Decisões em aberto

1. **`agentRules: false` no pacote ou por app.** Decidido pela política (genérico no pacote, menor raio):
   fica no `@repo/next-config`. O repositório já tem a sua convenção de instruções para agente (`AGENTS.md`
   da raiz e `CLAUDE.md` aninhado), e o texto que o Next gera pede ao agente "commit it with your work", o
   contrário do que o fluxo daqui quer. Um fork que queira o `AGENTS.md` gerado numa app sobrescreve no
   `next.config.ts` dela com `{ ...config, agentRules: true }`; na `api` e na `web`, que hoje atribuem
   `config` direto, isso pede trocar a atribuição por um spread. Recomendação: manter. Se quiser, o
   `/spec --sync` pode registrar a sobrescrita em `docs/FORKING.md`, fora desta tarefa.
2. **`ignore` e atualizações de segurança:** 🔒, ver 🟡. Recomendação: manter o `ignore` e conferir a seção
   `ignore` da referência antes de ligar os alertas do `docs/PRE-PRODUCTION.md` §9.
3. **Nome da branch:** `feat/admin-account-forms-and-session-revocation` (válido no regex). Alternativa,
   também válida, se quiser a higiene no nome: `feat/admin-account-session-revocation-and-ci-hygiene`.

## Gates estáticos

| gate | resultado |
|------|-----------|
| `pnpm check` | não remedido (a revisão só mexeu em `.md`); handoff: exit 0, 1153 arquivos |
| typecheck `@repo/next-config` | rodado aqui: exit 0 (o handoff não tinha rodado) |
| typecheck `@repo/auth` | rodado aqui: exit 0 |
| typecheck `app`, `web`, `api` | não remedido; handoff: exit 0 nos três |
| YAML do Dependabot | não remedido; handoff: `ignore` lido com 1 entrada, `updates` com 2 |
| paridade i18n | não se aplica |
| suítes Vitest | não rodadas aqui (são do `/test`); handoff: `next-config` 39 testes, `auth` 201 testes |
| `git diff --cached --stat` | vazio |

## Plano de commits

Plano combinado das seis tarefas, renumerado (35 commits). Os 30 de
`docs/features/auth-revocation-failure/review/review.md` mantêm conteúdo e ordem relativa. Esta tarefa entra
como 2, 3 e 4 (pacotes e CI, antes das apps), 29 (o `docs/SETUP.md`, depois dos outros `docs:`) e 35. Os
commits 16 e 17 usam `git add -p`. Antes do primeiro: `git diff --cached --stat` vazio.

O commit 23 (app) lê `USERS_SESSIONS_NOT_REVOKED` antes do commit 25, que cria a chave. Entre os dois, o teste
`useUserCrudSessionsNotRevoked.test.tsx` não passa e o typecheck do app acusa a chave ausente. É o mesmo padrão
do commit 20 (página do admin) contra o 24 (copy do admin) e se resolve no fim da série.

1. `docs(specs): audit backlog against b7f9124`
   - `specs/BACKLOG.md`, `specs/reference/AUDIT.md`
   - `specs/features/account-security-mfa.md`, `specs/features/admin-own-account.md`,
     `specs/features/app-form-layout-centered.md`, `specs/features/signup-email-verification.md`,
     `specs/features/social-sign-in-providers.md`
   - `specs/reference/research/compliance-trust-baseline.md`, `specs/reference/research/object-storage-costs.md`,
     `specs/reference/research/saas-starter-feature-benchmark.md`
2. `test(auth): mark the fictitious JWT fixture as a gitleaks false positive` (esta tarefa)
   - `packages/auth/__tests__/serverErrorLogging.test.ts`
3. `chore(next-config): stop next dev from writing AGENTS.md into the apps` (esta tarefa)
   - `packages/next-config/index.ts`, `packages/next-config/__tests__/config.test.ts`
4. `ci: ignore major Stripe SDK updates in Dependabot` (esta tarefa)
   - `.github/dependabot.yml`
5. `test(e2e): retry action menu trigger until the row dropdown hydrates`
   - `apps/e2e/tests/focusNotObscured.spec.ts`
6. `feat(app): center the narrow page column`
   - `apps/app/shared/components/ui/pageLayout.ts`, `apps/app/__tests__/pageShell.test.tsx`
7. `feat(app): size full-page forms and account panels to their content`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx`
8. `feat(app): add narrow loading skeletons to the create and edit form pages`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/loading.tsx`
   - `apps/app/__tests__/formLoadingSkeletons.test.tsx`
9. `docs(app): document centered narrow pages and content-height forms`
   - `apps/app/CLAUDE.md`
10. `feat(api): add requireOwnAccountApi guard for the caller's own account`
    - `apps/api/app/(guards)/common-panel.ts`
    - `apps/api/__tests__/ownAccountGuard.test.ts`, `apps/api/__tests__/impersonationReadOnly.test.ts`
11. `feat(api): open the own-account routes to the admin`
    - `apps/api/app/(routes)/account/route.ts`, `apps/api/app/(routes)/account/password/route.ts`,
      `apps/api/app/(routes)/account/password/set/route.ts`
    - `apps/api/__tests__/accountRoute.test.ts`, `apps/api/__tests__/accountPasswordRoute.test.ts`,
      `apps/api/__tests__/accountPasswordSetRoute.test.ts`, `apps/api/__tests__/accountSessionsRoute.test.ts`,
      `apps/api/__tests__/accountExportRoute.test.ts`, `apps/api/__tests__/accountDeletionRoute.test.ts`
12. `feat(api): route personal uploads through the own-account guard`
    - `apps/api/app/(routes)/files/route.ts`, `apps/api/__tests__/fileUploadRoute.test.ts`
13. `fix(api): log the provider code when a session revocation is refused`
    - `apps/api/(shared)/lib/session-revocation.ts`, `apps/api/(shared)/lib/toolkit-error-codes.ts`
    - `apps/api/__tests__/authEmailChangeConfirm.test.ts` (o chamador da troca de e-mail não mudou; só a
      asserção do payload do log, que este helper muda)
    - Leva junto o parâmetro `code` de `sessionsNotRevokedResponse`, com default igual ao anterior; quem o usa
      é o commit 15. Vem antes de 14 e 15 porque os testes deles conferem o código do provedor no log.
14. `fix(api): report a refused session revocation when unlinking the password`
    - `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`
    - `apps/api/__tests__/accountSignInMethodsRoute.test.ts`
15. `fix(api): stop the admin disable and archive from swallowing a refused session revocation`
    - `apps/api/(shared)/lib/account-access.ts`, `apps/api/app/(routes)/users/[id]/route.ts`
    - `apps/api/__tests__/usersAdminAuditTrail.test.ts`, `apps/api/__tests__/usersAdminArchiveAccess.test.ts`,
      `apps/api/__tests__/userMergeArchivedProfile.test.ts`, `apps/api/__tests__/usersAdminDeleteBilling.test.ts`,
      `apps/api/__tests__/googleSignInProfile.test.ts`, `apps/api/__tests__/welcomeNotification.test.ts`
    - B e C ficam juntos porque o `PUT` e o `DELETE` estão no mesmo arquivo de rota e o mock de
      `@repo/auth/server` em `usersAdminAuditTrail.test.ts` serve os dois; separados, o commit do meio deixa
      esse teste vermelho.
16. `fix(app): disable the avatar upload while impersonating`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
      **só o hunk de `disabled={isImpersonating}`**, via `git add -p` (aceitar esse, recusar os outros quatro)
    - `apps/app/__tests__/accountProfileFormAvatarReadOnly.test.tsx`
    - Conferir depois: `git show HEAD -- <AccountProfileForm.tsx>` mostra uma linha adicionada e nenhuma
      removida.
17. `fix(app): unmount the profile menu avatar image when the picture goes away`
    - `apps/app/shared/components/ui/ProfileDropdown.tsx` **só os hunks de `avatarSrc` e do `AvatarImage`
      condicional** (2º e 3º de 4), via `git add -p`; recusar o de `accountPath` e o do `Link`
    - `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx`
    - Conferir depois: `git show HEAD -- <ProfileDropdown.tsx>` mostra 4 linhas adicionadas, 2 removidas, e
      nenhuma menção a `accountPath`.
18. `feat(app): let the account forms hide what the admin area does not offer` (corpo da mensagem:
    "Also drops flex-1 from the three account forms so they size to their content.")
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
      (o arquivo inteiro: depois do commit 16 só restam os hunks desta mudança)
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx`
    - `apps/app/__tests__/accountProfileFormEmail.test.tsx`, `apps/app/__tests__/accountSecurityForm.test.tsx`,
      `apps/app/__tests__/accountPreferencesForm.test.tsx`
19. `feat(app): add the admin section set to the account tabs`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/accountTabRouting.ts`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx`
    - `apps/app/__tests__/accountTabRouting.test.ts`, `apps/app/__tests__/accountTabs.test.tsx`
20. `feat(app): add the admin account page`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/page.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/AdminAccountClient.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/loading.tsx`
    - `apps/app/shared/lib/panelTitles.ts`, `apps/app/__tests__/adminAccountPage.test.tsx`
21. `feat(app): point the admin navigation to the admin account`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/layout.tsx`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/paths.ts`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/routes.tsx`
    - `apps/app/shared/components/ui/Navbar.tsx`, `apps/app/shared/components/ui/ProfileDropdown.tsx` (o arquivo
      inteiro: depois do commit 17 só restam os hunks de `accountPath`)
    - `apps/app/__tests__/profileDropdownAccount.test.tsx`
22. `test(app): harden three tests against a loaded machine`
    - `apps/app/__tests__/tableLoadMore.test.tsx`
    - `apps/app/__tests__/signInEmailLinkEntry.test.tsx`
    - `apps/app/__tests__/auditFiltersDateInput.test.tsx`
23. `fix(app): keep the user disabled in the list when only the session revocation failed`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud.tsx`
    - `apps/app/__tests__/useUserCrudSessionsNotRevoked.test.tsx`
24. `feat(internationalization): add the admin account copy`
    - `packages/internationalization/translations/apps/app/pages/admin/account.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/index.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/routes/index.ts`
25. `fix(internationalization): add the USERS_SESSIONS_NOT_REVOKED message`
    - `packages/internationalization/translations/packages/shared/utils.ts`
26. `docs(api): list requireOwnAccountApi among the guards`
    - `apps/api/CLAUDE.md`
27. `docs: document the own-account guard in the auth panel and review checklist`
    - `docs/AUTH-PANEL.md`, `docs/review-checklist.md`
28. `docs: describe how a refused session revocation is reported`
    - `docs/SECURITY.md`, `docs/INCIDENT-RESPONSE.md`, `docs/BACKUP.md`, `docs/SUBPROCESSORS.md`
29. `docs: describe the inline gitleaks allow for test fixtures` (esta tarefa)
    - `docs/SETUP.md`
30. `docs(features): app-form-layout-centered`
    - `docs/features/app-form-layout-centered/` (os `.md`; os screenshots são ignorados)
31. `docs(features): admin-own-account`
    - `docs/features/admin-own-account/`
32. `docs(features): app-test-suite-stability`
    - `docs/features/app-test-suite-stability/`
33. `docs(features): account-avatar-polish`
    - `docs/features/account-avatar-polish/`
34. `docs(features): auth-revocation-failure`
    - `docs/features/auth-revocation-failure/`
35. `docs(features): repo-hygiene-ci` (esta tarefa)
    - `docs/features/repo-hygiene-ci/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Corpos sugeridos para os commits desta tarefa:

- 2: "The token is fictitious and the test needs its exact value to prove it is masked in the log. The
  inline allow travels with the line through rebase and squash, which a .gitleaksignore fingerprint does not."
- 3: "next dev creates AGENTS.md in each app when it detects a coding agent, and removes the managed block
  from an existing one when the option is off. The repository keeps its agent instructions at the root."
- 4: "A major of the Stripe SDK pins a new API version and needs a manual migration. Minor and patch
  updates stay in the production group."

Os corpos dos commits 13, 14, 15 e 23 são os do plano de `auth-revocation-failure` (lá numerados 10, 11, 12
e 20).

Varredura de segredo em `docs/features/repo-hygiene-ci/`: depois da correção, nenhum token, senha, chave ou
e-mail (grep por `eyJ`, `senha`, `password`, `sk_`, `whsec_`, `AIza` e endereço de e-mail sem acerto). Repetir
no que o `/test` gravar antes do commit 35.

Título de PR sugerido: `feat: admin own account area, centered form pages, session revocation errors and CI hygiene`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin <branch resolvida>` (proposta: `feat/admin-account-forms-and-session-revocation`).

### Commits realizados

(preenchido pelo orquestrador)
