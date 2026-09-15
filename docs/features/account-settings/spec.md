---
id: account-settings
title: Área de conta e preferências do usuário
status: done
value: alto
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: []
contends_on: ["apps/app/app/[locale]/(authenticated)/(common)/routes.tsx", "apps/app/app/[locale]/(authenticated)/(common)/paths.ts", packages/sdk/src/types/user/user.ts, apps/api/(shared)/repositories/user.repository.ts]
feature: account-settings
delivered: 2026-09-15
updated: 2026-09-15
---

# Área de conta e preferências do usuário

## Problema

O usuário autenticado **não tem onde mexer na própria conta**. Não há página de conta, perfil ou configurações em nenhum lugar da `apps/app`: não dá para corrigir o nome, trocar a foto, mudar a senha ou escolher um idioma que persista. O menu do avatar oferece uma única ação — sair.

Pior que faltar: o produto **promete e não entrega**. A sidebar exibe um menu "Configurações" com quatro itens (General, Team, Billing, Limits) e todos apontam para `#`. O usuário clica e nada acontece. Para um core de MVPs, isso significa que todo fork ou apaga o menu ou implementa a área do zero — e é a primeira tela que qualquer usuário procura depois de entrar.

## O que já existe no repo

- `apps/app/shared/components/ui/ProfileDropdown.tsx` — o menu do avatar mostra nome e e-mail (`:42-45`) e tem **uma** ação: sair (`:49-52`, com a string "Sair" literal no JSX, `:51`). Nenhum link para conta.
- `apps/app/app/[locale]/(authenticated)/(common)/routes.tsx:64-81` — o grupo "Configurações" declara `General`, `Team`, `Billing` e `Limits`, **todos com `url: "#"`** e título literal em inglês. O grupo `Documentation` (`:41-58`) tem outros 4 placeholders iguais.
- `apps/app/app/[locale]/(authenticated)/(common)/paths.ts:10-36` — o mapa real de rotas da área comum tem só `root`, `playground` e `entities`. Confirma que os itens acima não existem como página.
- `packages/sdk/src/types/user/user.ts:30-52` — `UserWithAuthDTO` já carrega `displayName:34`, `photoURL:35`, `phoneNumber:36` e `emailVerified:33`. O contrato existe; é **somente leitura** hoje.
- `packages/design-system/components/form/hookform/index.ts:2-9` — 8 campos RHF prontos (input, senha, data, radio, select, switch, textarea e **upload de imagem**, `:3`), que cobrem o formulário desta spec **inteiro**, avatar incluído.
- `packages/auth/server.ts:226` — `revokeUserSessions` já existe e já é usado no logout global (`packages/auth/session-routes.ts:79`); falta só ser oferecido como ação do usuário.
- `packages/design-system/components/ui/mode-toggle.tsx:25` e `apps/app/shared/components/ui/LanguageSwitcher.tsx:50` (`setCookie("x-locale", …)`, componente exportado em `:32`) — tema e idioma **já são trocáveis**, mas via `next-themes` e cookie de navegador: mudar de máquina perde a escolha.
- **Lacuna:** todas as rotas de usuário da API são de administrador — `users/route.ts:21,34` e `users/[id]/route.ts:15,33,75` estão sob `requireAdminApi`. **Não existe nenhum caminho pelo qual o usuário edite a si mesmo.** Não há campo de preferência no `UserDTO` (`:7-14`) nem wrapper RHF de checkbox no design system.
  **O upload deixou de ser lacuna:** `packages/design-system/components/ui/image-upload-input.tsx`
  (exportado em `ui/index.ts:22`) e `components/form/hookform/hookformImageUpload.tsx` (o 8.º `HookForm*`,
  exportado em `hookform/index.ts:3`) já existem; e o armazenamento também — `firebase.json:1-9` declara o
  bloco `"storage"` (`:6-8`), `storage.rules` está na raiz, `FIREBASE_STORAGE_BUCKET` entrou nos env
  tipados (`packages/auth/keys.ts:18`, `apps/api/env.ts:26`, `apps/app/env.ts:16`) e `getStorageAdmin()`
  está em `packages/auth/server.ts:88`.

### As duas dependências caíram — spec desbloqueada (remedido em 2026-09-14)

`auth-recovery-verification` foi **entregue e mergeada em `main`** (PR #10, `e4eddb9`) e
`file-upload-storage` também (PR #11, `9154776`). Esta spec **não tem mais bloqueio nenhum**, e o plano B
de "entregar sem avatar" **caducou**: o avatar deixou de ser a parte cara do corte e virou a mais barata.
Três consequências práticas, medidas no código:

- **A troca de senha autenticada ficou quase de graça.** O "Fora do corte" daquela spec deixou a troca
  autenticada para cá dizendo que reaproveitaria "o mesmo ponto de extensão" — e ele agora existe:
  `apps/api/app/(routes)/auth/password/reset/route.ts` já resolve `oobCode` → conta → nova senha →
  `revokeUserSessions` (`:49`), e `packages/shared/utils/helpers/httpStatus.ts:14` ganhou o 503. Falta a
  variante autenticada, não o mecanismo.
- **Há UI reusável pronta:** `(unauthenticated)/components/AuthCard.tsx` (card com 7 estados) e
  `(unauthenticated)/reset-password/validations/resetPasswordSchema.ts` — a regra de senha já está escrita
  e testada, em vez de ser reinventada nesta spec.
- **O avatar virou consumo, não construção.** `POST /files`
  (`apps/api/app/(routes)/files/route.ts:13`, já sob `requireCommonPanelApi`), `FileActions` no SDK
  (`packages/sdk/src/actions/file/action.ts:11`, exposto como `apiClient.file`),
  `apps/app/shared/hooks/useFileUpload.ts` e o `HookFormImageUpload` foram construídos **genéricos
  exatamente para este caso**. Esta spec **consome** essa cadeia; não inaugura nada.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- Prevalência: **perfil + avatar/upload em 6/10 dos starters**, com valor "alto" e esforço "P" — bom retorno. A nota alerta que o avatar "traz consigo storage de arquivo (validar MIME e tamanho **no servidor**, bucket não público)".
- **Dark mode: 9/10**, commodity. Aqui existe, mas por navegador; persistir por usuário é o delta real.
- **Exclusão de conta: 4/10** (confiança/legal), com a armadilha registrada: "deletar o usuário e deixar órfãos (assinatura Stripe ativa, arquivos no bucket, membros de organização). O correto é anonimizar + cancelar + limpar" — motivo pelo qual fica fora deste corte.
- **Sessões/dispositivos gerenciáveis: 1/10** — nicho; entra aqui só na forma mínima ("sair de todos os dispositivos"), porque a peça de servidor já está pronta e custa quase nada.
- Fontes: <https://clerk.com/docs/components/user/user-profile> · <https://makerkit.dev/docs/next-supabase-turbo/installation/functional-walkthrough>

## Proposta — corte de MVP

**Entregue 6/6** — PR **#12**, merge commit `a4df5ed` em `main` (2026-09-15T14:12:48Z), CI `success` nesse
SHA. Cada item abaixo foi reconferido **no código** na auditoria de 2026-09-15, não no `status` gravado.

- [x] Existe uma área de conta acessível pelo menu do avatar e pela sidebar, e os itens de "Configurações" deixam de apontar para `#`.
      → `ProfileDropdown.tsx:61-64` (item "minha conta" com `Link` para `/account`);
      `(common)/routes.tsx:41,45,49,53` (os 4 itens de Configurações apontam para `routes.account.*`);
      `(common)/paths.ts:36-57` (as rotas existem de verdade, com rótulo vindo do dicionário).
      **`grep -rn 'url: "#"' apps/` ⇒ 0 ocorrências** — os 8 placeholders morreram.
- [x] O usuário edita os próprios dados de perfil (nome de exibição, telefone) e vê o resultado no cabeçalho sem recarregar.
      → `apps/api/app/(routes)/account/route.ts:107` (`PUT`), `:130-138` (patch de `phone`/`avatar`/`preferences`),
      `:79-83` (`displayName` vai para o Firebase Auth, não para o documento);
      SDK `packages/sdk/src/actions/account/action.ts:25`; o cabeçalho relê por invalidação em
      `account/(hooks)/useAccountMutations.tsx:26-27`, e o `ProfileDropdown.tsx:27,32` lê de `useMyAccount`
      em vez do usuário do Firebase client — que é o que faz o nome trocar sem reload.
- [x] O usuário troca a própria senha informando a senha atual, e a troca encerra as demais sessões.
      → `account/password/route.ts:35` (revalida a senha atual pelo Identity Toolkit **antes** de trocar),
      `:51-53` (troca), `:63` (`revokeUserSessions`, com o porquê escrito em `:61-62`).
- [x] O usuário escolhe tema e idioma, e a escolha **acompanha a conta** — outro navegador, mesma preferência.
      → `(shared)/validation/account.schema.ts:10-19` (`theme`/`locale` validados na borda);
      `account/route.ts:58-66` (merge explícito, porque o Firestore mescla mapa raso e apagaria a metade
      não enviada); projeção no login em `shared/lib/postLoginNavigation.ts:63-78`, **antes** da decisão de
      destino (`:121` roda antes do `?redirect=` lido em `:122`); formulário em
      `AccountPreferencesForm.tsx:64-65,81`.
- [x] O usuário envia uma foto de perfil, validada em tipo e tamanho **no servidor**.
      → `(shared)/validation/file.schema.ts:73-84` (o tipo real vem dos **magic bytes**, não do
      `Content-Type` do cliente), `:123` (tamanho exato do arquivo decodificado), `:99-102` (recusa pelo
      `content-length` antes de carregar o corpo na memória); consumido por `files/route.ts:21`.
      O avatar é amarrado ao dono em `account/route.ts:41` (`isUsablePhotoReference`).
- [x] A API garante que cada um só altera a si mesmo: o guard é de painel comum, não de administrador.
      → as 3 rotas usam `requireCommonPanelApi` (`account/route.ts:97,107`,
      `account/password/route.ts:15`, `account/sessions/revoke/route.ts:4`), e o alvo **sempre** vem do
      token (`ctx.subjectProfile.id`, `route.ts:119`), nunca do corpo. O `.strict()` de
      `account.schema.ts:26-37` transforma um corpo com `id`/`uid`/`type` em falha explícita em vez de
      campo ignorado em silêncio — o comentário em `:21-25` registra que essa é a função do modificador.

**Cobertura:** 11 arquivos de teste nomeados para a feature — 6 na `apps/api` (`accountRoute`,
`accountPasswordRoute`, `accountSchema`, `accountAvatar`, `accountMergedPayload`, `serviceAccountEnv`) e 5
na `apps/app` (`accountFormSchema`, `accountPreferencesForm`, `accountSecurityForm`, `accountApiErrorCopy`,
`profileDropdownAccount`).

### Duas correções de raiz que a entrega trouxe de brinde

Nenhuma das duas está no corte, e as duas valem para **todo** fork:

- **`HookFormSelect` aceitava o valor vazio** que o primitivo emite antes de montar as opções — corrigido
  no componente compartilhado (`hookformSelect.tsx:90`, que só aceita `next` se ele estiver entre as
  opções), não no formulário que expôs o sintoma.
- **Revogar sessão não valia para bearer token**, corrigido em `packages/auth` durante a revisão.
  ⚠️ Isso **não** fecha o furo mais amplo de `account-security-mfa` — ver os achados do backlog.

### Fora do corte

- **Exclusão/anonimização de conta e exportação de dados** — 4/10 e 0/10 na nota, e a armadilha dos registros órfãos torna isso dependente de `billing-subscription` e `file-upload-storage`. Vira `data-rights-lgpd`.
- **Troca de e-mail** (exige verificar o endereço novo) — iteração de `auth-recovery-verification`.
- **Item "Team"** — depende de `teams-organizations`. **Item "Billing"** — é `billing-subscription`; aqui só reservamos o lugar. **Item "Limits"** — depende de metering (2/10 na nota); sugere-se **remover** o placeholder em vez de deixá-lo morto.
- **Lista de sessões/dispositivos ativos** (1/10) — só a ação global "sair de todos" entra.
- **Preferências de notificação por canal** — dependem de uma spec de notificações.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | ações de "meu perfil" (ler/atualizar, trocar senha, encerrar sessões) + campo de preferências no DTO |
| `apps/api` | rotas de auto-serviço sob `requireCommonPanelApi` (`apps/api/app/(guards)/common-panel.ts:29`), com ownership no servidor; recepção e validação do avatar |
| `apps/app` | página de conta com abas (perfil, segurança, preferências); menu do avatar ganha entrada; `routes.tsx` deixa de ter `url: "#"` |
| `apps/web` | N/A |
| `packages/*` | `design-system` já tem o campo de upload (`HookFormImageUpload`), nada a criar; i18n para toda a copy (incluindo a string "Sair" hoje literal) |
| Infra/env | nenhuma novidade: o bucket já está declarado (`firebase.json:6-8`), `storage.rules` existe e `FIREBASE_STORAGE_BUCKET` já está nos env tipados |

## Riscos e trade-offs

- **Custo herdado por todo fork: já não é hipótese, é herança.** O armazenamento de arquivo **entrou** com `file-upload-storage` — bucket declarado, `storage.rules` versionado e **custo por GB/egress** que todo fork passou a carregar, inclusive quem nunca vai mostrar foto. O que muda aqui é o sinal do risco: esta spec não **cria** esse custo, ela **usa** o que já foi pago — `POST /files`, `FileActions`, `useFileUpload` e `HookFormImageUpload` foram feitos genéricos exatamente para isso. Deixar o avatar de fora agora não economiza nada; só desperdiça a peça.
- **Escrita de usuário sem ser admin é novidade no repo.** Toda rota de `users` hoje é `requireAdminApi`; abrir auto-serviço exige ownership espelhado no servidor — UI escondendo botão não protege nada. É o tipo de erro que só aparece em pentest.
- **Preferência persistida × primeira pintura.** Tema e idioma vindos do perfil chegam depois do primeiro render: resolvidos no cliente, dão mismatch de hidratação e "pisca" na tela — a mesma armadilha que a área autenticada já documenta para estado de UI.
- **Upload é vetor de abuso:** validar tipo e tamanho só no cliente é o erro clássico que a nota cita nominalmente.
- **Placeholder morto é dívida ativa.** Manter "Limits" e "Documentation" apontando para `#` depois desta entrega preserva exatamente o problema que ela existe para resolver.

## Sinais de pronto

- Um usuário muda o nome e o vê no cabeçalho e no menu do avatar imediatamente.
- Um usuário troca a senha e a sessão aberta em outro navegador para de valer.
- Um usuário escolhe espanhol, entra de outro dispositivo e o app abre em espanhol.
- Nenhum item de menu da área comum aponta para `#`.
- Tentar alterar o perfil de outra pessoa é recusado pela API, não só escondido na UI; e arquivo grande ou de tipo inválido é recusado pelo servidor com erro traduzido.

## Perguntas em aberto — todas encerradas na entrega

- Preferência de tema/idioma no documento do usuário ou em coleção separada? — **decidido: no próprio
  documento**, como recomendado. `account/route.ts:58-66` reconstrói o mapa inteiro a cada escrita, porque
  o Firestore mescla mapa de forma rasa e apagaria o campo não enviado.
- Trocar a senha exige a senha atual? — **decidido: sim**, como recomendado
  (`account/password/route.ts:35`).
- Manter "Documentation" e "Limits" na sidebar? — **decidido: removidos.** O grupo de Configurações ficou
  com 4 itens reais (perfil, segurança, preferências, cobrança) e o `grep` por `url: "#"` em `apps/` dá
  **zero**. "Billing" aponta para uma aba que reserva o lugar de `billing-subscription`.
- ~~Se `file-upload-storage` não vier antes, entregamos a área sem avatar?~~ — encerrada em 2026-09-14; o
  avatar entrou no corte e foi entregue.

## Deriva — o corte foi entregue como especificado

A auditoria de 2026-09-15 **não encontrou desvio de implementação**: os 6 itens saíram como escritos, nas
camadas previstas em "Impacto por camada". Duas observações honestas, que não mudam o veredito:

- **O caminho feliz do avatar segue não verificado contra infra real.** O Cloud Storage não está ativado no
  projeto de referência, então o que foi exercido foi o **modo degradado** (`POST /files` ⇒ 503 traduzido,
  formulário intacto). Isso é pendência de infra, não reprovação de entrega — a validação de tipo e tamanho,
  que é o que o corte exige, está no servidor e tem teste.
- **Sobrou uma segunda rota de navegação pós-login.** `packages/auth/provider.tsx:80-94` retorna em `:87`
  quando há `?redirect=`, **sem** projetar preferência; quem projeta nesse caso é o resolvedor da `apps/app`
  (`postLoginNavigation.ts:121`, com teste em `postLoginPreferences.test.ts:167`). O contrato do pacote está
  escrito (`provider.tsx:54-55`: só resolve "quando não há `redirect`"), então não é bug — mas são **dois**
  caminhos vivos para o mesmo fato, e o do pacote é o que todo fork herda. Registrado como achado.
