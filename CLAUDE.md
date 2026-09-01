# CLAUDE.md

Guia de entrada para o Claude Code neste repositório. **Curto de propósito**: este arquivo é sempre carregado (regras de ouro + mapa). As regras **por escopo** ficam em `CLAUDE.md` aninhados (`apps/api`, `apps/app`, `apps/web`, `packages`), que o Claude carrega automaticamente ao trabalhar naquela árvore. Os padrões detalhados (incl. design system/RHF) vivem em [`AGENTS.md`](AGENTS.md).

## O que é este repo

Monorepo **boilerplate full-stack** (fork customizado do next-forge) feito para gerar **vários forks de MVPs**. A regra mestra: **genérico no pacote, específico no app**. Não coloque domínio de um produto único dentro de `packages/*` (exceto pacotes de integração: `auth`, `email`, `payments`).

**Anti-padrões a evitar** (sempre): URL da API hardcoded fora do SDK/env tipado; texto de UI solto sem passar pelo sistema de traduções; lógica de autorização só no cliente (espelhe na API). Nomes de código em inglês; mudanças mínimas (não refatore fora da tarefa); respeite Biome/Ultracite (`pnpm check`/`pnpm fix`).

Stack: Turborepo + pnpm + Next.js (App Router) · Firebase (Auth + Firestore) · Stripe · Resend · i18n próprio · Biome/Ultracite · Vitest. Tudo escolhido para **começar de graça e escalar** (Vercel/Firebase/free tiers). Visão completa: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Mapa do repositório

| App | Caminho | Porta | Papel |
|-----|---------|-------|-------|
| `app` | `apps/app` | 3000 | Aplicação do usuário: dashboard, cadastro, **área admin** com impersonação. |
| `web` | `apps/web` | 3001 | Landing/CTA: marketing, SEO, performance, captação. |
| `api` | `apps/api` | 3002 | API HTTP (Next no servidor): guards → repositórios Firestore → DTOs. |
| `email` | `apps/email` | 3003 | Preview/dev dos templates de e-mail (React Email). |

| Package | O que é |
|---------|---------|
| `@repo/sdk` | **Fachada** de chamada à API (axios). O front nunca usa `fetch`/axios direto. |
| `@repo/design-system` | UI compartilhada (shadcn), tema, componentes `HookForm*` (RHF). |
| `@repo/internationalization` | Dicionário pt-br/en/es (sem terceiros). |
| `@repo/auth` | Firebase (Admin no server, client SDK), API estilo Clerk. |
| `@repo/payments` | Stripe (checkout, webhooks, planos). |
| `@repo/email` | Templates + envio via Resend. |
| `@repo/shared` | Utils transversais (`HTTP_STATUS`, `FormattedError`, mappers de data, etc.). |
| `@repo/analytics` · `@repo/security` · `@repo/seo` · `@repo/next-config` · `@repo/typescript-config` | Integrações e config compartilhadas. |

O que **ainda falta** no core está catalogado em [`specs/`](specs/README.md) — backlog de funcionalidades com evidência de mercado e status auditado contra o código.

## Comandos essenciais

```bash
pnpm dev            # sobe todos os apps via turbo (3000/3001/3002/3003)
pnpm --filter app dev   # sobe só um app (app | web | api | email)
pnpm check          # lint/format check (Biome fixado no lockfile) — rode antes de finalizar
pnpm fix            # auto-fix de lint/format
pnpm test           # Vitest em todos os workspaces (turbo)
pnpm build          # build de produção (turbo; depende de test)
pnpm --filter app typecheck   # tsc --noEmit de um workspace
pnpm bump-ui        # re-sincroniza componentes shadcn no design-system

pnpm turbo run lint typecheck test   # os 3 gates de uma vez — é o comando que o CI roda
```

`lint`, `typecheck` e `test` são tasks do turbo: cacheadas, paralelas e com `env: []` (herméticas em
relação a variáveis de ambiente). `lint` é task da **raiz** (`//#lint`) porque o Biome varre o repositório
inteiro a partir de um único `biome.jsonc`. **O CI roda exatamente essa linha** — se passa no seu terminal,
passa no GitHub Actions. O pipeline está em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) e
descrito em [`docs/SETUP.md`](docs/SETUP.md).

Node `22.12.0` (ver `.nvmrc`), pnpm `10.19.0`. A API roda webhooks da Stripe localmente com `pnpm --filter api dev:with-stripe`.

## Regras de ouro (o essencial — detalhes nas cursor rules)

1. **SDK é a única porta para a API.** No front, chame `apiClient.<recurso>.<ação>()` (de `@/shared/lib/client`), nunca `fetch`/axios cru nem URL hardcoded.
2. **Nada de string de UI solta.** Todo texto visível (labels, placeholders, `aria-label`, toasts, colunas, confirmações) vem do dictionary `@repo/internationalization`. Use a skill [`/i18n-sync`](.claude/skills/i18n-sync/SKILL.md) para manter pt-br/en/es em paridade.
3. **Erros de API por código.** A API responde `{ error: { code: "FOO_BAR" } }`; o app mapeia `code` → texto via `apiErrors` (`translations/packages/shared/utils.ts`) + `FormattedError`/`handleClientError`. Nunca vaze stack trace como copy.
4. **Autorização espelhada na API.** Guards no servidor sempre (`requireCommonPanelApi`/`requireAdminApi`); UI oculta nunca é a única proteção.
5. **Firestore via repositório + mapper.** Estenda `BaseRepository<DTO>` e passe o mapper no `super` (`super(db, "tabela", mapper)`); normalize `Timestamp`→ISO no mapper, não no handler.
6. **Validação na borda da API** com Zod (`parseCreateX`/`parseUpdateX`) + helpers `parseRequestJson`, `omitUndefined`, `resolveIdFromContext`.
7. **Formulários e tabelas** usam os componentes compartilhados: `HookFormInput/Textarea/Select/Switch/DateInput/RadioGroup` e `Table` (com `searchFields`/`onRefresh`) do `@repo/design-system`; `Container`, `FormContainer` e `Footer` de `apps/app/shared/components/ui/`. Prop de erro é `error`, nunca `errorMessage`. Não reinvente primitivos.
8. **Hooks de dados**: listas `useListX` + `fetchXList`; por id `useFindXById` + `findXById` no mesmo arquivo, com `enabled` coerente. Toggle de `enabled` só faz `setQueryData` (sem `invalidateQueries`).
9. **Nomes de arquivo (apps/app)**: módulos de feature em camelCase (`userFormFields.tsx`); componente React exportado em PascalCase. Variáveis de dictionary com nome descritivo (nunca `t`/`d`).
10. **Mudanças mínimas + Server Components por padrão.** `"use client"` só com estado/eventos/browser API. Não refatore arquivos fora da tarefa. Rode `pnpm check` antes de concluir.
11. **Validação visual em front-end.** Todo fluxo que toca UI/layout (`apps/app`, `apps/web`, `packages/design-system`) **e** toda entrega de código devem ser validados visualmente com a skill **`agent-browser`** (suba o app, percorra o fluxo, tire screenshots, cheque responsivo + tema). Front-end não é "pronto" sem isso.

**Referência viva**: o CRUD de exemplo `entity` cobre o slice inteiro de ponta a ponta — use como template:
- API: `apps/api/app/(routes)/entities/`, `apps/api/(shared)/repositories/entity.repository.ts`, `.../mappers/entity.mapper.ts`, `.../validation/entity.schema.ts`
- SDK: `packages/sdk/src/actions/entity/action.ts`, tipos em `packages/sdk/src/types`
- App: `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/`
- i18n: `packages/internationalization/translations/apps/app/pages/common/entities.ts`

## Onde olhar antes de codar

> As regras por escopo são `CLAUDE.md` aninhados — **carregados automaticamente** quando o Claude trabalha naquela pasta. Você não precisa abrir manualmente; estão listados aqui só para referência.

| Vai mexer em… | Regras (auto-carregadas) |
|---------------|------|
| `apps/app` (rotas, UI, hooks) | [`apps/app/CLAUDE.md`](apps/app/CLAUDE.md) |
| `apps/web` (landing, SEO) | [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) |
| `apps/api` (rotas, guards, repos) | [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) |
| `packages/*` | [`packages/CLAUDE.md`](packages/CLAUDE.md) |
| Design system / formulários RHF | seção "Design system — inputs e formulários" em [`AGENTS.md`](AGENTS.md) |
| Revisar um diff | [`docs/review-checklist.md`](docs/review-checklist.md) (fonte única das invariantes) |
| Planejar/analisar uma tarefa | [`docs/feature-analysis-guide.md`](docs/feature-analysis-guide.md) |
| Decidir **o que** construir | [`specs/README.md`](specs/README.md) + [`specs/BACKLOG.md`](specs/BACKLOG.md) (backlog de funcionalidades) |
| Qualquer coisa | este `CLAUDE.md` (sempre carregado) + `.claude/rules/*` |

## Trabalhando com IA neste repo

Hub do ferramental: [`docs/AI-WORKFLOW.md`](docs/AI-WORKFLOW.md).

### Pipeline de tarefas — [`docs/TASK-PIPELINE.md`](docs/TASK-PIPELINE.md)

```
/spec  →  /analyze  →  /develop  →  /review  →  /test     (+ opcionais: /observe · /mediate)
descobrir  planejar     implementar   revisar     QA
   ↑                                                └── /spec --sync fecha o ciclo
```

O ciclo começa no **backlog de funcionalidades** ([`specs/`](specs/README.md)): o `/spec` varre o repo,
confronta com padrões de mercado e escreve as specs; você aprova uma e roda **`/analyze <nome-da-spec>`**
(o nome da spec é o argumento padrão). No fim, `/spec --sync` audita o backlog contra o código — é isso que
faz disso um **loop**, e não uma lista de desejos. Spec responde *o quê/por quê*; o plano do `/analyze`
responde *como*. **`specs/` contém só o que não foi entregue**; o ciclo de vida completo está em
[`specs/README.md`](specs/README.md).

Cada comando roda no loop principal (pergunta antes de decidir) e aciona um subagent
(`estrategista-produto`, `planejador-tarefa`, `desenvolvedor`, `revisor-codigo`, `analista-qa`). O estado da tarefa vive em
`docs/features/<slug>/` (versionado — é o histórico de como a feature foi construída): `STATE.md` é o gate,
e cada etapa deixa um handoff conciso para a seguinte. Gate sequencial com bypass via `--force`.

Apoio: [`docs/feature-analysis-guide.md`](docs/feature-analysis-guide.md) (roteiro de análise + formato dos
critérios de aceite) · [`docs/review-checklist.md`](docs/review-checklist.md) (**fonte única** do que a
revisão cobra) · [`docs/GLOSSARY.md`](docs/GLOSSARY.md) (vocabulário do boilerplate).

Regras sempre em contexto: [`.claude/rules/git-commits.md`](.claude/rules/git-commits.md) (⛔ nunca commitar
em `main`/`production`; só o `revisor-codigo` cria branch; push só com seu "sim") e
[`.claude/rules/code-comments.md`](.claude/rules/code-comments.md) (o padrão é **não** comentar; nunca citar
os artefatos do fluxo no código).

### Skills do projeto (digite `/` para invocar)

- **`/market-research`** — pesquisa de mercado **com fontes** para decidir se uma feature merece entrar no core (prevalência entre starters, exigência de provedor/lei, custo herdado pelos forks); grava nota citável em `specs/research/`.
- **`/spec-audit`** — reconcilia o backlog `specs/` com a realidade do código (fecha o loop; é o motor do `/spec --sync`).
- **`/new-crud`** — scaffold de um CRUD vertical completo (SDK → API → app → i18n), seguindo o padrão `entity`.
- **`/new-api-route`** — cria rota na `apps/api` (validação, guard, repo+mapper, `error.code`).
- **`/i18n-sync`** — adiciona/valida chaves nos 3 idiomas + `apiErrors` (com teste de paridade determinístico).
- **`/payments-flow`** — fluxo de assinatura Stripe (planos, checkout, portal, webhook). Ver [`docs/PAYMENTS.md`](docs/PAYMENTS.md).
- **`/write-tests`** — testes Vitest (schema, mapper, rota, hook, componente) no setup do repo.
- **`agent-browser`** — automação de browser para **validar layouts e fluxos** (QA/dogfooding). **Obrigatório** em fluxos de front-end e antes de entregas (ver regra de ouro 11).
- **`vercel-react-best-practices`** — guia de performance React/Next (auto-aciona ao escrever/refatorar componentes, data fetching, bundle).
- **`frontend-design`** — direção de design visual ao criar/reformular UI (útil principalmente na `apps/web`).
- **`web-design-guidelines`** — revisão de UI contra guidelines de interface/acessibilidade.
- **`copywriting`** — copy de marketing (landing/CTA da `apps/web`).
- **`brainstorming`** — explora intenção/requisitos e gera o design **antes** de implementar (gate de aprovação para features/componentes novos).
- **`ui-ux-pro-max`** — base de design UI/UX (estilos, paletas, tipografia, guidelines) ao criar/refatorar telas.
- **`seo-audit`** — auditoria de SEO técnico/on-page (útil na `apps/web`).
- **`ai-seo`** — otimização de conteúdo para AI search / citação por LLMs (AEO/GEO), na `apps/web`.
- Agente **`code-reviewer`** — revisão **read-only** avulsa, afinada às convenções deste repo, **com validação visual via `agent-browser`** em diffs de front-end (peça "revise o diff"). Aplica o mesmo checklist do `revisor-codigo`, mas não edita arquivos nem toca na branch.
- Skills globais úteis: `/code-review`, `/security-review`, `/verify`.
