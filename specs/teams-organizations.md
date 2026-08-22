---
id: teams-organizations
title: Organizações, membros e convites
status: proposed
value: alto
effort: G
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/auth, packages/internationalization]
mode: ambos
depends_on: [transactional-emails]
feature: -
updated: 2026-08-21
---

# Organizações, membros e convites

## Problema

Este boilerplate só sabe pensar em **uma pessoa por vez**. Não existe conceito de organização, workspace,
membro ou convite: cada usuário vê apenas o que ele mesmo criou, e não há como duas pessoas
compartilharem um registro. Qualquer fork B2B — que é a maioria dos SaaS pagos — bate nessa parede na
primeira conversa com o cliente.

O ponto desta spec não é a funcionalidade: **é uma decisão de arquitetura de produto, não uma feature de
backlog**. Toda consulta, toda regra de posse e todo documento gravado hoje assumem que o dono é um
usuário. Introduzir organização depois não é acrescentar uma tela, é reescrever a chave de escopo de todo
recurso que existir até lá. Adiar a *implementação* é legítimo; adiar a *decisão* é o que sai caro.

## O que já existe no repo

- **Zero ocorrências** de `organizationId`, `workspace`, `tenant`, `membership` ou `invite` em `apps/` e
  `packages/`. A única palavra "organization" no repo é `packages/seo/schema.ts:6`
  (`organizationSchema`), que é marcação schema.org da landing — nada a ver.
- `packages/sdk/src/types/user/user.ts:2` — `UserType` tem exatamente dois valores: `ADMIN` e `COMMON`.
  O papel é **global**, não relativo a um grupo.
- `packages/auth/types.ts:4` — `UserRoleLevel` espelha o mesmo par, e `canSwitchPanelEnvironment`
  (`:27`) trata `ADMIN` como papel de plataforma.
- `apps/api/app/(guards)/` — três arquivos: `auth.ts`, `admin.ts` (`requireAdminApi`, `:30`) e
  `common-panel.ts` (`requireCommonPanelApi`, `:28`). Nenhum resolve "pertence a este grupo".
- **A posse é por usuário, repetida em cada handler**:
  `apps/api/app/(routes)/entities/[id]/route.ts:16`, `:32` e `:65` — o mesmo
  `row.userId !== ctx.subjectProfile.id` → 404, três vezes, num único arquivo de um único recurso.
- `apps/api/(shared)/repositories/entity.repository.ts:12` — `listByUserId` consulta com
  `where("userId", "==", userId)`. A listagem é escopada por usuário na origem.
- `firestore.rules:30` — negação total de acesso direto de cliente; o comentário em `:37` já registra a
  sutileza de que `entity.userId` guarda o **id do documento de perfil**, não o UID do Firebase Auth.
- **Lacuna:** não existe grupo, não existe papel dentro de grupo, não existe convite. E o escopo por
  usuário está espalhado por handler, repositório e (potencialmente) regras — três lugares para
  retrofitar por recurso.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- Prevalência: **6 de 10** starters entregam times/organizações; **5 de 10** entregam convites + RBAC.
  Valor **alto (B2B)**, esforço **G** nos dois casos.
- A nota é categórica: organizações são "o eixo que separa B2B de B2C e a decisão **mais cara de
  postergar**: retrofitar `organizationId` em todas as queries e regras é **reescrita, não refactor**".
- Armadilha nomeada: **isolamento só no cliente**, sem regra/guard espelhado no servidor.
- Armadilhas de convite/RBAC nomeadas: convite para e-mail já cadastrado, expiração de token, e deixar o
  **último owner sair** da organização.
- Custo herdado, segundo a nota: "alto e permanente — muda o modelo de dados de **todo** recurso,
  **inclusive nos forks B2C que não usam times**".

## Proposta — corte de MVP

Corte deliberadamente mínimo: o objetivo é **fixar a chave de escopo** e provar o isolamento
ponta a ponta, não entregar administração de times completa.

- [ ] Todo usuário passa a pertencer a uma organização — criada automaticamente no cadastro, de modo que
      o fork B2C nunca precise ver a palavra "organização" na interface.
- [ ] O escopo dos recursos deixa de ser o usuário e passa a ser a organização: no slice `entity`, a
      listagem e a checagem de posse (`entities/[id]/route.ts:16`) passam a decidir por grupo, com o
      isolamento verificado **no servidor**.
- [ ] Dois papéis dentro da organização (dono e membro), independentes do `UserType` global, resolvidos
      por um guard próprio — o `admin`/`common` atual continua sendo papel de **plataforma**.
- [ ] Convidar por e-mail, aceitar e listar membros, com convite **expirável** e tratamento de convite
      para e-mail já cadastrado.
- [ ] Remover membro, com a garantia de que a organização nunca fica sem dono.

### Fora do corte

- Trocador de organização na interface e usuário em várias organizações ao mesmo tempo — só depois que
  o escopo único estiver sólido.
- RBAC com permissões granulares por recurso; dois papéis bastam para provar o modelo.
- Cobrança por organização/assento — depende de `billing-subscription` e muda o modelo de assinatura.
- Transferência de propriedade, domínios verificados, SSO e SCIM — a nota registra SSO enterprise/SCIM
  em **0/10**, território de contrato enterprise.
- Registro de quem fez o quê dentro da organização — pertence a `audit-log`.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Recurso novo (organização, membros, convites) **e** mudança de contrato em todo recurso escopado. |
| `apps/api` | Guard de pertencimento novo; coleções novas; **toda consulta e toda checagem de posse existente muda de chave**. Convite exige envio de e-mail. |
| `apps/app` | Telas de membros e convites; aceite de convite (rota parcialmente pública); o painel admin ganha a dimensão "organização". |
| `apps/web` | Página de aceite de convite para quem ainda não tem conta, se o aceite não viver no `app`. |
| `packages/*` | `auth`: papel por organização convive com `UserRoleLevel` global. `email`: template de convite. i18n nos 3 idiomas. |
| Infra/env | Índices compostos no Firestore (escopo + filtro) para toda consulta escopada; `firestore.rules` reescritas se algum dia expuser cliente direto. Nenhum serviço pago novo além do envio de e-mail. |

## Riscos e trade-offs

- **Custo permanente no modelo de dados de TODO recurso, inclusive em forks B2C.** Isto não é um risco
  contornável, é o preço da decisão: depois de adotada, cada recurso novo carrega a chave de escopo,
  cada consulta ganha um filtro, cada índice ganha um campo. Um fork B2C paga a complexidade sem usar a
  funcionalidade. O único jeito de baratear é a organização implícita (criada sozinha, invisível na UI),
  que esconde o custo do usuário final — não do desenvolvedor.
- **O risco simétrico é maior.** Não adotar significa que o primeiro fork B2B reescreve o escopo de todo
  recurso já construído, mais os índices, mais as regras — em código que já está em produção. A nota de
  pesquisa chama isso de reescrita, e a evidência local confirma: o predicado de posse já aparece três
  vezes num único arquivo (`entities/[id]/route.ts:16`, `:32`, `:65`) para **um** recurso, com **dois**
  recursos no repo. Esse número só cresce.
- **Vazamento entre organizações é a falha crítica.** Uma consulta sem o filtro de escopo entrega dado de
  outro cliente, e com a autorização espalhada por handler basta um handler novo esquecer. Isso empurra
  para um ponto único de escopo no acesso a dados — decisão que precisa ser tomada junto, não depois.
- **Migração de forks existentes.** Qualquer fork já rodando precisa de retrocarga: criar a organização
  de cada usuário e reescrever o dono de cada documento. Sem plano, é indisponibilidade.
- **Dois eixos de papel confundem.** `UserType` global (plataforma) e papel dentro da organização são
  coisas diferentes; misturá-los produz escalada de privilégio silenciosa. A distinção tem de estar no
  guard, não na convenção.

## Sinais de pronto

- Dois usuários de organizações diferentes não enxergam os registros um do outro, **nem chamando a API
  diretamente** com id conhecido — a resposta é 404, não 403 disfarçado de lista vazia.
- Um usuário comum de um fork B2C usa o produto inteiro sem ver a palavra "organização".
- Um convite chega por e-mail, expira, e um convite para e-mail já cadastrado não cria conta duplicada.
- A organização nunca fica sem dono, mesmo com o dono tentando sair.
- O papel dentro da organização não concede nada no painel admin de plataforma, e vice-versa.

## Perguntas em aberto

- **Esta spec entra na fila agora (`approved`) ou fica `deferred` com motivo?** — **recomendação:**
  **`deferred` para a implementação, com a decisão de modelo tomada agora**. O boilerplate tem hoje dois
  recursos escopados; adotar organizações antes de existirem `billing-subscription`, `account-settings` e
  o resto do backlog de produto é pagar esforço **G** para proteger uma superfície pequena. Mas o
  `deferred` só é honesto se vier acompanhado de duas coisas baratas e imediatas: (1) decidir e escrever
  se este core é B2B ou B2C por padrão, e (2) parar de espalhar o predicado de posse por handler,
  concentrando-o num único ponto — que é exatamente o que torna o retrofit viável depois. Sem essas duas,
  `deferred` é só adiar a conta com juros.
- Organização implícita (uma por usuário, invisível) ou explícita desde o início? — **recomendação:**
  implícita; é o que permite ao fork B2C ignorar o recurso e ao B2B ligá-lo sem migrar dados.
- Um usuário pode pertencer a várias organizações no primeiro corte? — **recomendação:** não. Múltiplo
  pertencimento traz trocador de contexto, escopo de sessão e cache por organização — é outra spec.
- O aceite de convite vive no `app` ou no `web`? — **recomendação:** no `app`, com a rota de aceite como
  caminho público autorizado pelo token do convite, para não duplicar sessão em dois domínios.
