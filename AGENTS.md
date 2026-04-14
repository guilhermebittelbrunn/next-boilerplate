# Orientação para agentes (IA e contribuidores)

Este repositório é um **boilerplate full stack** em monorepo (`pnpm` + `turbo`). Forks devem manter o mesmo padrão arquitetural; evite regras de negócio ou domínio único dentro de pacotes compartilhados.

## Onde vive cada coisa

| Área | Caminho | Papel |
|------|---------|--------|
| App Next (UI, rotas, marketing/admin) | `apps/app/` | Consome `@repo/sdk`, `@repo/design-system`, `@repo/internationalization`, `@repo/auth`. |
| API Next (rotas HTTP) | `apps/api/` | Orquestração HTTP, validação na borda, uso de pacotes `@repo/*`. |
| Cliente HTTP e tipos de API | `packages/sdk/` | Única porta de chamada à API a partir do front. |
| UI compartilhada e tema | `packages/design-system/` | Componentes genéricos; sem fluxo de negócio de produto. |
| Traduções | `packages/internationalization/` | Chaves estáveis; textos de exemplo neutros. |
| Auth, e-mail, pagamentos, etc. | `packages/auth`, `packages/email`, `packages/payments`, … | Integrações reutilizáveis; configuráveis por env. |

## Princípios (resumo)

1. **Genérico no pacote, específico no app** — domínio do produto fica em `apps/*` ou em um pacote claramente nomeado ao domínio, não misturado em `@repo/sdk` / design-system.
2. **SDK como fachada** — o front não chama `fetch`/axios direto para a API da aplicação; usa ações/funções do `@repo/sdk`.
3. **i18n em dois lados** — mensagens de API alinhadas a locale quando fizer sentido; UI sempre via pacote de internacionalização.
4. **Responsivo e tema** — layout e componentes base devem funcionar em mobile e desktop; dark mode via design system / tokens existentes.

## Regras Cursor

Detalhes acionáveis estão em `.cursor/rules/*.mdc` (regras por glob + uma regra núcleo com `alwaysApply`).

Ao implementar uma feature nova: leia a regra do escopo (`next-app`, `api-app`, `monorepo-packages`) e a regra núcleo `boilerplate-core`.
