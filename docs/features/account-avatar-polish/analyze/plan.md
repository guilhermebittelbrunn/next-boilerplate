# Plano — account-avatar-polish

> Tarefa direta, sem spec (`spec: -`). Origem: dois achados 🟢 de `specs/reference/AUDIT.md`, seção "Achados do
> `/test` de `admin-own-account`" (linhas 1868 e 1869 no disco em 2026-11-26), e as observações do
> `docs/features/admin-own-account/test/report.md:166-173`.
> Rodada autônoma do `/cycle`: as decisões abaixo foram tomadas sem consulta e estão registradas em
> "Decisões tomadas sem perguntar".

## Etapa 1 — Análise

### 1. Contexto, objetivo e corte

Dois ruídos na tela de conta (`/account`), os dois anteriores à branch de `admin-own-account`:

1. **"Escolher imagem" habilitado sob personificação.** Quando o admin personifica um usuário comum, o painel
   fica só leitura: o Salvar do Perfil recebe `disabled={isImpersonating || isUploading}`
   (`AccountProfileForm.tsx:144`), mas o `HookFormImageUpload` (`:116-124`) não recebe `disabled`. O admin
   escolhe um arquivo e a API recusa o `POST /files` com `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` (medido no
   `/test` de `admin-own-account`). Não há brecha, só incoerência de UI: o controle promete uma ação que a API
   nega.
2. **Aviso `An empty string ("") was passed to the src attribute` no console do `next dev`**, três vezes, na
   conta personificada sem avatar (`admin-own-account/test/report.md:172`). O candidato do AUDIT
   (`ProfileDropdown.tsx:44`) foi descartado por leitura e por medição (ver §1.2).

Objetivo: o controle de avatar fica desabilitado em modo só leitura, igual ao Salvar, e a origem do aviso de
`src=""` fica identificada (e corrigida, se estiver no código do repo).

**Corte de MVP**

- Item 1: passar `disabled={isImpersonating}` ao `HookFormImageUpload` da conta comum, com teste de componente.
- Item 2: não mexer no `ProfileDropdown`. Acrescentar um teste de guarda que prova que o avatar sem imagem não
  gera o aviso, e encomendar ao `/test` a captura do component stack do aviso para localizar a origem real.

**Fora de escopo**

- Mudar o `ImageUploadInput` ou o `HookFormImageUpload` do design system: os dois já aceitam e propagam
  `disabled` (ver §1.1).
- Explicar o motivo da desabilitação (tooltip ou texto). O aviso de só leitura do painel já cobre isso
  (`impersonationReadOnlyNotice.test.tsx` existe), e nenhum outro controle desabilitado da conta tem texto
  próprio.
- Revisar outros controles da conta sob personificação. Os demais já leem `isImpersonating`
  (`AccountPreferencesForm.tsx:138`, `AccountSessionsPanel.tsx:99,139`, `AccountSignInMethodsPanel.tsx:53`,
  `AccountSecurityForm.tsx:47`).

### 1.1 Item 1: causa confirmada

- `AccountProfileForm.tsx:40` já lê `isImpersonating` de `useAuthRequestPanel()`.
- `AccountProfileForm.tsx:116-124` renderiza `HookFormImageUpload` sem `disabled`.
- `packages/design-system/components/form/hookform/hookformImageUpload.tsx:17-20` herda `disabled` de
  `ImageUploadInputProps` (só omite `error`, `onChange`, `value`) e repassa em `:56-58`
  (`disabled={formState.isSubmitting || rest.disabled}`).
- `packages/design-system/components/ui/image-upload-input.tsx:35` declara `disabled?: boolean`; ele desabilita
  o `<input type="file">` oculto (`:160`), o botão de escolher/substituir (`:186`) e o botão de remover
  (`:200`).

Conclusão: o componente compartilhado já resolve. A falta está só no call site do app, que é o único uso de
`HookFormImageUpload` no repo. A regra "corrigir na raiz" não se aplica, porque a raiz não tem defeito.

Efeito colateral desejado: com o avatar preenchido, o botão "Remover" também fica desabilitado. Hoje ele está
habilitado sob personificação e só limpa o campo localmente, já que o Salvar está travado.

### 1.2 Item 2: candidato descartado, origem não localizada por leitura

**`ProfileDropdown` não é a origem.**

- `ProfileDropdown.tsx:44` passa `account?.avatarUrl ?? user?.photoURL ?? ""` a `AvatarImage` (`:53`).
- `AvatarImage` (`packages/design-system/components/ui/avatar.tsx:27-38`) envolve
  `AvatarPrimitive.Image` do `radix-ui@1.8.1`, que resolve para `@radix-ui/react-avatar@1.3.1`.
- Nesse pacote (`dist/index.mjs`), `useImageLoadingStatus` marca `Error` quando `!src` e o componente só
  renderiza `<img>` com status `Loaded`; caso contrário retorna `null`. Nenhum elemento `<img src="">` chega ao
  React.
- Medição (script Node com `react-dom/server` do workspace, `NODE_ENV=development`): `Avatar.Root` com
  `Avatar.Image src=""` gera `<span><span>AB</span></span>` e nenhum `console.error`; um `<img src="">` cru, no
  mesmo script, emite o aviso uma vez. No cliente, o caminho é o mesmo `return null`.

**Outros pontos que renderizam imagem na conta, todos protegidos:**

- `ResponsiveImage` (`packages/design-system/components/ui/responsive-image.tsx:35`) retorna fragmento vazio
  quando `!src`.
- `ImageUploadInput` só monta a prévia com `previewUrl` preenchido (`image-upload-input.tsx:82,168`).
- `Sidebar.tsx:152` passa `brand.logoUrl ?? undefined` a `AvatarImage` (mesma proteção do Radix).
- A busca por `<img`, `next/script`, `<iframe`, `<video`, `<source>` e `<audio` em `apps/app` e `packages/*`
  (fora `email` e testes) não acha outro elemento com `src`.

Conclusão: nenhum código do repo renderizado em `/account` produz `src=""` lendo o código. As hipóteses que
sobram estão fora do repo (overlay/devtools do `next dev` 16.4.6, extensão ou a própria automação do
`agent-browser`), ou num componente de terceiro que a busca por texto não alcança. Isso só se fecha com o
component stack que o React 19 imprime junto do aviso, e por isso a captura vai para o `/test`.

### 1.3 Área de conta do admin (`/admin/account`)

Não é afetada pelo item 1. `AdminAccountClient.tsx` renderiza `AccountTabs` com `area="admin"`, que usa o
mesmo `AccountProfileForm`. Mas `isImpersonatingSnapshot` (`apps/app/shared/lib/panelState.ts:99-105`) só é
verdadeiro com `panelRequestRole === COMMON` e `impersonatedFirebaseUid !== null`. No painel admin o papel da
requisição é admin, então `isImpersonating` é `false` e o upload segue habilitado ali, como deve ser. O teste
do item 1 cobre o caso `false`.

Quanto ao item 2, a área admin usa o mesmo `ProfileDropdown` via `Navbar` (`Navbar.tsx:33`), já descartado.

### 2. Apps impactados e modo de produto

| Área | Impacto |
|------|---------|
| `apps/app` | `AccountProfileForm.tsx` (1 prop) + 2 testes novos |
| `apps/api` | N/A (o 403 já existe) |
| `apps/web` | N/A |
| `packages/*` | N/A |

Painel comum (personificado). Independe de `subscription` × `simple` e de plano. Só faz diferença com storage
habilitado (`isStorageEnabled()`, `AccountProfileForm.tsx:44,115`); sem storage o campo é o `HookFormInput`
de URL, que já trava no Salvar.

### 3-4. Dados, SDK, API

N/A. Nenhum campo, contrato, rota ou `error.code` novo. A API já recusa com
`403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`.

### 5. Front

Uma prop no call site. Sem rota, hook, query key ou i18n novos.

### 5.4 i18n

N/A. Nenhuma chave nova.

### 6. Autorização e segurança

A proteção real continua na API (guard de só leitura). A mudança só alinha a UI. Sob personificação:
escolher imagem, substituir e remover ficam desabilitados; o admin fora da personificação não perde nada.

### 7. Testes (nível mais barato que prova)

| Teste | Nível | Prova |
|-------|-------|-------|
| `apps/app/__tests__/accountProfileFormAvatarReadOnly.test.tsx` | componente (jsdom), mocks de `useAuthRequestPanel`, `isStorageEnabled: () => true`, `useFileUpload`, `useAccountMutations` | com `isImpersonating: true`, o botão `avatarUpload.choose` e o `<input type="file">` estão `disabled`; com avatar preenchido, `avatarUpload.replace` e `avatarUpload.remove` também; com `isImpersonating: false`, todos habilitados |
| `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx` | componente (jsdom), mocks de `useAuth`/`useMyAccount` como em `profileDropdownAccount.test.tsx` | conta e usuário Firebase sem foto: renderiza as iniciais, não existe `img` no DOM e `console.error` não recebe o aviso de string vazia em `src` |

O segundo teste é a guarda do descarte: se alguém trocar o `AvatarImage` por um `<img>` cru, ele quebra.
Nenhum teste precisa de emulador ou app de pé.

Modelo para os mocks do primeiro: `apps/app/__tests__/accountProfileFormEmail.test.tsx:1-50` (que hoje usa
`isStorageEnabled: () => false`). Arquivo novo em vez de estender aquele, porque aquele pertence à tarefa
`admin-own-account`, ainda não commitada.

### 8. O que o `/test` vai percorrer

Superfície de runtime: um controle desabilitado num formulário existente. Passada curta.

1. Admin personificando um usuário comum **sem avatar**, storage no emulador: em `/account` (aba Perfil),
   "Escolher imagem" desabilitado; clicar não abre o seletor; nenhum `POST /files` sai. Salvar continua
   desabilitado.
2. Mesmo fluxo com um usuário **com avatar**: "Substituir" e "Remover" desabilitados.
3. Admin em `/admin/account`: "Escolher imagem" habilitado (sem regressão).
4. Usuário comum sem personificação em `/account`: habilitado (sem regressão).
5. **Item 2**: com o console aberto no fluxo 1, reproduzir o aviso de `src=""` e registrar o component stack
   completo que o React imprime junto. Classificar a origem: componente do repo (aponta arquivo e linha),
   terceiro ou ferramenta de dev. Repetir com `next build && next start` para ver se o aviso existe fora do
   dev.
6. Light e dark num viewport desktop e um mobile, pt-br (o estado desabilitado usa o estilo padrão do
   `Button`; nenhuma chave nova justifica percorrer os 3 idiomas além de uma checagem rápida em en/es).

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Upload de avatar desabilitado sob personificação**
  Com o admin personificando um usuário comum e o storage habilitado, o botão "Escolher imagem" da aba Perfil
  em `/account` aparece desabilitado e o `<input type="file">` oculto também. Clicar no botão ou no rótulo não
  abre o seletor de arquivos e nenhuma requisição `POST /files` sai do navegador. O Salvar segue desabilitado,
  como antes.

- [ ] **Substituir e remover desabilitados sob personificação**
  Quando o usuário personificado já tem avatar, os botões "Substituir" e "Remover" ficam desabilitados. Antes da
  mudança, "Remover" limpava o campo localmente sem poder salvar; agora o valor não muda. A prévia da imagem
  continua visível.

- [ ] **Sem regressão fora da personificação**
  O usuário comum em `/account` e o admin em `/admin/account` continuam escolhendo, substituindo e removendo o
  avatar normalmente. No admin, `isImpersonating` é `false` porque o papel da requisição é admin, então o
  controle fica habilitado. O upload com arquivo grande ou de tipo inválido continua mostrando os erros de
  sempre.

- [ ] **Storage desabilitado não muda**
  Sem storage (`isStorageEnabled()` falso), o campo de avatar é o input de URL e o comportamento é o anterior:
  editável, com o Salvar travado sob personificação. Esta tarefa não altera esse caminho.

- [ ] **API continua sendo a barreira**
  Uma chamada forçada a `POST /files` sob personificação (fora da UI) continua recebendo
  `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`. A mudança é só de UI e não substitui o guard.

- [ ] **Avatar vazio no menu de perfil não gera `src=""`**
  Com conta e usuário Firebase sem foto, o menu de perfil mostra as iniciais e não monta nenhum `<img>`. O
  console não registra "An empty string ("") was passed to the src attribute" a partir do `ProfileDropdown`; o
  teste de componente prova isso em jsdom.

- [ ] **Origem do aviso de `src=""` registrada**
  O `/test` reproduz o aviso na conta personificada sem avatar e registra o component stack. Se apontar para
  código do repo, a correção entra nesta tarefa (não renderizar o elemento ou passar `undefined`); se apontar
  para ferramenta de dev ou terceiro, o achado fecha como "não procede no código" com o stack como evidência.
  Também registra se o aviso aparece no build de produção.

- [ ] **Tema e responsivo**
  O botão desabilitado fica legível e visivelmente inativo em light e dark, no desktop e no mobile, com o
  estilo padrão de `Button` desabilitado do design system.

## Etapa 2 — Blueprint técnico

### Pseudo-diff

```diff
// apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx
                                 {canUploadAvatar ? (
                                     <HookFormImageUpload
+                                        disabled={isImpersonating}
                                         label={
                                             accountProfile.avatarUpload.label
                                         }
```

Ordem das props: alfabética, como o Biome/Ultracite exige no resto do arquivo (`disabled` antes de `label`).

Nada muda em `ProfileDropdown.tsx`. Se o `/test` apontar a origem do item 2 num arquivo do repo, a correção é
renderizar o elemento só quando houver `src`, ou passar `undefined` no lugar de `""`, no arquivo apontado.

### Testes (esqueleto)

```tsx
// apps/app/__tests__/accountProfileFormAvatarReadOnly.test.tsx
const { impersonatingMock } = vi.hoisted(() => ({ impersonatingMock: vi.fn(() => false) }));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => ({ isImpersonating: impersonatingMock() }),
}));
vi.mock("@/shared/lib/storageEnabled", () => ({ isStorageEnabled: () => true }));
// + mocks de useAccountMutations, useFileUpload, AccountEmailChangeDialog, next/navigation
//   (copiar de accountProfileFormEmail.test.tsx)

it("desabilita escolher imagem sob personificação", ...)        // choose + input[type=file] disabled
it("desabilita substituir e remover quando já há avatar", ...)   // account.avatar + avatarUrl preenchidos
it("mantém o upload habilitado fora da personificação", ...)

// apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx
// spy em console.error; useMyAccount -> { data: { displayName: "Ana", avatarUrl: null } };
// useAuth -> user sem photoURL; expect(container.querySelector("img")).toBeNull();
// expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("empty string"), ...)
```

### Ordem de implementação e commit

Tudo em `apps/app`, num commit: `fix(app): disable avatar upload while impersonating` (prop + os dois testes).
Se o `/test` localizar a origem do item 2 no repo, a correção vira um segundo commit no app/pacote apontado.
Por último, `docs(features): account-avatar-polish`.

Env nova: nenhuma.

### Arquivos compartilhados com tarefas não commitadas

| Arquivo | Estado no working tree | Tarefa dona | Esta tarefa |
|---------|------------------------|-------------|-------------|
| `AccountProfileForm.tsx` | modificado (`allowEmailChange`, `className` do form, diálogo condicional) | `admin-own-account` (e `app-form-layout-centered` no `className`) | **altera** (1 linha). O `/review` precisa separar os hunks com `git add -p` ou commitar depois das outras tarefas |
| `ProfileDropdown.tsx` | modificado (`accountPath`) | `admin-own-account` | só lê; não altera |
| `accountProfileFormEmail.test.tsx` | novo, não rastreado | `admin-own-account` | só usa como modelo |
| `profileDropdownAccount.test.tsx` | modificado | `admin-own-account` | só usa como modelo |

Os dois testes desta tarefa são arquivos novos, para não misturar hunks com as outras tarefas.

### Decisões tomadas sem perguntar

1. **Corrigir no call site, não no design system.** Alternativa: fazer o `HookFormImageUpload` ler a
   personificação sozinho. Descartada porque o design system não conhece sessão (`packages/CLAUDE.md`) e o
   componente já aceita `disabled`.
2. **Não alterar `ProfileDropdown.tsx`.** Alternativa: trocar `?? ""` por `?? undefined`, igual ao
   `Sidebar.tsx:152`. Descartada porque a medição mostra que não muda nada observável, e o arquivo já carrega
   mudança de outra tarefa. A guarda vira teste.
3. **Item 2 fecha por evidência do `/test`, não por palpite.** Alternativa: suprimir o aviso ou caçar mais
   por texto. Descartada porque a busca já cobriu todo `src` renderizado em `apps/app` e `packages/*`; o
   component stack é o instrumento que falta.
4. **Desabilitar sem texto explicativo.** Alternativa: tooltip "modo só leitura". Descartada porque o painel já
   mostra o aviso de só leitura e nenhum outro controle da conta tem explicação própria.

### Riscos

- **Hunk compartilhado** em `AccountProfileForm.tsx`: commitar esta tarefa antes de `admin-own-account` exige
  `git add -p`; errar o hunk leva `allowEmailChange` junto.
- **Item 2 pode não reproduzir** no `/test` (o aviso pode depender da ferramenta de automação). Nesse caso o
  critério fecha como "não reproduzido", com o teste de guarda como única evidência.
- **Prop `disabled` combinada com `formState.isSubmitting`** no wrapper (`hookformImageUpload.tsx:56-58`):
  `false || undefined` resulta em `undefined`, que o `ImageUploadInput` trata como `false` (`:60`). Sem risco
  de travar o controle fora da personificação.

## Perguntas em aberto

Nenhuma bloqueante. Para o dono revisar depois:

- Quer um texto curto junto do controle desabilitado ("indisponível no modo só leitura")? Recomendação: não,
  o aviso de só leitura do painel já cobre.
- Se o `/test` concluir que o aviso de `src=""` vem do `next dev` ou do `agent-browser`, aceita fechar o achado
  do AUDIT como "não procede no código"? Recomendação: sim, com o component stack registrado.
