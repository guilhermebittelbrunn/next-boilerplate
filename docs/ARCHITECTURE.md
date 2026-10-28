# Arquitetura

Visão de sistema do boilerplate. Este documento explica **como as peças se conectam**; as convenções de implementação ficam em [`AGENTS.md`](../AGENTS.md) e nos `CLAUDE.md` aninhados por escopo (`apps/*/CLAUDE.md`, `packages/CLAUDE.md`), com o mapa rápido em [`CLAUDE.md`](../CLAUDE.md).

## Propósito

Monorepo **boilerplate full-stack** (fork customizado do [next-forge](https://github.com/vercel/next-forge)) para gerar **vários forks de MVPs**. Princípio mestre: **genérico no pacote, específico no app** — `packages/*` carrega infraestrutura reutilizável; o domínio de cada produto vive em `apps/*`. Toda a stack é escolhida para **começar de graça e escalar** (Vercel, Firebase, free tiers).

> ⚠️ **Uma exceção, e só uma:** ligar o **upload de arquivo** exige o plano **Blaze** do Firebase (cartão de
> crédito) — o Cloud Storage deixou de existir no plano Spark em 2026-02-03. O gasto real continua
> **$0,00/mês** num MVP, e um fork que **não** usa upload segue inteiramente no Spark, sem cartão: a
> capacidade é opt-in por env. Comparativo com S3/R2, cenários e números em
> [`specs/research/object-storage-costs.md`](../specs/research/object-storage-costs.md); ativação em
> [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §6.

## Topologia

```
┌─────────────┐   ┌─────────────┐        Monorepo (Turborepo + pnpm)
│  apps/web   │   │  apps/app   │
│  (CTA/SEO)  │   │ (dashboard, │
│   :3001     │   │   admin)    │
└──────┬──────┘   │   :3000     │
       │          └──────┬──────┘
       │  @repo/sdk      │  @repo/sdk         apps/email :3003
       │  (axios facade) │                    (preview React Email)
       └────────┬────────┘
                ▼
         ┌─────────────┐   guards → repositórios → mappers
         │  apps/api   │ ─────────────────────────────────►  Firestore
         │   :3002     │   (@repo/auth verifica o token Firebase)
         └─────────────┘ ──► Stripe (webhooks) · Resend (e-mail)
```

- **`apps/web`** — landing/CTA pública: marketing, SEO, pricing, FAQ, contato. Foco em performance e acessibilidade.
- **`apps/app`** — aplicação do usuário autenticado: dashboard, cadastro, assinaturas e **área admin** (gestão de usuários + impersonação).
- **`apps/api`** — API HTTP em Next no servidor. Orquestra HTTP, valida na borda, aplica guards e fala com o Firestore. É o único ponto que toca persistência.
- **`apps/email`** — ambiente de dev/preview dos templates (`@repo/email`).

## Fluxo de dados (front → API → Firestore)

1. O front **nunca** chama a API direto. Usa o `apiClient` (`apps/app/shared/lib/client.ts`), instância de `Client` do `@repo/sdk`.
2. O `Client` (axios) tem uma **action por recurso** (`apiClient.entity.list()`, `.create(body)`, …) e injeta headers de contexto de auth (`BaseClient.setAuthRequestContext`): `userId`, `requestUserId`, `userRole`, `x-role`.
3. Na `apps/api`, o handler é embrulhado por um **guard** (`requireCommonPanelApi` / `requireOrganizationApi` / `requireAdminApi`) que:
   - valida o `Authorization: Bearer <token>` via `@repo/auth/server` (`getCurrentUser` → Firebase Admin `verifyIdToken`),
   - resolve o perfil Firestore do ator e o **subject** (titular ou usuário personificado),
   - injeta `ctx.subjectProfile`, `ctx.authRequest` no handler.
4. O handler **valida o input** (Zod, `parseCreateX`/`parseUpdateX`), monta o patch (`omitUndefined`), resolve `[id]` (`resolveIdFromContext`) e chama o **repositório**.
5. O **repositório** estende `BaseRepository<DTO>` (Firestore) e usa um **mapper** para normalizar (`Timestamp`→ISO, opcionais) entre o documento persistido e o `DTO` exposto pelo `@repo/sdk`. Soft delete via `deletedAt`.
6. A resposta volta como `{ data }` ou, em erro, `{ error: { code } }` com status HTTP correto.

> Não há camada "domain" separada: a `Entity` é o documento Firestore + `id`; o `DTO` é o tipo do `@repo/sdk`. Repositórios simples (ex.: `user`) dispensam mapper.

## Autenticação e impersonação (admin)

- **Provider**: Firebase. No servidor, `@repo/auth/server` inicializa o Admin SDK (`FIREBASE_ADMIN_*`) e expõe uma API estilo Clerk (`auth()`, `currentUser()`, `getCurrentUser(token)`). O token vem do cookie `access-token`.
- **Admin impersona usuário comum**: o SDK carrega `requestUserId`/`x-role` e o guard `requireCommonPanelApi` resolve o `subjectProfile` como o usuário personificado. Ao trocar o usuário em `PanelNavbarControls`, o `setImpersonatedUser` grava os cookies e chama `router.refresh()`: os Server Components rodam de novo com o novo sujeito, sem recarregar a página.
- **Regra**: autorização é **sempre** repetida no servidor (guards). UI oculta nunca é a única proteção.

## Escopo de dados: organização

O core é B2C na interface e B2B no modelo de dados. Toda conta comum pertence a uma organização, criada no
cadastro (`createDefaultUserProfile`) ou, para quem já existia, no primeiro pedido a uma rota escopada. Um fork B2C
nunca vê essa organização: ela tem um dono só, a própria pessoa, e nenhuma tela fala dela enquanto
`NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` estiver vazia.

- **Coleções.** `organization` guarda o dono atual (`ownerUserId`), que muda quando ele transfere a propriedade. Uma
  pessoa pode ser dona de mais de uma organização: a de casa e as que recebeu. A casa para onde ela volta ao sair de
  uma equipe é a mais antiga delas. `organizationMember/{profileId}` é o vínculo: o id do
  documento é o id do perfil, então cada pessoa está em uma organização por vez e o guard lê o vínculo por id. Os dois
  documentos nascem num lote com `create()`, e pedidos simultâneos terminam com uma organização só.
- **Recurso da organização × recurso da pessoa.** Dado de negócio pertence à organização: o documento grava
  `organizationId` (o escopo) e `userId` (quem criou, sem efeito sobre acesso). É o caso de `entity` e das fotos dele,
  guardadas em `uploads/org-<organizationId>/`. Notificações, sessões, avatar e preferências continuam da pessoa,
  filtrados pelo id do perfil, com o avatar em `uploads/<profileId>/`.
- **Onde o escopo é decidido.** No guard `requireOrganizationApi` (`apps/api/app/(guards)/organization.ts`), que
  resolve a organização do sujeito e a entrega em `ctx.organization`, e no repositório, num helper privado
  (`inOrganization`, `findInOrganization`). Um handler repassa `ctx.organization.organizationId` e responde 404 ao
  `null`; ele nunca compara ids por conta própria.
- **Dois eixos de papel.** `UserType` (`admin`/`common`) é papel de plataforma. `organizationMember.role`
  (`owner`/`member`) é papel dentro da organização. O `requireAdminApi` olha só o perfil e o `requireOrganizationApi`
  olha só o vínculo. O vínculo de um admin de plataforma nunca é lido, porque ele só alcança o painel comum
  personificando alguém, e aí vale a organização do personificado. Quem é promovido a admin guarda o vínculo antigo,
  sem efeito.
- **Registros de antes das organizações.** O primeiro pedido de cada pessoa carimba com a organização de casa os
  `entity` dela que ainda não têm `organizationId`, sem mexer em `updatedAt`. A migração é idempotente e não precisa de
  script nem de janela de manutenção.
- **Membros e convites (B2B).** Com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED="true"` na `api` e na `app`, o dono
  convida por e-mail (`organizationInvitation`, um documento por organização e endereço, só o hash do token,
  7 dias, uso único), o convidado aceita em `/invite` com uma conta do mesmo e-mail e passa a membro. O dono
  remove membros e o membro sai, voltando à organização de casa. O dono também transfere a propriedade a um membro
  com perfil vivo (`POST /organization/members/:id/ownership`): numa transação, `ownerUserId` e os dois papéis
  trocam, e o antigo dono continua na equipe como membro. Quem transferiu fica sem organização de casa; se sair,
  ganha uma nova e vazia. Sem a variável, as rotas `/organization/*` e
  `/invitations/*` respondem `404 ORGANIZATION_MEMBERS_DISABLED` antes de autenticar.

Recurso novo de negócio nasce escopado por organização, como `entity`. Recurso que descreve a pessoa, como
`notification`, continua escopado pelo perfil.

## Internacionalização

- Pacote próprio `@repo/internationalization`, **sem serviço de terceiros**. Idiomas: `pt-br`, `en`, `es`.
- Dicionário composto por arquivos-folha (cada um com as 3 chaves de idioma) que sobem por `index.ts` até `translations/global.ts`.
- No servidor, `getDictionary()` de `@repo/internationalization/server` resolve o locale pelo segmento `[locale]` da URL, que os proxies de `apps/app` e `apps/web` repassam no header de requisição `x-request-locale`, sobrescrevendo o valor que o navegador tenha mandado. Sem header válido, cai no cookie `x-locale` e depois no padrão. Rota fora do `matcher` do proxy (`/api/*`, `_next/*`) recebe o header como o navegador mandou; como `getDictionary()` só aceita um dos três idiomas, um valor forjado escolhe no máximo o idioma da própria resposta (é o caso do 404 de `/api/inexistente` na app). O cookie continua sendo gravado pelos proxies, mas só chega na requisição seguinte. No client, `getDictionary()` segue o segmento `[locale]` da URL por meio do `LocaleProvider`, montado nos root layouts de `apps/app` e `apps/web`, e usa o cookie só em árvore sem provider. Os dois aplicam fallback/default.
- Erros de API: a API responde `error.code` estável; o app traduz via `apiErrors` (`translations/packages/shared/utils.ts`) + `FormattedError`/`handleClientError`.

## UI, tema e responsividade

- **`@repo/design-system`**: componentes shadcn + tokens CSS + `next-themes` (light/dark/system). Componentes `HookForm*` ligam os primitivos ao React Hook Form.
- **Tema configurável por CSS**: as cores da identidade ficam em tokens; mudar o tema do fork é editar variáveis CSS, que propagam para todos os componentes.
- **Responsivo mobile-first**, breakpoints consistentes com o design system.

## Pagamentos

- **`@repo/payments`** encapsula a Stripe (planos, checkout, portal). A `apps/api` expõe `(routes)/webhooks/payments/route.ts`; em dev, `pnpm --filter api dev:with-stripe` encaminha eventos via Stripe CLI.

## Build, deploy e tooling

- **Turborepo** orquestra `dev`/`build`/`test`/`analyze` (`turbo.json`); `build` depende de `test`.
- **pnpm workspaces** (`apps/*`, `packages/*`); `public-hoist-pattern[]=*` no `.npmrc` para resolução estável de libs no IDE.
- **Biome/Ultracite** para lint/format (`pnpm check` / `pnpm fix`); **Vitest** para testes.
- **Deploy**: cada app é independente e pensado para a **Vercel**; a API também roda lá (Next no servidor) — ver `vercel.json` de cada app.

## Onde cada coisa vive

| Camada | Caminho | Papel |
|--------|---------|-------|
| Fachada HTTP | `packages/sdk` | Única porta do front para a API. |
| UI + tema | `packages/design-system` | Componentes genéricos, dark mode, RHF. |
| Traduções | `packages/internationalization` | pt-br/en/es, chaves estáveis. |
| Auth | `packages/auth` | Firebase Admin + client, API estilo Clerk. |
| Pagamentos | `packages/payments` | Stripe. |
| E-mail | `packages/email` | Templates + Resend. |
| Utils transversais | `packages/shared` | `HTTP_STATUS`, `FormattedError`, mappers de data. |
| Config compartilhada | `packages/next-config`, `packages/typescript-config` | Next/TS base. |
| Integrações | `packages/analytics`, `packages/security`, `packages/seo` | Analytics, Arcjet, SEO. |
