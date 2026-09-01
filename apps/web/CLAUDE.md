# Web Next (`apps/web`)

Regras de escopo para a landing/CTA pública — marketing, SEO, performance e captação. O Claude carrega este arquivo automaticamente ao trabalhar em `apps/web`. Veja também o [`CLAUDE.md`](../../CLAUDE.md) raiz e o [`AGENTS.md`](../../AGENTS.md).

## Foco

- **Performance e SEO** são requisitos de primeira classe: Server Components por padrão, imagens otimizadas, metadata correta (`@repo/seo`), e o mínimo de JS no cliente. `"use client"` só com estado/eventos/browser API.
- **Acessibilidade e responsividade** mobile-first; breakpoints consistentes com o design system.
- **Tema** light/dark/system via `next-themes` + tokens CSS do design system.

## Dados e API

- Quando precisar de dados da API, use **apenas** `@repo/sdk` (sem `fetch`/axios cru nem URL hardcoded).

## i18n e a11y

- **Não** use strings literais em JSX para textos de interface, placeholders, `aria-label`, confirmações ou toasts. Centralize em `@repo/internationalization` (mesmo padrão de chave em `pt-br`, `en`, `es`) — use a skill `/i18n-sync`.
- Ao guardar uma fatia do dictionary em variável, use **nome descritivo** (`heroSection`, `pricingCopy`, …), nunca `t`/`d`.
- Traduções de marketing da web vivem em `packages/internationalization/translations/apps/web/...`.

## UI

- Preferir componentes de `@repo/design-system` antes de duplicar primitives. Para copy de marketing, use a skill `copywriting`; para direção visual, `frontend-design` / `web-design-guidelines`.

## Testes

- A suíte fica em `apps/web/__tests__/`, roda com `pnpm --filter web test` e usa `environment: "node"`
  (`vitest.config.mts`) — **sem jsdom e sem plugin do React**. É suíte de lógica pura: helpers de SEO,
  metadata, sitemap. Componente renderizado é validado com `agent-browser`, não aqui.
- Os aliases `@` e `@repo` estão declarados no `vitest.config.mts`; um import novo que fuja desses dois
  prefixos precisa de alias próprio.
- ⚠️ `turbo build` depende de `test`, então teste quebrado **bloqueia o build da web**. Mantenha a suíte
  determinística e sem rede.
- Não congele em teste as strings pt-br literais de `app/[locale]/sign-{in,up}/validations/`: elas são um
  bug de i18n em aberto, e testá-las travaria o defeito em vez de expô-lo. O padrão do repo é a factory
  `buildXFormSchema(dictionary)`.

## Validação visual

- Toda mudança de UI/fluxo deve ser validada com a skill **`agent-browser`** antes de concluir (ver regra de ouro 11 no `CLAUDE.md` raiz), checando responsivo, tema e estados.
