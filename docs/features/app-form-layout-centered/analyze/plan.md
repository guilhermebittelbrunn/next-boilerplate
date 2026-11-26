# Plano: telas de formulário do painel centralizadas e com altura do conteúdo

- **Spec:** [`specs/features/app-form-layout-centered.md`](../../../../specs/features/app-form-layout-centered.md) (`approved`, valor médio, esforço P)
- **Modo:** rodada autônoma do `/cycle`. Nenhuma pergunta feita; as decisões estão em "Perguntas em aberto (decididas por padrão)".
- **Apps impactados:** só `apps/app`, mais um ajuste de teste em `apps/e2e` (etapa D0, separada).

## 1. Contexto, objetivo e corte

### 1.1 Problema

Em monitor largo, as telas de formulário do painel ficam numa coluna de até 896 px (`max-w-4xl`) encostada à
esquerda, e o painel cinza que envolve os campos estica até o rodapé da janela. Duas causas, ambas lidas no código:

1. `PAGE_NARROW_CLASS = "w-full max-w-4xl"` (`apps/app/shared/components/ui/pageLayout.ts:3`) não tem `mx-auto`.
   O `Container` (`Container.tsx:152-157`) e o `PageSkeleton` (`PageSkeleton.tsx:30-34`) aplicam essa classe
   quando `width="narrow"`. Os dois são filhos diretos do `SidebarInset`, que é `flex w-full flex-1 flex-col`
   (`packages/design-system/components/ui/sidebar.tsx:338`); o layout comum não põe wrapper entre eles
   (`apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:62-68`). Num flex em coluna, `mx-auto` centraliza
   um filho com largura máxima.
2. O `<form>` das quatro telas de criar/editar usa `flex min-h-[50vh] w-full flex-1 flex-col`
   (users create `page.tsx:71`, users edit `page.tsx:96`, entities create `page.tsx:70`,
   `EditEntityClient.tsx:114`). Ele cresce dentro do wrapper do `contentOnlyLayout`
   (`Container.tsx:50`, também `flex-1`), e o `Container className="p-0"` aninhado herda a altura: o painel do
   `defaultLayout` é `flex-1` (`Container.tsx:68`) e ocupa todo o espaço que o `<form>` lhe dá. Resultado: um
   retângulo `bg-muted/50` até o rodapé, com a barra de ações lá embaixo.

### 1.2 Objetivo

As telas `width="narrow"` ficam centralizadas na área de conteúdo, o painel do formulário tem a altura dos
campos, e a barra de ações fica logo abaixo dele. Em formulário maior que a janela, a barra continua grudada no
rodapé e o foco por teclado continua visível (WCAG 2.4.11).

### 1.3 Corte de MVP (da spec, sem alteração)

- Coluna `narrow` centralizada, título junto.
- Painel com altura dos campos em criar/editar usuário e criar/editar entidade.
- Blocos da conta sem `flex-1`.
- Barra fixa continua fixa em formulário longo e publica `data-sticky-action-bar`.
- Esqueleto de carregamento com a mesma largura e posição da tela carregada, inclusive nas três telas que hoje
  não têm `loading.tsx`.
- Listas e dashboards sem mudança.

### 1.4 Fora de escopo

- Organização (largura cheia, tabelas), largura `max-w-4xl`, grade do `FormContainer`, navegação lateral da conta,
  playground (todos listados em "Fora do corte" da spec).
- A barra do breadcrumb (`Header`, 64 px) fica como está, com largura cheia em todas as telas. A spec pede o
  título da página na coluna; o título é o `PageHeader`, que mora dentro do `Container` e acompanha a coluna.
- O `LoadingPanel` do `Container` (`Container.tsx:33-39`, spinner com `min-h-[50vh] flex-1`) continua esticando
  durante o carregamento client-side de editar usuário e editar entidade. Ele é compartilhado com as listas, e a
  spec não pede mudança nele. Registrado em "Perguntas em aberto".
- O `min-h-[50vh]` do próprio `Container` (`Container.tsx:35`, `:50`, `:68`) não muda (ver §5.5).

### 1.5 Modo de produto, área, assinatura

- Área comum (entidades, conta) e admin (usuários). Funciona igual em `subscription` e `simple`.
- Criar entidade pode estar atrás do `PlanGate` (`entities/(pages)/create/page.tsx:112-120`); o fallback
  `FormSkeleton` do gate fica dentro da mesma coluna centralizada, sem mudança.

### 1.6 Fontes

Só a spec e o código. Sem card do ClickUp, sem link externo a ler. Referência de mercado já registrada pela spec
em `specs/reference/research/settings-page-patterns.md`.

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo, consulta ou índice.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhuma rota, guard ou `error.code` novo.

## 5. Front-end (`apps/app`)

### 5.1 Centralização: só no caminho `narrow`

Uma linha em `pageLayout.ts`:

```ts
export const PAGE_NARROW_CLASS = "mx-auto w-full max-w-4xl";
```

**Por que as listas ficam intactas:** a classe só é aplicada quando `width === "narrow"`
(`Container.tsx:155`, `PageSkeleton.tsx:33`). Os únicos chamadores com `width="narrow"` são as cinco telas da
spec e os dois `loading.tsx` existentes (grep em `apps/app`: `AccountClient.tsx:36`, `account/.../loading.tsx:8`,
`EditEntityClient.tsx:109`, `entities/.../edit/[id]/loading.tsx:6`, `entities/.../create/page.tsx:108`,
`users/.../edit/[id]/page.tsx:91`, `users/.../create/page.tsx:67`). Listas, home, auditoria, organização e
admin home usam o padrão `width="full"` e não recebem a classe. `PAGE_BODY_CLASS` e o `defaultLayout` não mudam.

Abaixo de ~900 px de área de conteúdo, `mx-auto` não tem efeito (a coluna já ocupa a largura toda). No celular
nada muda horizontalmente.

### 5.2 Painel com altura dos campos: no `<form>` das quatro telas

Nas quatro telas, o `<form>` passa de `flex min-h-[50vh] w-full flex-1 flex-col` para `flex w-full flex-col`.

Sem `flex-1` nem `min-h-[50vh]`, o `<form>` tem a altura do conteúdo. O `Container className="p-0"` aninhado
continua com o painel `flex-1`, mas num pai sem espaço sobrando o `flex-1` não cresce nada. O painel fica com a
altura dos campos e o `Footer` vem logo depois, na mesma largura.

**Por que não mexer no `Container`:** o `defaultLayout` é o mesmo das listas (por exemplo, com tabela vazia), e o
`Container` aninhado não recebe `width` (regra em `apps/app/CLAUDE.md`, seção Páginas). Tirar o `flex-1` do
painel ou criar um modo novo do `Container` afetaria as listas ou exigiria prop nova sem segundo caso de uso. A
causa do esticamento nas quatro telas é a classe do próprio `<form>`, então a correção vai nela.

O wrapper do `contentOnlyLayout` (`Container.tsx:50`) continua `flex-1 min-h-[50vh]`, mas não tem fundo: o
espaço abaixo do formulário fica com a cor da página, sem bloco cinza.

### 5.3 Barra fixa e WCAG 2.4.11

O `Footer` fixo (`Footer.tsx:51-55`) é `sticky bottom-0` dentro do `<form>`. Elemento `sticky` gruda dentro do
bloco que o contém:

- Formulário curto (desktop): a posição natural da barra fica acima do rodapé da janela, então ela aparece logo
  abaixo do painel. É o comportamento que a spec pede.
- Formulário maior que a janela (celular, ou descrição longa): o `<form>` é mais alto que a viewport e a barra
  gruda no rodapé enquanto o formulário rola, como hoje.

`data-sticky-action-bar` continua no `Footer` (nada muda nele), então o `scroll-padding` do `<html>` continua
reservando 80 px. No celular a altura do formulário já era a do conteúdo (o conteúdo passava de 50vh), então o
que o `focusNotObscured.spec.ts` observa a 375×812 não deve mudar. Isso é hipótese até o `/test` rodar o E2E.

### 5.4 Conta

Os blocos de cada aba perdem `flex-1`:

| arquivo | linha | de | para |
|---|---|---|---|
| `AccountProfileForm.tsx` | 83 | `flex w-full flex-1 flex-col` | `flex w-full flex-col` |
| `AccountPreferencesForm.tsx` | 113 | `flex w-full flex-1 flex-col` | `flex w-full flex-col` |
| `AccountSecurityForm.tsx` | 76 | `flex w-full flex-1 flex-col gap-6` | `flex w-full flex-col gap-6` |
| `AccountPrivacyPanel.tsx` | 82 | `flex w-full flex-1 flex-col gap-6` | `flex w-full flex-col gap-6` |
| `AccountBillingPanel.tsx` | 281 | `flex w-full flex-1 flex-col gap-6` | `flex w-full flex-col gap-6` |

Leitura do código: hoje esse `flex-1` provavelmente não estica nada. O `Tabs` raiz é
`flex gap-2 data-[orientation=horizontal]:flex-col` sem `flex-1` (`tabs.tsx:18-20`) e o `AccountTabs` passa
`flex-col gap-6 lg:flex-row` (`AccountTabs.tsx:90`), então a aba tem a altura do conteúdo. Mesmo assim o corte da
spec pede a remoção, e o custo é zero: tira uma classe sem efeito que voltaria a esticar os blocos se alguém
puser `flex-1` no `Tabs`. O efeito visível na conta é só a centralização. O `/test` mede a altura dos blocos.

O `AccountBillingPlaceholder.tsx:11` (`flex-1` com conteúdo centralizado) fica como está; ele só cresceria se o
pai tivesse espaço sobrando, e o pai deixa de ter `flex-1`.

A aba Cobrança segue a coluna estreita (pergunta 1 da spec, recomendação adotada).

### 5.5 Mobile e o `min-h-[50vh]`

- O `min-h-[50vh]` sai **só** do `<form>` das quatro telas.
- O painel do `defaultLayout` mantém `min-h-[50vh] md:min-h-min` (`Container.tsx:68`): abaixo de 768 px ele tem
  pelo menos metade da altura da tela, como hoje. É o que a spec chama de motivo do `min-h`: o painel não fica
  mínimo no celular, inclusive no estado de erro de carga, que usa o mesmo painel em listas.
- O wrapper do `contentOnlyLayout` e o `LoadingPanel` mantêm o `min-h-[50vh]`. O erro de carga das telas de
  formulário (`loadError` com `contentOnly`) não muda de aparência.
- Consequência: no celular, um formulário com menos de 50vh de campos ainda mostra painel com sobra embaixo. Os
  formulários do corte têm 6+ campos em uma coluna e passam disso; o `/test` confere a 390×844.

### 5.6 Esqueletos de carregamento

Três `loading.tsx` novos, cópia do precedente `entities/(pages)/edit/[id]/loading.tsx:1-12`
(`PageSkeleton width="narrow"` + painel `rounded-xl bg-muted/50 p-4` com `FormSkeleton`):

- `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/loading.tsx`
- `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/loading.tsx`
- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/loading.tsx`

Flags iguais às da tela: nenhuma das três passa `description` nem `actions` ao `PageHeader`, então
`PageSkeleton width="narrow"` sem outras props. O painel do esqueleto já não tem `flex-1`, o que bate com o
painel novo, da altura dos campos. Os dois `loading.tsx` existentes (conta e editar entidade) ganham a
centralização sozinhos, pela constante compartilhada.

Pergunta 2 da spec, recomendação adotada.

### 5.7 Rotas, dados, hooks, formulário, tabela

Sem rota nova, hook novo, `queryKey` ou campo. `PANEL_PAGE_TITLES` não muda (nenhuma tela nova; `loading.tsx`
não exporta metadata).

### 5.8 i18n e a11y

Nenhum texto novo. Nenhuma chave de i18n. Sem mudança de ordem de foco nem de semântica; só classes de layout.

## 6. Autorização e segurança

N/A. Nenhuma mudança de guard, dado ou rota. Sob impersonação, as telas de entidade continuam mostrando o
`ImpersonationReadOnlyNotice` dentro do painel, que agora tem a altura do conteúdo (aviso + campos).

## 7. Testes

| # | nível | arquivo | o que prova |
|---|---|---|---|
| T1 | componente (Vitest/jsdom) | `apps/app/__tests__/pageShell.test.tsx` (estender o caso "limita a largura só com width narrow", `:88-103`) | `width="narrow"` leva `mx-auto` e `width="full"` não leva. O caso existente "usa a mesma classe de corpo e de largura que o Container" (`:116`) já garante que o `PageSkeleton` acompanha |
| T2 | componente | `apps/app/__tests__/formLoadingSkeletons.test.tsx` (novo) | Os cinco `loading.tsx` das telas `narrow` (conta, criar/editar usuário, criar/editar entidade) renderizam o corpo com `max-w-4xl` e `mx-auto`. Pega o `loading.tsx` esquecido ou criado com `width` errado |
| T3 | E2E existente | `apps/e2e/tests/focusNotObscured.spec.ts` | Barra fixa continua grudando e o foco continua visível nas telas de entidade a 375×812. Não precisa de teste novo; depende da etapa D0 para o terceiro caso voltar a valer |

Não planejo teste de classe nos `<form>` das páginas: afirmar `not.toContain("flex-1")` num page client com
React Query, RHF e router é caro e frágil, e não prova o que importa (altura do painel). Quem prova a altura é a
medição no browser (§8), com número.

Testes existentes que tocam a superfície e devem seguir verdes sem mudança: `focusNotObscuredScrollPadding.test.tsx`,
`sharedFooterPendingState.test.tsx`, `accountPreferencesForm.test.tsx`, `accountSecurityForm.test.tsx`,
`accountPrivacyPanel.test.tsx`, `accountBillingPanel.test.tsx`, `editUserPageOwnAccount.test.tsx`,
`entityCreatePlanGate.test.tsx`, `entityFormsReadOnly.test.tsx`.

### 7.1 Etapa D0: diagnóstico do E2E vermelho (commit próprio, antes do código da feature)

O terceiro caso de `focusNotObscured.spec.ts` (`:188-237`) falha na `main`: abre a lista de entidades, clica em
"Mais ações" da linha semeada (`:191-196`) e espera 120 s pelo item "Editar", que não aparece (AUDIT.md,
"Achados da PR #75"; `gh run 45633106961`, 4 de 4 tentativas; também vermelho em `45311956449`, PR #73; verde no
merge da PR #74). Como essa é a superfície que a feature muda, o teste precisa voltar a observar antes da mudança.

Passos para o `/develop`:

1. **Reproduzir na base, sem a feature.** `pnpm --filter e2e e2e -- tests/focusNotObscured.spec.ts --project=chromium --repeat-each=10 --trace=on`. Registrar quantas falham. Se nenhuma falhar local, baixar o
   artefato `e2e-evidence` do run 45633106961 (`gh run download 45633106961 -n e2e-evidence`) e ler o trace.
2. **Testar a hipótese do clique antes da hidratação.** Indícios: o `entityCrud.spec.ts:29` espera a linha
   semeada ficar visível antes de abrir o mesmo menu e passa; o `focusNotObscured` clica direto. O retrato do CI
   mostra o botão com foco e nenhum menu, que é o que acontece quando o clique nativo chega antes do handler do
   `Dropdown` do antd (`packages/design-system/components/ui/action-menu.tsx:6`). Para medir: no trace, comparar
   o instante do clique com o fim da hidratação/resposta da `GET /entities`.
3. **Se a causa for do teste** (clique cedo): esperar o mesmo sinal que o precedente usa,
   `organizationOwnership.spec.ts` (espera a resposta da API e o botão habilitado antes de agir), ou repetir o
   clique até o `menuitem` aparecer com `expect(...).toPass()`. Provar com `--repeat-each=10` verde e registrar
   o vermelho anterior. Commit `test(e2e): wait for the entities list before opening the row menu`.
4. **Se a causa for da app** (o menu não abre mesmo depois de hidratado): é defeito fora do escopo desta spec.
   Não trocar a navegação do teste para a URL direta só para ele passar (a política proíbe afrouxar teste).
   Registrar como achado com `arquivo:linha` no `develop/handoff.md` e deixar para o `/spec --sync` levar ao
   backlog. Nesse caso o terceiro caso continua vermelho e o `/test` cobre editar entidade pelo browser.

## 8. O que o `/test` vai percorrer

Dados: seed do emulador (`user@example.com` comum com a entidade "Acme Franchise"; admin semeado). Credenciais
de dev em `.claude/dev-credentials.local.md`, nunca no relatório.

Telas: criar usuário, editar usuário (admin), criar entidade, editar entidade (comum), conta em todas as abas
(Perfil, Preferências, Segurança, Privacidade, Cobrança). Controle negativo: lista de usuários, lista de
entidades, auditoria, home comum e admin home, organização.

Viewports: 1920×1080 e 1280×800 (desktop), 390×844 (celular). Temas claro e escuro. Idiomas pt-br, en, es (só
para confirmar que botões traduzidos não quebram a barra; nenhum texto mudou).

Medições por tela (texto no relatório, não só print):

1. Centralização: `left` e `right` da coluna (`getBoundingClientRect` do pai do `h1`) em relação à área de
   conteúdo; diferença entre as margens ≤ 1 px a 1920.
2. Altura do painel `bg-muted/50`: igual à altura dos campos + padding, sem sobra. Distância entre o fim do painel e
   o topo da barra de ações = 16 px (`mt-4`).
3. Barra em formulário longo: em editar entidade com descrição de 30 linhas, a barra fica com `bottom` igual ao
   da viewport enquanto o formulário rola; Tab por todos os campos sem foco coberto.
4. Esqueleto: com throttling de rede, navegar para cada tela e comparar `left`/largura da coluna do esqueleto com
   a da tela carregada (diferença 0).
5. Listas: largura do corpo igual à da área de conteúdo, antes e depois. Lista de entidades vazia (usuário sem
   entidade) mantém o painel como hoje.
6. Erro de carga: editar entidade com id inexistente mostra o `LoadErrorState` como antes.
7. Rodar `pnpm e2e` inteiro; `focusNotObscured` com `--repeat-each=3`.

Não verificável sem infra externa: nada. Teclado virtual de celular real e Safari/Firefox ficam como não
verificados, como na feature `app-footer-focus-not-obscured`.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Coluna estreita centralizada em monitor largo**
  A 1920×1080, criar usuário, editar usuário, criar entidade, editar entidade e conta exibem a coluna de até
  896 px centralizada na área de conteúdo, com as margens esquerda e direita iguais (diferença de no máximo
  1 px). O título da página (`h1` do `PageHeader`) começa na borda esquerda da coluna, não na borda da área de
  conteúdo. A barra do breadcrumb continua com largura cheia, como em todas as telas.

- [ ] **Painel do formulário na altura dos campos**
  Nas quatro telas de criar/editar, o painel `bg-muted/50` termina logo depois do último campo (mais o padding
  de 16 px), sem área cinza vazia abaixo. A barra de ações (voltar/salvar) fica 16 px abaixo do painel, na mesma
  largura da coluna. Com o `ImpersonationReadOnlyNotice` visível (admin personificando), o painel cresce só o
  necessário para o aviso.

- [ ] **Barra fixa em formulário longo**
  Quando o formulário é mais alto que a janela (celular a 390×844, ou editar entidade com descrição longa no
  desktop), a barra continua grudada no rodapé da viewport enquanto a página rola e publica
  `data-sticky-action-bar`. Navegando com Tab e Shift+Tab por todos os campos, nenhum controle focado fica atrás
  da barra nem do `Navbar`. O E2E `focusNotObscured.spec.ts` passa nos casos que passavam na base.

- [ ] **Conta sem blocos esticados**
  Em cada aba da conta (Perfil, Preferências, Segurança, Privacidade, Cobrança), o último bloco termina na altura
  do seu conteúdo e não há espaço vazio criado por `flex-1`. A aba Cobrança segue a mesma coluna centralizada,
  com o placeholder ou os cards de plano dentro dela. Os botões de cada bloco continuam inline (`Footer
  sticky={false}`), sem barra fixa.

- [ ] **Esqueleto sem salto**
  Navegando para criar usuário, editar usuário, criar entidade, editar entidade e conta com a rede lenta, o
  esqueleto aparece na mesma posição horizontal e com a mesma largura da tela carregada (diferença 0 px no
  `left` e na largura da coluna). O título do esqueleto ocupa o mesmo lugar do `h1`. Criar entidade atrás do
  `PlanGate` mostra o `FormSkeleton` do gate dentro da mesma coluna.

- [ ] **Listas e dashboards inalterados**
  Lista de usuários, lista de entidades (com e sem itens), auditoria, home comum, admin home e organização mantêm
  largura cheia e o mesmo painel de hoje, inclusive o painel com `min-h-[50vh]` no celular quando a tabela está
  vazia. Nenhuma dessas telas ganha `mx-auto` ou `max-w-4xl`.

- [ ] **Mobile preserva o painel mínimo**
  A 390×844, as telas de formulário ocupam a largura toda (a centralização não tem efeito) e o painel continua
  com pelo menos metade da altura da tela. O erro de carga (editar entidade ou usuário com id inexistente) mostra
  o `LoadErrorState` com a mesma aparência de antes, sem ficar comprimido.

- [ ] **Temas e idiomas**
  Em claro e escuro, o painel, a barra e o fundo da página mantêm o contraste atual; o espaço abaixo do
  formulário tem a cor de fundo da página, não a do painel. Em pt-br, en e es, os rótulos da barra cabem numa
  linha a 390 px e nenhum texto novo aparece.

- [ ] **Rede de regressão do E2E**
  O terceiro caso de `focusNotObscured.spec.ts` ("arrow keys keep the focused genre option clear of the action
  bar") passa em `--repeat-each=10` depois da etapa D0, ou, se a causa estiver na app, o achado fica registrado
  com `arquivo:linha` e o caso de editar entidade é coberto pela passada no browser. Em nenhum dos dois casos o
  teste é desativado ou trocado para navegar direto pela URL.

## 10. Blueprint técnico

### 10.1 Contrato, rota, persistência

N/A (sem SDK, API ou Firestore).

### 10.2 Arquivos

```
apps/app/shared/components/ui/pageLayout.ts                                   (editar, 1 linha)
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/page.tsx       (editar, 1 linha)
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/loading.tsx    (novo)
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/page.tsx    (editar, 1 linha)
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/loading.tsx (novo)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx         (editar, 1 linha)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/loading.tsx      (novo)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx (editar, 1 linha)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx     (editar, 1 linha)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx (editar, 1 linha)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx    (editar, 1 linha)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx    (editar, 1 linha)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx    (editar, 1 linha)
apps/app/__tests__/pageShell.test.tsx                                          (editar)
apps/app/__tests__/formLoadingSkeletons.test.tsx                               (novo)
apps/app/CLAUDE.md                                                             (editar, regra de páginas)
apps/e2e/tests/focusNotObscured.spec.ts                                        (D0, só se a causa for do teste)
```

Arquivos que **não** mudam: `Container.tsx`, `PageSkeleton.tsx`, `Footer.tsx`, `PageFormFooter.tsx`,
`FormSkeleton.tsx`, qualquer lista ou dashboard.

### 10.3 Pseudo-diffs

```diff
// apps/app/shared/components/ui/pageLayout.ts
-export const PAGE_NARROW_CLASS = "w-full max-w-4xl";
+export const PAGE_NARROW_CLASS = "mx-auto w-full max-w-4xl";
```

```diff
// users create page.tsx:71, users edit page.tsx:96, entities create page.tsx:70, EditEntityClient.tsx:114
-className="flex min-h-[50vh] w-full flex-1 flex-col"
+className="flex w-full flex-col"
```

```diff
// AccountProfileForm.tsx:83, AccountPreferencesForm.tsx:113
-className="flex w-full flex-1 flex-col"
+className="flex w-full flex-col"
// AccountSecurityForm.tsx:76, AccountPrivacyPanel.tsx:82, AccountBillingPanel.tsx:281
-className="flex w-full flex-1 flex-col gap-6"
+className="flex w-full flex-col gap-6"
```

```tsx
// users/(pages)/create/loading.tsx, users/(pages)/edit/[id]/loading.tsx, entities/(pages)/create/loading.tsx
import { FormSkeleton } from "@/shared/components/ui/FormSkeleton";
import { PageSkeleton } from "@/shared/components/ui/PageSkeleton";

export default function Loading() {
    return (
        <PageSkeleton width="narrow">
            <div className="rounded-xl bg-muted/50 p-4">
                <FormSkeleton />
            </div>
        </PageSkeleton>
    );
}
```

```ts
// pageShell.test.tsx, caso "limita a largura só com width narrow"
expect(container.firstElementChild?.className).not.toContain("mx-auto"); // full
// ...depois do rerender com width="narrow"
expect(container.firstElementChild?.className).toContain("mx-auto");
```

```ts
// formLoadingSkeletons.test.tsx (esboço)
// importa os 5 loading.tsx das telas narrow, renderiza cada um,
// e confere que o segundo filho (corpo do PageSkeleton) tem "mx-auto" e "max-w-4xl".
```

```diff
// apps/app/CLAUDE.md, seção Páginas
-- Formulários e configurações usam `width="narrow"` no `Container` externo (largura máxima em `shared/components/ui/pageLayout.ts`); listas e dashboards ficam com a largura cheia. ...
+- Formulários e configurações usam `width="narrow"` no `Container` externo (coluna centralizada com largura máxima em `shared/components/ui/pageLayout.ts`); listas e dashboards ficam com a largura cheia. O `<form>` de página inteira não leva `flex-1` nem `min-h-*`: o painel e a barra de ações acompanham a altura dos campos. ...
```

### 10.4 i18n

Nenhuma chave.

### 10.5 Ordem de implementação e commits

Sem SDK, API ou i18n. Ordem e plano sugerido de commits (o `/review` decide os finais):

1. `test(e2e): wait for the entities list before opening the row menu`: etapa D0, só se a causa for do teste.
   Vai primeiro porque restaura a rede antes da mudança visual.
2. `feat(app): center the narrow page column`: `pageLayout.ts` + T1.
3. `feat(app): size full-page forms to their fields`: os quatro `<form>`.
4. `feat(app): stop stretching the account tab blocks`: os cinco blocos da conta.
5. `feat(app): add narrow loading skeletons to user and entity forms`: três `loading.tsx` + T2.
6. `docs(app): describe content-height form pages`: `apps/app/CLAUDE.md`.
7. `docs(features): app-form-layout-centered`: artefatos, por último.

### 10.6 Env e configuração

Nenhuma variável de ambiente nova.

### 10.7 Pré-requisitos manuais de infra

Nenhum. A mudança é de classe CSS e arquivos de carregamento; não toca Firebase, Stripe, Vercel, DNS nem
`docs/PRE-PRODUCTION.md`.

## 11. Riscos

- **Fork que customizou essas telas** recebe conflito de uma linha por arquivo. Baixo custo.
- **Hipótese não medida em §5.3:** que o E2E a 375×812 continua vendo campos sob a barra com a página no topo
  (`focusNotObscured.spec.ts:106-109`). No celular o conteúdo já passava de 50vh, mas só o `/test` confirma.
- **D0 pode não fechar:** se a causa estiver na app, o terceiro caso do E2E continua vermelho na branch e o CI
  `e2e` segue vermelho, com o achado registrado.
- **Carregamento client-side** de editar usuário e editar entidade ainda mostra o `LoadingPanel` alto antes do
  formulário (ver pergunta 4).

## Perguntas em aberto (decididas por padrão)

1. **A aba Cobrança segue a coluna estreita centralizada?** Opções: seguir a coluna; dar largura cheia à aba.
   **Adotada:** seguir a coluna (recomendação da spec; separar criaria exceção dentro da mesma tela).
2. **Criar `loading.tsx` estreito para criar/editar usuário e criar entidade?** Opções: criar; deixar sem.
   **Adotada:** criar (recomendação da spec; sem ele o salto continua na navegação).
3. **Onde cortar o esticamento: no `Container` ou no `<form>` das telas?** Opções: (a) prop nova no `Container`
   ou mudança do `defaultLayout`; (b) tirar `flex-1`/`min-h-[50vh]` do `<form>` das quatro telas.
   **Adotada:** (b). O `defaultLayout` é compartilhado com as listas e o `Container` aninhado não recebe `width`;
   (b) tem o menor raio e ataca a classe que causa o esticamento.
4. **O `LoadingPanel` (spinner) do `Container` também deveria ter altura menor nas telas estreitas?** Opções:
   mudar o `LoadingPanel` quando `narrow`; deixar. **Adotada:** deixar. Não está no corte da spec, é compartilhado
   com as listas e não causa salto horizontal. Se incomodar, é tarefa à parte.
5. **Remover o `flex-1` dos blocos da conta, se ele parece não ter efeito hoje?** Opções: remover; não tocar.
   **Adotada:** remover. Está no corte da spec, o custo é nulo e evita que o esticamento volte com uma mudança no
   `Tabs`.
6. **A barra do breadcrumb (`Header`) também centraliza?** Opções: centralizar; manter largura cheia.
   **Adotada:** manter. A spec pede o título da página na coluna, e o breadcrumb segue o padrão de todas as telas
   do painel.
7. **Se o diagnóstico D0 apontar defeito na app, corrigir aqui?** Opções: corrigir junto; registrar e não
   corrigir. **Adotada:** registrar e não corrigir (decisão do orquestrador; o menu da lista não faz parte do
   corte, e corrigir por cima misturaria assuntos no mesmo pipeline).
