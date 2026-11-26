# Handoff do develop: account-avatar-polish

## Blueprint e arquivos

| Item do blueprint | Arquivo | Mudança |
|-------------------|---------|---------|
| Item 1: `disabled={isImpersonating}` no upload de avatar | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx` | 1 linha adicionada (linha 117) |
| Item 1: teste de componente | `apps/app/__tests__/accountProfileFormAvatarReadOnly.test.tsx` | novo, 4 casos |
| Item 2: teste de guarda do `ProfileDropdown` | `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx` | novo, 2 casos |

`ProfileDropdown.tsx` não foi alterado.

### Hunk desta tarefa no arquivo compartilhado

`AccountProfileForm.tsx` também carrega mudanças não commitadas de `admin-own-account` (`allowEmailChange`,
diálogo condicional) e de `app-form-layout-centered` (`className` do `<form>` sem `flex-1`). A única linha
desta tarefa é a 117, logo depois de `<HookFormImageUpload`:

```diff
                                     <HookFormImageUpload
+                                        disabled={isImpersonating}
                                         label={
```

No `git diff` contra `HEAD` (com as outras tarefas ainda no working tree), essa linha é o terceiro de cinco
hunks, sozinha: `@@ -110,6 +114,7 @@`. No `git add -p`, é o único hunk a aceitar. Os dois testes são arquivos
novos e não dividem hunk com ninguém.

## Contrato

Nada muda em SDK, API, DTO ou `error.code`. Sem chave de i18n nova (os testes leem `avatarUpload.choose`,
`replace` e `remove`, que já existem nos 3 idiomas).

## O que os testes cobrem

`accountProfileFormAvatarReadOnly.test.tsx` (jsdom, storage habilitado por mock, sem emulador):

- personificando, sem avatar: o botão "Escolher imagem" e o `<input type="file">` ficam `disabled`;
- personificando, com avatar: "Trocar imagem", "Remover imagem" e o input ficam `disabled`;
- sem personificação, com e sem avatar: os três controles ficam habilitados.

Para confirmar que o teste detecta a regressão, retirei a prop por um momento: os dois casos de personificação
falharam (`2 failed | 2 passed`). Depois devolvi a linha e conferi o arquivo.

`profileDropdownAvatarEmpty.test.tsx` tem dois casos. O primeiro é um controle do instrumento: um
`<img src="">` cru faz o React emitir o aviso em jsdom e o filtro de `console.error` o captura. O segundo
renderiza o `ProfileDropdown` com conta e usuário Firebase sem foto e verifica que aparecem as iniciais
("An"), que não há `<img>` no DOM e que nenhum aviso de `src` vazio chega ao `console.error`. Sem o caso de
controle, o segundo passaria mesmo se o texto do aviso mudasse numa versão futura do React.

## Área admin

`isImpersonatingSnapshot` (`apps/app/shared/lib/panelState.ts:99-105`) só devolve `true` com
`panelRequestRole === COMMON` e um alvo de personificação. Em `/admin/account` o papel da requisição é admin,
então `isImpersonating` é `false` e o upload fica habilitado. A prova está em dois níveis: o caso
`isImpersonating: false` do teste novo e o caso "is false for an admin without a target"
(`panelRequestRole: ADMIN`) de `__tests__/panelState.test.ts`. Não renderizei `AccountTabs area="admin"`
no teste; o caminho até o formulário passa pelo mesmo `useAuthRequestPanel`.

## Item 2: origem do aviso de `src=""`

Fiz uma sonda descartável em jsdom (arquivo de teste temporário, já apagado): renderizei o
`AccountProfileForm` com storage habilitado, com e sem personificação, em três contas sem imagem
(`avatar: null`; `avatar` preenchido com `avatarUrl: null`; `avatar` preenchido com `avatarUrl: ""`). Nos
seis renders, `console.error` não recebeu nenhuma chamada e o DOM não teve nenhum `<img>`. Somado ao teste
do `ProfileDropdown`, isso tira do caminho os dois componentes da conta que lidam com avatar. A origem
continua não localizada e fica para o `/test`.

## Desvios

Nenhum em relação ao plano. O caso de controle do detector no teste do `ProfileDropdown` não estava no
esqueleto; entrou para o teste de guarda não passar à toa.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Testes novos | `pnpm exec vitest run __tests__/profileDropdownAvatarEmpty.test.tsx __tests__/accountProfileFormAvatarReadOnly.test.tsx` (em `apps/app`) | 2 arquivos, 6 testes passando |
| Suíte do app | `pnpm --filter app test` | 151 arquivos, 1366 testes passando |
| Typecheck | `pnpm --filter app typecheck` | sem erro (a primeira rodada acusou o tipo do spy de `console.error`; corrigido para `MockInstance<Console["error"]>`) |
| Lint | `pnpm check` | 1150 arquivos, nenhum ajuste |

Paridade de i18n não se aplica: não há chave nova. A suíte do app rodou antes da correção de tipo do spy,
que só mudou a anotação do tipo; os dois testes novos rodaram de novo depois dela.

## A verificar no `/test`

- Admin personificando um usuário sem avatar, em `/account` > Perfil, com storage no emulador: "Escolher
  imagem" desabilitado, clicar no botão ou no rótulo não abre o seletor e nenhum `POST /files` sai.
- O mesmo com um usuário que já tem avatar: "Trocar imagem" e "Remover imagem" desabilitados, prévia visível.
- `/admin/account` e `/account` sem personificação: os três controles habilitados e o upload funcionando.
- O estado desabilitado legível em light e dark, desktop e mobile.
- Item 2: reproduzir o aviso `An empty string ("") was passed to the src attribute` no `next dev` e guardar o
  component stack que o React imprime junto. Os componentes da conta e o `ProfileDropdown` já saíram da lista
  pelos testes em jsdom. Sobram o overlay do `next dev`, a automação do `agent-browser` e componentes fora
  da aba Perfil. Repetir com `next build && next start`.

## Lacunas de teste conhecidas

- Nenhum teste renderiza `AccountTabs area="admin"` com o formulário de perfil. A cobertura do caso admin é
  indireta (`panelState.test.ts` + o caso `false` do teste novo).
- O clique no `<label>` do input sob personificação não foi testado em jsdom; o `<input>` está `disabled`,
  e o navegador é quem decide não abrir o seletor. Fica para o `/test`.
