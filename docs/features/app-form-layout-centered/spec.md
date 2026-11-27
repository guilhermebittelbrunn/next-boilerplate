---
id: app-form-layout-centered
title: Telas de formulário do painel centralizadas e com altura do conteúdo
status: done
value: médio
effort: P
audience: produto
area: [apps/app]
mode: ambos
depends_on: []
contends_on: [apps/app/shared/components/ui/pageLayout.ts, apps/app/shared/components/ui/Container.tsx, apps/app/shared/components/ui/PageSkeleton.tsx, "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx", "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx", "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx"]
feature: app-form-layout-centered
updated: 2026-11-26
---

# Telas de formulário do painel centralizadas e com altura do conteúdo

> **Resumo**
> - **O quê:** as telas de formulário do `apps/app` (criar e editar usuário no admin, criar e editar entidade, conta) passam a ficar centralizadas na área de conteúdo, com o painel do formulário na altura dos campos e a barra de ações logo abaixo dele.
> - **Por quê:** hoje o formulário fica colado à esquerda e o painel cinza estica até o rodapé, deixando um bloco vazio grande em telas largas. Parece página quebrada, e a primeira impressão de todo fork é essa.
> - **Status:** `done` · valor médio · esforço P · produto. Entregue pela PR #76 (`a13768c`, 2026-11-26) e arquivada aqui.
> - **Próximo passo:** nenhum. O CSS do antd que só chega depois da hidratação ficou fora do corte e segue como tarefa direta (D24).

## Problema

Em monitor largo, as telas de formulário do painel ocupam no máximo 896 px (`max-w-4xl`) encostadas na
borda esquerda, com o resto da largura vazio à direita. Dentro dessa coluna, o painel `bg-muted/50` que
envolve os campos cresce até o fim da janela: um formulário de três campos vira um retângulo cinza com dois
terços vazios, e os botões ficam lá no rodapé, longe dos campos. As telas de login, cadastro e onboarding já
são centralizadas e do tamanho do conteúdo, então a diferença aparece logo depois do primeiro acesso.

## O que já existe no repo

- `apps/app/shared/components/ui/pageLayout.ts:3`: `PAGE_NARROW_CLASS = "w-full max-w-4xl"`, sem `mx-auto`.
  É aplicada pelo `Container` (`apps/app/shared/components/ui/Container.tsx:152-157`) e pelo
  `PageSkeleton` (`apps/app/shared/components/ui/PageSkeleton.tsx:30-34`) quando `width="narrow"`.
- `apps/app/shared/components/ui/pageLayout.ts:1`: o corpo da página é `flex flex-1 flex-col`.
- `apps/app/shared/components/ui/Container.tsx:68`: o painel do layout padrão é
  `flex min-h-[50vh] w-full flex-1 flex-col ... rounded-xl bg-muted/50 p-4 md:min-h-min`. O `flex-1` faz o
  painel ocupar a altura que sobra.
- As telas de formulário repetem o esticamento no próprio `<form>` (`flex min-h-[50vh] w-full flex-1
  flex-col`) e aninham um `Container className="p-0"`, que herda o painel com `flex-1`:

| Tela | `Container` externo | `<form>` que estica | `Container` aninhado |
|------|---------------------|---------------------|----------------------|
| Admin, criar usuário | `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/page.tsx:64-67` (`narrow`) | `:71` | `:74` |
| Admin, editar usuário | `.../users/(pages)/edit/[id]/page.tsx:86-91` (`narrow`) | `:96` | `:99` |
| Criar entidade | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx:105-108` (`narrow`) | `:70` | `:73` |
| Editar entidade | `.../entities/(pages)/edit/[id]/EditEntityClient.tsx:104-109` (`narrow`) | `:114` | `:117` |
| Conta (abas) | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(pages)/(home)/AccountClient.tsx:26-36` (`narrow`, `contentOnly`) | blocos com `flex-1`: `AccountProfileForm.tsx:83`, `AccountPreferencesForm.tsx:113`, `AccountSecurityForm.tsx:76`, `AccountPrivacyPanel.tsx:82`, `AccountBillingPanel.tsx:281` | não; usam `Footer sticky={false}` |

- Barras de ação: o `Footer` fixo (`apps/app/shared/components/ui/Footer.tsx:37`, `sticky` por padrão) fica
  dentro do `<form>`, logo após o painel; a barra do `Container` (`Container.tsx:97-104`) e o
  `PageFormFooter` (`PageFormFooter.tsx:28-33`, usado só no playground) têm o mesmo estilo. Todas publicam
  `data-sticky-action-bar`, de que depende a reserva de foco WCAG 2.4.11 descrita em `apps/app/CLAUDE.md`.
- Carregamento: `account/(pages)/(home)/loading.tsx:8` e `entities/(pages)/edit/[id]/loading.tsx:6` usam
  `PageSkeleton width="narrow"`. Criar e editar usuário e criar entidade não têm `loading.tsx` próprio.
- Fora do escopo por já estarem resolvidas: onboarding, centralizado em `max-w-[400px]`
  (`apps/app/app/[locale]/(authenticated)/onboarding/(components)/OnboardingClient.tsx:150-151`), e
  cadastro/login, em `max-w-md` centralizado
  (`apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:124`).
- Organização (`apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/OrganizationClient.tsx:36-46`)
  usa largura cheia e mistura o formulário de convite com duas tabelas; o `mx-auto` em `:46` não tem efeito
  sem largura máxima.
- **Lacuna:** a coluna estreita não é centralizada, e o painel e o `<form>` esticam até o fim da janela.

## Evidência de mercado

É ajuste de consistência visual, sem pesquisa nova. A referência usada é o exemplo de configurações do
shadcn/ui, já registrado na nota
[`reference/research/settings-page-patterns.md`](../../../specs/reference/research/settings-page-patterns.md): a área de
conteúdo tem largura máxima (`flex-1 lg:max-w-2xl`) e altura do conteúdo, sem painel que estique até o fim da
página. O shadcn não centraliza porque tem navegação lateral à esquerda; a centralização aqui segue o padrão
interno das telas de autenticação e de onboarding.

- Fonte: <https://github.com/shadcn-ui/ui/tree/84bd724/apps/www/app/(app)/examples/forms> (layout lido em
  2026-11-24)

## Proposta — corte de MVP

- [x] Toda tela com `width="narrow"` fica centralizada horizontalmente na área de conteúdo, com o título da
      página alinhado à mesma coluna.
- [x] Nas telas de criar/editar usuário e criar/editar entidade, o painel do formulário tem a altura dos
      campos, e a barra de ações fica logo abaixo dele, na mesma largura.
- [x] Na conta, os blocos de cada aba deixam de esticar até o fim da janela.
- [x] A barra fixa continua fixa quando o formulário é maior que a janela, e continua publicando
      `data-sticky-action-bar` (os testes de foco não podem regredir).
- [x] O esqueleto de carregamento de cada tela coberta tem a mesma largura e posição da tela carregada, sem
      salto quando o conteúdo chega.
- [x] Listas e dashboards (largura cheia) não mudam.
- [x] Conferido no `/test` em light, dark e mobile, nas telas da tabela acima.

### Fora do corte

- Organização: é uma tela de tabelas com um formulário embutido, e segue largura cheia como as listas. Se o
  convite precisar de outro arranjo, é outra tarefa.
- Mudar a largura máxima (`max-w-4xl`) ou o layout em grade dos campos (`FormContainer`).
- Navegação lateral nas configurações da conta (discutida em `settings-page-patterns.md`).
- Playground: é tela de desenvolvimento.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | nenhum |
| `apps/api` | nenhum |
| `apps/app` | constantes de layout, `Container`, `PageSkeleton` e as telas da tabela; nenhum texto novo |
| `apps/web` | N/A |
| `packages/*` | nenhum |
| Infra/env | nenhum |

## Riscos e trade-offs

- **Efeito em cadeia.** `Container` e `PAGE_NARROW_CLASS` são usados por todas as telas. Tirar o `flex-1` do
  painel no layout padrão afeta também as listas, que usam o mesmo painel (por exemplo, com tabela vazia).
  A mudança precisa se limitar às telas estreitas ou ser conferida nas listas.
- **Barra fixa.** Com o painel da altura do conteúdo, a barra `sticky` passa a ficar logo abaixo dos campos
  em formulário curto e só gruda no rodapé em formulário longo. É o comportamento desejado, mas muda o que o
  E2E de foco (`focusNotObscured.spec.ts`) observa.
- **Mobile.** O `min-h-[50vh]` existe para o painel não ficar mínimo no celular. Tirá-lo sem conferir no
  celular pode deixar telas de erro de carga com aparência apertada.
- **Fork que já customizou.** Um fork que ajustou essas telas recebe conflito nas constantes de layout. O
  custo é baixo porque a mudança é de classe CSS.

## Sinais de pronto

- Num monitor de 1920 px, criar usuário, editar usuário, criar entidade, editar entidade e conta aparecem
  centralizados, sem bloco cinza vazio abaixo dos campos.
- Os botões salvar/voltar ficam logo abaixo do formulário, alinhados à mesma coluna.
- Em formulário maior que a janela, a barra de ações continua grudada no rodapé e o campo focado por teclado
  não fica escondido atrás dela.
- Lista de usuários, lista de entidades, auditoria e home continuam com largura cheia.
- O carregamento das telas cobertas não pula de posição quando o conteúdo chega.

## Perguntas em aberto

- A aba Cobrança da conta (cards de plano) segue a mesma coluna estreita centralizada? — **recomendação:**
  sim; está dentro da mesma tela `narrow` e separá-la criaria uma exceção sem ganho.
- Criar `loading.tsx` estreito para criar/editar usuário e criar entidade, que hoje não têm? —
  **recomendação:** sim, dentro do corte. Sem ele, o salto de layout continua na navegação para essas telas.

## Conferência da entrega (auditoria de 2026-11-26)

Conferida no código de `main` (`a13768c`), não no `status` gravado. A PR #76 foi mergeada em 2026-11-26 e a execução
de merge do CI (`gh run 45862770863`) terminou com os seis jobs verdes, `e2e` incluído.

| item do corte | situação | evidência |
|---------------|----------|-----------|
| Telas `narrow` centralizadas, com o título na mesma coluna | implementado | `apps/app/shared/components/ui/pageLayout.ts:3` (`mx-auto w-full max-w-4xl`) |
| Painel com a altura dos campos e barra logo abaixo, nas quatro telas de criar/editar | implementado | o `<form>` passou a `flex w-full flex-col`, sem `flex-1` nem `min-h-[50vh]`: `users/(pages)/create/page.tsx:71`, `users/(pages)/edit/[id]/page.tsx:96`, `entities/(pages)/create/page.tsx:70`, `EditEntityClient.tsx:114` |
| Blocos da conta sem esticar | implementado | nenhum `flex-1` nos blocos de `AccountProfileForm`, `AccountPreferencesForm`, `AccountSecurityForm`, `AccountPrivacyPanel` e `AccountBillingPanel` |
| Barra fixa preservada, com `data-sticky-action-bar` | implementado | `Footer.tsx:55`, `Container.tsx:100`, `PageFormFooter.tsx:33`; E2E `focusNotObscured` verde no CI de merge |
| Esqueleto na mesma largura e posição | implementado | `loading.tsx` estreito novo em criar e editar usuário e em criar entidade; teste `apps/app/__tests__/formLoadingSkeletons.test.tsx` |
| Listas e dashboards sem mudança | implementado | `Container.tsx` e `PageSkeleton.tsx` não mudaram na PR |
| Conferido no `/test` em claro, escuro e celular | implementado | `test/report.md` desta pasta: 10 de 10 critérios medidos em build de produção |

**Deriva.** A spec previa mexer no `Container` e no `PageSkeleton` e os declarava em `contends_on`. O `/analyze`
resolveu tudo com a classe `PAGE_NARROW_CLASS` e com o `<form>` de cada tela, e os dois componentes não mudaram. A spec
errou para mais, o que não causa dano. Os três formulários da conta mudaram aqui e em `admin-own-account`, como o
`contends_on` corrigido em 2026-11-25 previa.
