---
id: admin-own-account
title: Área de conta para o admin (perfil, senha e preferências)
status: proposed
value: médio
effort: M
audience: produto
area: [apps/api, apps/app, packages/internationalization]
mode: ambos
depends_on: [app-internal-ux-polish]
contends_on: [apps/api/app/(guards)/common-panel.ts, apps/app/shared/components/ui/ProfileDropdown.tsx, "apps/app/app/[locale]/(authenticated)/(admin)/admin/routes.tsx"]
feature: -
updated: 2026-11-10
---

# Área de conta para o admin (perfil, senha e preferências)

## Problema

O admin de um fork não tem onde cuidar da própria conta. O item "Minha conta" do menu do avatar aparece para
ele, mas o clique leva a `/account`, e o layout do painel comum devolve todo admin que não está personificando
para `/admin`. O admin não troca a própria senha, a não ser saindo e usando "esqueci a senha". Também não
troca o avatar nem guarda tema e idioma no perfil. É a conta com mais poder no produto e a única sem tela de
conta. Um fork que não resolver isso à mão entrega um admin que só muda a senha pelo fluxo de recuperação.

## O que já existe no repo

- `apps/app/shared/components/ui/ProfileDropdown.tsx:65` — "Minha conta" aponta para `/account` para
  qualquer perfil.
- `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:47-52` — admin sem personificação é
  redirecionado para `/{locale}/admin`. É de propósito (o painel comum é do usuário comum) e não deve mudar.
- `apps/app/app/[locale]/(authenticated)/(admin)/admin/routes.tsx:19-33` — o menu do admin tem só Usuários e
  Auditoria; não há entrada de conta.
- `apps/api/app/(guards)/common-panel.ts:77` — todas as rotas de `/account` (`account/route.ts:105`, `:115`,
  `account/password/route.ts:18` e as demais em `apps/api/app/(routes)/account/`) passam por
  `requireCommonPanelApi`, que recusa com `403 COMMON_PANEL_FORBIDDEN` quando o sujeito não é `COMMON`. Mesmo
  com uma tela, o admin não conseguiria salvar nada pela API de hoje.
- `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(components)/UserFormFields.tsx:45-64`
  — pela edição de usuários, o admin consegue mudar o próprio nome de exibição; a senha fica escondida no modo
  de edição (`hidden={mode === "update"}`). Desativar, rebaixar e arquivar a si mesmo são recusados com
  `403 USERS_SELF_LOCKOUT_FORBIDDEN` (tarefa `admin-self-lockout-guard`).
- Peças reaproveitáveis: os formulários de perfil, senha e preferências da conta comum
  (`apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/`), que a spec
  `app-internal-ux-polish` reorganiza em layout de configurações com navegação por seção.
- **Lacuna:** uma área de conta dentro do painel admin e rotas da API que deixem o admin editar o próprio
  perfil, senha e preferências, e só os dele.

## Evidência de mercado

- Nota: [`research/settings-page-patterns.md`](research/settings-page-patterns.md). Ela cobre o formato das
  páginas de configurações (navegação lateral em 4 de 10 referências) e não pesquisa a conta do operador em
  particular. Não houve pesquisa nova para esta spec.
- Nas referências da nota, as configurações de conta são do usuário logado, sem separar quem administra.
  Prevalência de uma área de conta específica para o papel admin: **não confirmado**.
- O argumento principal é interno: o repositório já tem a tela e a API para o usuário comum, e o admin é o
  único perfil sem elas.

## Proposta — corte de MVP

- [ ] **"Minha conta" leva o admin a uma área de conta dentro do painel admin**, no mesmo layout de
      configurações da conta comum, e o menu do admin ganha a entrada correspondente.
- [ ] **O admin edita o próprio perfil** (nome de exibição, telefone, avatar), com as mesmas regras da conta
      comum.
- [ ] **O admin troca a própria senha** pedindo a senha atual, com a mesma política de senha da conta comum.
- [ ] **O admin salva tema e idioma no perfil**, e as preferências valem no painel admin depois de recarregar.
- [ ] **A API aceita o admin só sobre a própria conta.** Um admin não edita a conta de outro por essas rotas,
      e personificar um usuário comum continua levando às rotas e à tela da conta comum.

### Fora do corte

- **Exportar dados e excluir a própria conta.** Excluir o último admin tranca o painel; a regra de
  autoexclusão do admin precisa de decisão própria, alinhada à recusa `USERS_SELF_LOCKOUT_FORBIDDEN`.
- **Sessões ativas, métodos de login e troca de e-mail.** Valem para o admin, mas cada um traz regra e rota
  própria; entram numa iteração seguinte, de preferência junto da fatia 3 de `account-security-mfa`.
- **Cobrança.** O admin não assina plano.
- **Segundo fator obrigatório para admin.** É assunto de `account-security-mfa`.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Provavelmente nenhum recurso novo, se as rotas da conta forem reaproveitadas; o `/analyze` decide entre reaproveitar e expor um recurso de conta do admin. |
| `apps/api` | **Guard novo ou estendido** para "a própria conta", que aceita `ADMIN` e `COMMON` como sujeito sem personificação e recusa qualquer outro sujeito. O `requireCommonPanelApi` segue recusando admin nas rotas do painel comum. Testes de rota para admin editando a si mesmo e para a recusa de editar outro. |
| `apps/app` | Área de conta no painel admin, entrada no menu do admin, "Minha conta" apontando para a área certa conforme o perfil. Reaproveita os formulários e o layout da conta comum. |
| `apps/web` | N/A. |
| `packages/*` | `internationalization`: rótulos do menu e títulos da área no admin, nos três idiomas. |
| Infra/env | Nenhuma. |

## Riscos e trade-offs

- **Autorização é o centro da spec.** Afrouxar o `requireCommonPanelApi` para aceitar admin abriria todas as
  rotas do painel comum ao admin sem personificação. O corte pede o contrário: uma permissão estreita, só para
  as rotas da própria conta, espelhada na API. A regra de painel está em `docs/AUTH-PANEL.md` e precisa ser
  atualizada junto.
- **Depende de `app-internal-ux-polish`.** Sem o layout de configurações, a área do admin nasceria com as
  abas de hoje e seria refeita logo depois.
- **Conflito com `account-security-mfa`.** As duas tocam a seção Segurança e a autorização da conta. Rodam em
  série.
- **Custo herdado pelo fork:** zero em serviço, env e dependência.

## Sinais de pronto

- Logado como admin, "Minha conta" abre a área de conta no painel admin, sem redirecionar para a home.
- O admin troca o nome, o avatar, a senha (com a senha atual) e o tema/idioma, e tudo persiste depois de
  recarregar.
- Uma chamada às rotas da conta do admin com o token de um admin não altera outra conta; um usuário comum
  continua usando a conta comum sem mudança.
- Ao personificar um usuário comum, o admin vê a conta do personificado no painel comum, como hoje.
- Nenhum texto novo fora de `@repo/internationalization`; percorrido no `/test` em claro e escuro, a 375 px e
  a 1280 px, nos três idiomas.

## Perguntas em aberto

- **A área do admin reaproveita as rotas `/account` da API ou ganha rotas próprias?** — **recomendação:**
  reaproveitar, com um guard de "própria conta" que aceite admin, para não duplicar validação e regras de
  senha. O `/analyze` confirma se isso não amplia o acesso das rotas do painel comum.
- **Sessões ativas entram no corte?** — **recomendação:** não; entram com a fatia 3 de
  `account-security-mfa`.
