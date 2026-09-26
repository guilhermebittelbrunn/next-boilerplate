# Handoff do develop: i18n-hydration-admin-delete-billing

Duas frentes independentes. H1 corrige o locale do `getDictionary()` do client no SSR. A2 faz o arquivamento
de usuário pelo admin cancelar a assinatura viva antes do soft delete. Rodada autônoma do `/cycle`: nenhuma
pergunta ao usuário.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 12.1 H1, provider e leitura do locale | `packages/internationalization/client.ts` |
| 12.1 H1, devDependencies do teste | `packages/internationalization/package.json`, `pnpm-lock.yaml` |
| 9.1 H1, teste | `packages/internationalization/__tests__/localeProvider.test.ts` (novo, 12 casos) |
| 6.1 H1, provider na `apps/app` | `apps/app/app/layout.tsx` |
| 6.1 H1, provider na `apps/web` | `apps/web/app/[locale]/layout.tsx` |
| Desvio D-dev1 (abaixo) | `packages/auth/provider.tsx` |
| 12.2 A2, rota | `apps/api/app/(routes)/users/[id]/route.ts` |
| 9.2 A2, teste | `apps/api/__tests__/usersAdminDeleteBilling.test.ts` (novo, 12 casos) |
| 5.4 A2, mocks nas suítes que importam a rota | `apps/api/__tests__/usersAdminAuditTrail.test.ts`, `apps/api/__tests__/mergedUserPayload.test.ts` |
| 7 i18n | `packages/internationalization/translations/packages/shared/utils.ts`, `packages/internationalization/translations/apps/app/pages/admin/users.ts` |
| 12.3 docs | `docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md`, `docs/ARCHITECTURE.md`, `AGENTS.md`, `apps/app/CLAUDE.md`, `.claude/skills/i18n-sync/SKILL.md` (este último fora da lista do plano, ver desvios) |

## Contrato

- `@repo/sdk`: nada mudou. `apiClient.users.delete` continua recebendo 204 ou `{ error: { code } }`.
- `@repo/internationalization/client` ganhou duas exportações: `LocaleProvider` (montado só nos dois root
  layouts) e `useDictionary()` (usado só pelo `AuthProvider`). `getDictionary()` e `getDictionaryForLocale()`
  mantêm a assinatura, e nenhum dos 63 call sites de `getDictionary()` mudou.
- No servidor, `getDictionary()` do client passa a exigir contexto de render (usa `use(LocaleContext)`).
  Chamá-lo fora de render no SSR lança erro. Contagem do plano: nenhuma chamada desse tipo existe hoje.

## Código de erro novo

`USERS_DELETE_BILLING_FAILED` (503). Entrou em `apiErrors` nos 3 idiomas
(`translations/packages/shared/utils.ts`, junto de `USERS_NOT_FOUND`). Paridade verificada com
`pnpm --filter @repo/internationalization test`: `parity.test.ts` passa.

## Desvios em relação ao plano

1. **D-dev1: `AuthProvider` passa a usar `useDictionary()` (o plano dizia "nenhum call site muda").** Na
   `apps/app`, o `AuthProvider` fica no root layout, acima do segmento `[locale]`, e guarda `dictionary` e
   `locale` durante o render para usar nos toasts e no redirect de sessão expirada. Numa troca de idioma
   por `router.push`, o segmento `[locale]` remonta, mas o `AuthProvider` não tem motivo para re-renderizar:
   ele não lê `useParams()` nem nenhum contexto que mude. Com o desenho do plano (estado de módulo no
   navegador, sem assinatura), ele continuaria com o idioma antigo até outro re-render, e o critério 3
   ("mensagens de callback" na troca de idioma) falharia para os toasts dele. `useDictionary()` lê o locale
   com `use(LocaleContext)`, então o componente re-renderiza quando o provider muda de valor. Nenhum outro
   componente acima do segmento chama `getDictionary()` durante o render: `AuthProviderWithAlerts`
   (`design-system/index.tsx:25`) só chama dentro do callback `getRedirectPath`, que lê o estado atual, e
   os providers de `apps/app/shared/providers/` não importam o dicionário (`grep -n getDictionary`). Na
   `apps/web` o `AuthProvider` fica dentro de `[locale]/layout.tsx`, então lá a troca já remontava a árvore.
   A regra entrou em `AGENTS.md` e `apps/app/CLAUDE.md`.
2. **`pnpm install --offline` deduplicou `csstype`** no lockfile: `@types/react@19.2.2` passou de
   `csstype@3.1.3` para `3.2.3`, versão que já estava no lockfile, e a entrada 3.1.3 saiu. Foi efeito do
   pnpm, não uma escolha. Typecheck de todos os workspaces passou depois disso (`pnpm turbo run lint
   typecheck test`, 26/26).
3. **Import dinâmico com `.js` no teste do pacote.** O tsconfig do `@repo/internationalization` usa
   resolução `node16`, que exige extensão em `import()` (TS2835). O teste usa
   `await import("../client.js")`, que o Vitest resolve para o `.ts`.
4. **`.claude/skills/i18n-sync/SKILL.md`** dizia "Locale resolvido via cookie `x-locale`" sem distinguir
   client de servidor. Corrigi a frase, que ficaria falsa para o client.
5. **Formatação em `apps/web/app/[locale]/layout.tsx`.** Ao reindentar a árvore dentro do
   `<LocaleProvider>`, o Biome reescreveu `<ClientLayout> {children} </ClientLayout>` como
   `{" "}{children}{" "}`. O HTML gerado é o mesmo.

## Pontos que o orquestrador pediu para verificar no H1

- (a) `use(LocaleContext)` só roda no ramo `typeof window === "undefined"`. As 63 chamadas de produção estão
  em componente ou hook, e as 2 exceções do plano (seção 2) só rodam no navegador. `next build` da `apps/app`
  e da `apps/web` passou, o que inclui a pré-renderização das páginas estáticas.
- (b) `lastRenderedBrowserLocale` só é gravado dentro de `if (!isServer())`. O teste "não guarda o idioma em
  estado de módulo entre requisições" renderiza `es` com provider e depois sem provider: o segundo sai
  `pt-br`. O teste "isola duas requisições concorrentes" deixa uma renderização `en` suspensa, termina uma
  `es` e depois libera a primeira, que sai `en`.
- (c) `client.ts` tem `"use client"`. Dos 68 arquivos de produção que o importam, 62 também têm a diretiva
  (em `design-system/components/ui/select/index.tsx` ela está na linha 4, depois de comentários do Biome) e
  6 não têm. Os 6 são hooks React (`use*.tsx`), que não rodam em Server Component. Os layouts, que são
  Server Components, importam só o `LocaleProvider`, que vira referência client. `next build` dos dois apps passou.
- (d) Troca de idioma: ver D-dev1. O teste "segue a última URL renderizada depois de uma troca de idioma"
  cobre o ramo do navegador (render com `en`, depois com `es`, e `getDictionary()` fora de render devolve
  `es`). O re-render de verdade no navegador fica para o `/test`.

## Validação (medida)

| Gate | Comando | Resultado |
|------|---------|-----------|
| CI completo | `pnpm turbo run lint typecheck test` | 26/26 tarefas, 11 do cache |
| Lint | `pnpm check` | 753 arquivos, sem erro |
| Testes api | idem | 73 arquivos, 894 testes |
| Testes app | idem | 77 arquivos, 606 testes |
| Testes web | `pnpm turbo run test typecheck --filter=web ...` | 8 arquivos, 41 testes |
| Testes i18n + paridade | `pnpm --filter @repo/internationalization test` | 6 arquivos, 59 testes |
| Testes auth | `pnpm turbo run test typecheck --filter=@repo/auth ...` | 8 arquivos, 101 testes |
| Build web | `npx next build` em `apps/web` | concluído |
| Build app | `npx next build` em `apps/app` | concluído |

Reprodução do defeito antes da correção: uma cópia do `client.ts` do `HEAD` renderizada com
`renderToString` sem `window` devolveu `<p>pt-br</p>`. Com o código novo, o mesmo cenário com
`useParams → { locale: "en" }` sai em inglês (teste "renderiza o componente client no idioma do segmento").

O teste da A2 também foi rodado contra a rota do `HEAD`: 7 dos 12 casos falharam (os 5 de assinatura viva e
os 2 de recusa), o que mostra que ele mede a mudança.

Smoke na `apps/web` (`next start -p 3001`, porta livre antes, processo derrubado no fim, porta livre
depois), contando o texto do link de contato do `Header`, que é componente client, no HTML do SSR:

| URL | Cookie | `>Contato<` | `>Contact<` | `>Contacto<` | `<html lang>` |
|-----|--------|------------:|------------:|-------------:|---------------|
| `/en` | nenhum | 0 | 1 | 0 | `pt-br` |
| `/en` | `x-locale=pt-br` | 0 | 1 | 0 | `pt-br` |
| `/es` | nenhum | 0 | 0 | 1 | `pt-br` |
| `/es` | `x-locale=pt-br` | 0 | 0 | 1 | `pt-br` |
| `/pt-br` | nenhum | 1 | 0 | 0 | `pt-br` |

O `<html lang>` em `pt-br` mesmo sem cookie é o O4 (o `getDictionary()` do servidor lê o cookie da
requisição, e a primeira requisição não tem cookie). Está fora do escopo pela D10 e continua aberto.

## A verificar no `/test`

- Ausência de "Hydration failed"/"did not match" no console em `/en/admin`, `/es/admin`, `/en/entities`,
  `/en/account`, `/en/sign-in` e web `/en`, `/es`. O curl acima mostra o SSR no idioma da URL só na web e
  só no `Header`. Nada foi medido na `apps/app` nem com o navegador.
- Troca de idioma pelo `LanguageSwitcher` de `/en/entities` para `/es/entities`: sidebar, breadcrumb e
  tabela em espanhol sem recarregar. Para o D-dev1: em `/en/sign-in`, trocar para `/es/sign-in`, entrar com
  a conta de QA e conferir que o toast de sucesso do `AuthProvider` sai em espanhol.
- Datas da coluna de último acesso em `/en/admin/users` no formato inglês no SSR.
- Diálogo de arquivamento com a frase nova nos 3 idiomas.
- Arquivar usuário sem assinatura: 204 e o toast de sucesso de sempre.
- Perfil de QA no emulador com `subscription.status = "active"` gravado à mão e API sem
  `STRIPE_SECRET_KEY`: arquivar mostra o toast de `USERS_DELETE_BILLING_FAILED` e o usuário continua na
  listagem. A rota tem esse caminho coberto por teste unitário, mas o toast não foi medido.
- Cancelamento real numa conta Stripe de teste: não verificado, exige conta no provedor.

## Lacunas de teste conhecidas

- O re-render do `AuthProvider` na troca de idioma não tem teste automatizado. O pacote de i18n roda em
  ambiente `node`, sem `react-dom/client` nem jsdom. A garantia vem do `use(Context)` do React; a
  verificação fica para o `/test`.
- O caminho em que o cancelamento passa e o soft delete falha (Firestore fora) não tem teste. O plano
  (5.2) descreve o estado resultante como recuperável; nada mudou nesse trecho.

## Decisões em aberto

- Manter o D-dev1 (`useDictionary()` no `AuthProvider`) ou voltar para "nenhum call site muda" e aceitar
  toasts do `AuthProvider` no idioma antigo depois de uma troca por navegação suave na `apps/app`. Adotei a
  primeira opção.
- As perguntas 1 a 3 da seção 14 do plano seguem com a opção adotada lá. Nada aqui as muda.

## Dados de QA

Nenhuma conta nem dado criado nesta etapa. O smoke foi anônimo, na `apps/web`.
