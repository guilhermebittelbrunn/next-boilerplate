# Revisão: avatar da conta sob personificação

Rodada autônoma do `/cycle`. Nada commitado, nenhuma branch criada ou renomeada.

Duas passadas. A primeira revisou a linha do upload e os dois testes. A segunda voltou do `/test`, que achou
um defeito de produção no `ProfileDropdown` (seção "Rodada 2" abaixo), e corrigiu ele aqui.

O escopo da primeira passada era uma linha e dois testes novos:

- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx:117`
  (`disabled={isImpersonating}` no `HookFormImageUpload`), hunk 3 de 5 do arquivo;
- `apps/app/__tests__/accountProfileFormAvatarReadOnly.test.tsx`;
- `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx`.

Os outros quatro hunks do `AccountProfileForm.tsx` são de `admin-own-account` e `app-form-layout-centered`, já
revisados nas respectivas `review/review.md`. O resto do working tree (as outras três tarefas e `specs/`)
ficou fora desta revisão.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. Reprova no regex do nome: o prefixo não é
  projeto e falta o `type`. Não tem commit à frente de `origin/main` nem upstream.
- Proposta: `feat/admin-account-and-centered-forms`, a mesma do plano combinado. Passa no regex. Esta tarefa
  acrescenta um `fix(app)` e um `docs(features)` a uma PR que já mexe no mesmo formulário, e o nome continua
  descrevendo o que a PR entrega.
- Caminho da regra: `git branch -m feat/admin-account-and-centered-forms`, executado pelo `/review` antes do
  primeiro commit. Não renomeei, por instrução do `/cycle`.

## Rodada 2: `<img src="">` no menu de perfil

### 🔴 Bloqueante (corrigido)

- `apps/app/shared/components/ui/ProfileDropdown.tsx:44,53`: o menu passava `account?.avatarUrl ??
  user?.photoURL ?? ""` ao `AvatarImage`. O Radix Avatar 1.3.1 guarda o status da imagem no contexto do
  `Avatar` e só o atualiza num `useLayoutEffect` (`useImageLoadingStatus`). Quando a URL passa de uma imagem
  já carregada para `""`, a renderização seguinte ainda lê `loaded` e o `AvatarImage` monta `<img src="">`.
  Só no efeito o status vira `error` e o `<img>` sai. No `next dev` o React avisa; em produção sobra um commit
  a mais com o atributo `src` removido. Stack medido pelo `/test`: `avatar.tsx:32` ← `ProfileDropdown.tsx:53`
  ← `Navbar.tsx:33` ← `admin/layout.tsx:52`.

### O que a leitura anterior errou

O `/analyze` (§1.2 do plano) descartou o `ProfileDropdown` como origem lendo só o caminho da primeira
renderização: com `src` vazio, `useImageLoadingStatus` marca `error` e o `<img>` nunca aparece. Isso vale
quando o componente nasce sem imagem. Não vale quando a imagem **deixa de existir** depois de carregada,
porque o status `loaded` do contexto sobrevive até o efeito rodar. A primeira passada desta revisão aceitou
o descarte e o teste `profileDropdownAvatarEmpty.test.tsx` como prova. O teste só renderizava uma conta sem
avatar desde o início, e o jsdom nunca carrega imagem, então ele passava sem exercitar o cenário real.

### Correção aplicada

`ProfileDropdown.tsx` passa a montar o `AvatarImage` só quando há URL, e trata string vazia como ausência:

```diff
-    const avatarSrc = account?.avatarUrl ?? user?.photoURL ?? "";
+    const avatarSrc = account?.avatarUrl || user?.photoURL || null;
...
-                        <AvatarImage alt="" src={avatarSrc} />
+                        {avatarSrc ? (
+                            <AvatarImage alt="" src={avatarSrc} />
+                        ) : null}
```

Quando a URL some, o `AvatarImage` desmonta em vez de renderizar de novo. O cleanup do efeito do Radix põe o
status em `idle` ainda na fase de layout, e o `AvatarFallback` aparece antes da pintura. Nenhum `<img>` com
`src` vazio ou ausente chega ao DOM.

A troca de `??` por `||` muda um caso: `avatarUrl: ""` agora cai para o `photoURL` do Firebase em vez de
bloquear. String vazia é ausência, como já vale para variável de ambiente no repo.

**Alternativa medida e descartada: `?? undefined`.** Com o mesmo teste, o código com `undefined` também
reprova: o `<img>` continua montado no commit intermediário, agora sem o atributo `src` (o React não avisa,
mas o `MutationObserver` registra a remoção do atributo). Só a montagem condicional elimina o commit.

**Correção na raiz, no `avatar.tsx` do design system: não aplicada.** Os outros call sites do `AvatarImage`
(`Sidebar.tsx:150`, `(unauthenticated)/layout.tsx:24`, `apps/web/.../header/index.tsx:214`) passam
`brand.logoUrl ?? undefined`, um valor fixo por build que não vai de "carregado" para vazio em tempo de
execução, e o `playground` usa uma constante. O defeito só existe onde a URL muda com a sessão. Mexer no
wrapper atingiria `app` e `web` para proteger um único call site; fica registrado como sugestão abaixo.

### Prova

`apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx` ganhou um terceiro caso. Ele troca `window.Image`
por uma classe com `complete = true` e `naturalWidth = 1`, para o Radix marcar `loaded` na hora; renderiza o
menu com `avatarUrl` preenchido e confere o `<img>` com a URL; observa o atributo `src` com um
`MutationObserver`; troca a conta para `avatarUrl: null` e faz `rerender`. Espera nenhuma mutação de `src`,
nenhum `<img>`, as iniciais "An" e nenhum aviso de `src` vazio.

| Código do `ProfileDropdown` | Resultado do caso novo |
|-----------------------------|------------------------|
| original (`?? ""`), só com a checagem do aviso | reprova: `console.error` recebe `An empty string ("") was passed to the %s attribute` |
| original (`?? ""`), com a checagem de mutação | reprova: 1 `MutationRecord` de `src` |
| `?? undefined` | reprova: 1 `MutationRecord` de `src` |
| montagem condicional (aplicada) | passa |

Depois da correção voltei o arquivo original por um momento e rodei o teste final de novo: reprovou
(`1 failed | 2 passed`). Com a correção de volta, `3 passed`.

### 🟢 Sugestão / nit

- `packages/design-system/components/ui/avatar.tsx:27-38`: o wrapper `AvatarImage` poderia devolver `null`
  sem `src`, o que protegeria qualquer call site futuro com URL dinâmica. Fica fora desta tarefa (raio de
  impacto em `app` e `web`, um único caso real hoje).

## Revisão: upload de avatar em modo só leitura (rodada 1)

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

Nenhum.

### ✅ OK

- `AccountProfileForm.tsx:117`: a prop chega ao controle. `HookFormImageUpload` repassa
  `formState.isSubmitting || rest.disabled` (`packages/design-system/components/form/hookform/hookformImageUpload.tsx:56-58`)
  e `ImageUploadInput` aplica `disabled` no `<input type="file">` (`image-upload-input.tsx:160`), no botão
  de escolher/trocar (`:186`) e no de remover (`:200`). Os três controles que o plano pedia ficam travados.
- O `isImpersonating` usado é o mesmo que já trava o Salvar (`AccountProfileForm.tsx:145`) e o botão de trocar
  e-mail (`:170`). Não há segunda fonte para o estado de só leitura.
- A API continua sendo a proteção real: o `POST /files` sob personificação já é recusado pelo guard da rota.
  A linha nova só alinha a UI a isso (regra de ouro 4).
- Área admin: `isImpersonatingSnapshot` (`apps/app/shared/lib/panelState.ts:99-105`) só devolve `true` com
  `panelRequestRole === COMMON` e um alvo. Em `/admin/account` o upload segue habilitado. Confirmado por
  leitura.
- Mudança mínima: sem chave de i18n nova, sem mudança de contrato, `ProfileDropdown.tsx` intocado por esta
  tarefa.
- Testes (§6): em `apps/app/__tests__/`, imports explícitos de `vitest`, `vi.hoisted` + `vi.mock` antes do
  `await import`, sem `toBeInTheDocument`, textos lidos do dicionário real (`avatarUpload.choose`, `replace`,
  `remove`). Cobrem os dois estados (com e sem avatar) nos dois lados (personificando e não). Nível mais
  barato que prova o comportamento: jsdom, sem emulador.
- `profileDropdownAvatarEmpty.test.tsx`: o caso de controle (`<img src="">` cru) garante que o filtro de
  `console.error` reconhece o aviso. O `biome-ignore` da linha 64 tem motivo escrito e é o único jeito de
  provocar o aviso. (Na rodada 1 tratei o segundo caso como prova de que o menu não gera o aviso. Não era:
  ver "Rodada 2".)
- Comentários: nenhum cita artefato do fluxo.
- Dados de teste usam `ana@example.com`, domínio reservado. Nada de pessoa real.

### 👁 Verificar no `/test`

Itens da rodada 2, para reconferir primeiro:

1. **Repro A do `/test`.** Admin com avatar salvo em `/pt-br/admin/account`, seletor "Ambiente" > "Painel do
   usuário" com alvo sem avatar. Esperado no `next dev`: nenhum aviso `An empty string ("") was passed to the
   src attribute`; o menu mostra as iniciais do alvo.
2. **Repro B do `/test`.** Admin em `/admin/account` sem personificação, "Remover imagem" > "Salvar". Esperado:
   nenhum aviso depois do `PUT /account` 200, menu com as iniciais. Repetir com `next build && next start` e
   o `MutationObserver` no `<img>` do menu: o elemento sai do DOM sem mutação de `src` antes.
3. **Caminho inverso.** No mesmo usuário, subir um avatar de novo e salvar: o menu troca as iniciais pela
   imagem sem recarregar a página.

Itens da rodada 1 que o `/test` já mediu (upload travado sob personificação, com e sem avatar; upload
funcionando fora dela; estado desabilitado em light/dark, desktop/mobile, 3 idiomas) não mudaram com esta
correção. O `AccountProfileForm.tsx` não foi tocado na rodada 2.

## Correções aplicadas

- Rodada 1: nenhuma.
- Rodada 2: `apps/app/shared/components/ui/ProfileDropdown.tsx:44,53` (montagem condicional do `AvatarImage`,
  string vazia como ausência) e `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx` (caso novo com
  imagem carregada que some). Detalhe em "Rodada 2".

## Raio de impacto

Nenhum contrato muda. `HookFormImageUpload` já aceitava `disabled`; a mudança é de quem o consome, num único
call site. `AccountProfileForm` é usado em `/account` e, pelo diff de `admin-own-account`, em
`/admin/account` via `AccountTabs area="admin"`; nos dois, `isImpersonating` vem de `useAuthRequestPanel`.

A correção da rodada 2 fica dentro do `ProfileDropdown`, usado pelo `Navbar` nos dois painéis. Nenhuma prop
nova; o design system não muda.

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---------------------|----------|
| Nenhum teste renderiza `AccountTabs area="admin"` com o formulário de perfil; o caso admin é coberto de forma indireta (`panelState.test.ts` + o caso `false` do teste novo) | Continua aberta. Aceitável: o valor de `isImpersonating` no admin está provado em `panelState.test.ts`, e o formulário só lê esse valor. O item 4 do `/test` cobre o caminho real |
| Clique no `<label>` do input sob personificação não testado em jsdom | Fechada pelo `/test` na rodada 1 (medido no navegador) |
| Menu de perfil quando a imagem carregada deixa de existir (apontada pelo `/test`) | Fechada aqui: caso novo em `profileDropdownAvatarEmpty.test.tsx`, que reprova sem a correção |

## Decisões em aberto

Nenhuma desta tarefa. A ordem do commit tem uma recomendação (abaixo), mas as duas ordens funcionam.

## Gates

Rodada 2, medidos depois da correção, sem `--force`:

| Gate | Resultado |
|------|-----------|
| `pnpm exec vitest run __tests__/profileDropdownAvatarEmpty.test.tsx __tests__/profileDropdownAccount.test.tsx` | 13 testes passando |
| `pnpm --filter app test` | 151 arquivos, 1367 testes passando |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm check` | 1150 arquivos, nenhum ajuste (a primeira rodada acusou `noUselessUndefined` e aspas no teste novo; corrigido) |
| Paridade de i18n | não se aplica, sem chave nova |

## Ordem do hunk no plano combinado

Conferi o isolamento do hunk aplicando-o sozinho sobre `HEAD:AccountProfileForm.tsx` com `patch --dry-run`
numa cópia fora do repo. Aplica limpo: o contexto (linhas 110-118 de `HEAD`) é o mesmo nos dois lados e
nenhum outro hunk encosta nele. O que resta depois é exatamente a diferença das outras duas tarefas. Os dois
testes também funcionam contra o código de `HEAD`: o de perfil não passa `allowEmailChange` (a prop é
opcional) e mocka o diálogo de e-mail; o do menu renderiza `<ProfileDropdown />` sem `accountPath`, e o
`HEAD` já usa `useMyAccount` e `useAuth` como o teste mocka.

As duas ordens aplicam. O risco está no commit "let the account forms hide..." do `admin-own-account`, que
lista o arquivo inteiro: se ele rodar primeiro com `git add <arquivo>`, a linha 117 vai junto em silêncio. Por
isso a recomendação é este `fix(app)` entrar **antes** desse commit:

- o `fix(app)` usa `git add -p` no arquivo e aceita só o hunk com `disabled={isImpersonating}` (o terceiro
  dos cinco, `@@ -110,6 +114,7 @@`);
- o commit seguinte volta a usar `git add` no arquivo inteiro, como está no plano dele, porque a linha já
  saiu do working tree.

Na ordem inversa, aquele commit teria de usar `git add -p` e recusar o hunk 3. Funciona, mas desloca o passo
delicado para um commit de outra tarefa, cuja instrução manda adicionar o arquivo inteiro.

O `ProfileDropdown.tsx` tem o mesmo problema. No `git diff` contra `HEAD` ele tem quatro hunks: o 1º
(`@@ -23,7 +23,13 @@`, prop `accountPath`) e o 4º (`@@ -62,7 +70,7 @@`, link da conta) são de
`admin-own-account`; o 2º (`@@ -35,7 +41,7 @@`, `avatarSrc`) e o 3º (`@@ -44,7 +50,9 @@`, montagem condicional)
são desta correção. Apliquei só o 2º e o 3º sobre `HEAD:ProfileDropdown.tsx` numa cópia fora do repo: aplicam
limpo, e o que sobra é exatamente o 1º e o 4º. O teste novo renderiza `<ProfileDropdown />` sem
`accountPath`, então funciona com o arquivo de `HEAD`. Mesma regra: o `fix(app)` do menu entra antes do
commit "point the admin navigation...", que adiciona o arquivo inteiro.

## Plano de commits

Plano combinado das quatro tarefas, renumerado (23 commits). Os 20 commits de
`app-test-suite-stability/review/review.md` mantêm o conteúdo e a ordem; esta tarefa entra como os commits 10,
11 e 23. A correção do menu ficou num `fix(app)` próprio porque é outro componente e outro defeito. Antes do primeiro:
`git diff --cached --stat` vazio (conferido nesta revisão: vazio).

1. `docs(specs): audit backlog against b7f9124`
   - `specs/BACKLOG.md`, `specs/reference/AUDIT.md`
   - `specs/features/account-security-mfa.md`, `specs/features/admin-own-account.md`,
     `specs/features/app-form-layout-centered.md`, `specs/features/signup-email-verification.md`,
     `specs/features/social-sign-in-providers.md`
   - `specs/reference/research/compliance-trust-baseline.md`, `specs/reference/research/object-storage-costs.md`,
     `specs/reference/research/saas-starter-feature-benchmark.md`
2. `test(e2e): retry action menu trigger until the row dropdown hydrates`
   - `apps/e2e/tests/focusNotObscured.spec.ts`
3. `feat(app): center the narrow page column`
   - `apps/app/shared/components/ui/pageLayout.ts`, `apps/app/__tests__/pageShell.test.tsx`
4. `feat(app): size full-page forms and account panels to their content`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx`
5. `feat(app): add narrow loading skeletons to the create and edit form pages`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/loading.tsx`
   - `apps/app/__tests__/formLoadingSkeletons.test.tsx`
6. `docs(app): document centered narrow pages and content-height forms`
   - `apps/app/CLAUDE.md`
7. `feat(api): add requireOwnAccountApi guard for the caller's own account`
   - `apps/api/app/(guards)/common-panel.ts`
   - `apps/api/__tests__/ownAccountGuard.test.ts`, `apps/api/__tests__/impersonationReadOnly.test.ts`
8. `feat(api): open the own-account routes to the admin`
   - `apps/api/app/(routes)/account/route.ts`, `apps/api/app/(routes)/account/password/route.ts`,
     `apps/api/app/(routes)/account/password/set/route.ts`
   - `apps/api/__tests__/accountRoute.test.ts`, `apps/api/__tests__/accountPasswordRoute.test.ts`,
     `apps/api/__tests__/accountPasswordSetRoute.test.ts`, `apps/api/__tests__/accountSessionsRoute.test.ts`,
     `apps/api/__tests__/accountExportRoute.test.ts`, `apps/api/__tests__/accountDeletionRoute.test.ts`
9. `feat(api): route personal uploads through the own-account guard`
   - `apps/api/app/(routes)/files/route.ts`, `apps/api/__tests__/fileUploadRoute.test.ts`
10. `fix(app): disable the avatar upload while impersonating` (esta tarefa)
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
      **só o hunk de `disabled={isImpersonating}`**, via `git add -p` (aceitar esse, recusar os outros quatro)
    - `apps/app/__tests__/accountProfileFormAvatarReadOnly.test.tsx`
    - Conferir depois: `git show HEAD -- <AccountProfileForm.tsx>` mostra uma linha adicionada e nenhuma
      removida.
11. `fix(app): unmount the profile menu avatar image when the picture goes away` (esta tarefa)
    - `apps/app/shared/components/ui/ProfileDropdown.tsx` **só os hunks de `avatarSrc` e do `AvatarImage`
      condicional** (2º e 3º de 4), via `git add -p`; recusar o de `accountPath` e o do `Link`
    - `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx`
    - Conferir depois: `git show HEAD -- <ProfileDropdown.tsx>` mostra 4 linhas adicionadas, 2 removidas, e
      nenhuma menção a `accountPath`.
12. `feat(app): let the account forms hide what the admin area does not offer` (corpo da mensagem:
    "Also drops flex-1 from the three account forms so they size to their content.")
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
      (o arquivo inteiro: depois do commit 10 só restam os hunks desta mudança)
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx`
    - `apps/app/__tests__/accountProfileFormEmail.test.tsx`, `apps/app/__tests__/accountSecurityForm.test.tsx`,
      `apps/app/__tests__/accountPreferencesForm.test.tsx`
13. `feat(app): add the admin section set to the account tabs`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/accountTabRouting.ts`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx`
    - `apps/app/__tests__/accountTabRouting.test.ts`, `apps/app/__tests__/accountTabs.test.tsx`
14. `feat(app): add the admin account page`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/page.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/AdminAccountClient.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/loading.tsx`
    - `apps/app/shared/lib/panelTitles.ts`, `apps/app/__tests__/adminAccountPage.test.tsx`
15. `feat(app): point the admin navigation to the admin account`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/layout.tsx`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/paths.ts`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/routes.tsx`
    - `apps/app/shared/components/ui/Navbar.tsx`, `apps/app/shared/components/ui/ProfileDropdown.tsx` (o arquivo
      inteiro: depois do commit 11 só restam os hunks de `accountPath`)
    - `apps/app/__tests__/profileDropdownAccount.test.tsx`
16. `test(app): harden three tests against a loaded machine`
    - `apps/app/__tests__/tableLoadMore.test.tsx`
    - `apps/app/__tests__/signInEmailLinkEntry.test.tsx`
    - `apps/app/__tests__/auditFiltersDateInput.test.tsx`
17. `feat(internationalization): add the admin account copy`
    - `packages/internationalization/translations/apps/app/pages/admin/account.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/index.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/routes/index.ts`
18. `docs(api): list requireOwnAccountApi among the guards`
    - `apps/api/CLAUDE.md`
19. `docs: document the own-account guard in the auth panel and review checklist`
    - `docs/AUTH-PANEL.md`, `docs/review-checklist.md`
20. `docs(features): app-form-layout-centered`
    - `docs/features/app-form-layout-centered/` (os `.md`; os screenshots são ignorados)
21. `docs(features): admin-own-account`
    - `docs/features/admin-own-account/`
22. `docs(features): app-test-suite-stability`
    - `docs/features/app-test-suite-stability/`
23. `docs(features): account-avatar-polish`
    - `docs/features/account-avatar-polish/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Corpo sugerido para o commit 10: "The impersonation view is read-only, but the avatar picker still let the
admin start an upload that the API then refused. Disable it with the save button."

Corpo sugerido para o commit 11: "Radix Avatar keeps the loaded status in context until a layout effect runs,
so switching from a loaded picture to an empty src rendered an img with an empty src for one commit. Mount the image only
when there is a URL, and treat an empty string as no picture."

Varredura de segredo em `docs/features/account-avatar-polish/`: nenhuma senha, token, chave ou e-mail de
pessoa real. Repetir no que o `/test` gravar antes do commit 23.

Título de PR sugerido: `feat: admin own account area and centered form pages`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin feat/admin-account-and-centered-forms`.

### Commits realizados

(preenchido pelo orquestrador)
