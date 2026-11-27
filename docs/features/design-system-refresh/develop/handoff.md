# Handoff do develop: skills de design e refactor de interface

Pedido do usuário: adicionar ao repositório seis skills de design (ThinkUI, Uizze, Taste Skill, Emil Kowalski,
Vercel Web Interface Guidelines e Founder Skill), refazer layout, design e UX do app usando cada uma, com
liberdade para trocar componentes e bibliotecas, e atualizar a documentação que os forks herdam. Não houve plano:
a direção visual decidida está em `docs/DESIGN.md`, que é também o contrato daqui em diante.

Nada foi commitado. O trabalho das telas foi dividido entre quatro subagentes com escopos de arquivo separados
(auth e onboarding, dashboards e listas, conta e formulários, landing); o design system, o shell do painel, a
documentação e a consolidação final ficaram no loop principal.

## O que mudou, por área

### Skills (`.claude/skills/`, 30 pastas novas ou atualizadas)

| skill(s) | origem | observação |
|----------|--------|------------|
| `thinkui`, `thinkui-anti-slop` | índice `/.well-known/skills/index.json` de thinkui.xyz, SHA-256 conferido | dependem de MCP pago para a parte de evidência |
| `anti-ui-slop` | uizze/uizze `fc401e9` | Apache-2.0 com `NOTICE`; a pasta `agents/` (formato OpenAI) ficou de fora |
| `design-taste-frontend-v1` | Leonxlnx/taste-skill-classics `5e08c93` | a 2.5 (39 MB) ficou fora; a v1 tem `disable-model-invocation: true` e só roda por nome |
| 13 do Emil Kowalski | emilkowalski/skills `64eb3de` | sete ficaram fora (nativo, roteador e as sem uso no web) |
| `web-design-guidelines` | vercel-labs/agent-skills `5a37a63` | v1.0.0 → v1.1.0, regras em `references/command.md` |
| 11 `founder-*` | Jakeschincariol/founder-skill `fd9385b` | scripts Python lidos: só I/O local, sem rede |

Instrumento: `find` dos `SKILL.md`, leitura de cada um, `grep` de imports e I/O nos `.py`. A tabela de procedência
completa está em `docs/AI-WORKFLOW.md`.

### Design system (`packages/design-system`)

- `styles/globals.css`: tokens novos (neutros de matiz 264, acento cobalto), elevações `shadow-card`,
  `shadow-popover` e `shadow-overlay`, curvas `ease-out`/`ease-in-out`/`ease-drawer`, `--duration-*`, utilitário
  `pressable`, `color-scheme`, `text-wrap` em títulos e parágrafos, bloco de `prefers-reduced-motion`. Saíram os
  overrides de antd.
- antd removido: `providers/antd-app.tsx` apagado; `table.tsx` reescrita em HTML semântico (busca, atualizar,
  paginação no cliente, esqueleto, vazio, `variant="flush"`); `action-menu.tsx` reescrito com `DropdownMenu` e
  `AlertDialog` do Radix, mantendo o contrato de teclado e foco.
- react-toastify removido: `hooks/useAlert.ts` chama o Sonner; `sonner.tsx` passa o tema resolvido.
- Primitivos: `button` (variantes, `pressable`, destrutivo tonal no escuro), campos com `bg-card`, `card`, `badge`
  (variantes `success` e `warning` tonais), menus e popovers (`shadow-popover`, `ease-out`), diálogos e sheet
  (`shadow-overlay`, `ease-drawer`), `sidebar`, `tooltip` (sem animação em `instant-open`), `skeleton`, `chart`,
  `category-bar-chart` (sem animação de entrada), `progress`, `responsive-image`, botão de olho da senha.
- Nenhum `transition-all` sobrou em `components/`.
- Testes: `antdLocale` e `antdTheme` apagados; `themeContrast` refeito com os pares novos; `actionMenu` reescrito
  para o Radix.

### Dependências

`antd` saiu do design system; `react-toastify` saiu do design system, do app e da web. `pnpm install` tirou 65
pacotes do lockfile.

### App (`apps/app`)

- Shell em `shared/components/ui/`: `Container` sem painel cinza; `PageHeader`, `Header` e `PageSkeleton` com
  56 px de barra; `Navbar` e `Sidebar` refeitos; `SettingsSection` com `headingLevel`, `surface` e `titleRef`;
  `LoadErrorState` com `onRetry`; `FormSkeleton` com `columns`; `Footer`, `PageFormFooter`, `TableSkeleton`.
  Novos: `FormSurface`, `MetricStrip`, `RecordAvatar`. Apagado: `MetricCard` (sem uso).
- Telas: auth e convite (layout dividido, `AuthCard` único, componentes `AuthBrandPanel`, `AuthDivider`,
  `AuthPending`, `AuthActionLink`), onboarding (passo X de Y, `Footer` com `sticky={false}`), homes comum e admin
  (`MetricStrip`, cobrança, atividade), listas de entidades, usuários e auditoria, notificações, conta, equipe,
  formulários de entidade e usuário, playground.
- Hooks de resumo (`useEntitySummary`, `useUserSummary`, `useUserActivitySummary`, `useBillingSummary`) passaram a
  expor `isFetching` para o "Tentar de novo".
- Layout raiz: saiu o `ToastContainer`.
- Testes ajustados: `alertTheme` (Sonner), `organizationTransferKeyboard` (abre o menu com `pointerDown`),
  `settingsSection`, `pageShell` (`h-14`), comentários de três outros arquivos que citavam antd.

### Web (`apps/web`)

Home nova (hero dividido com recorte do painel em HTML, passos, o que o fork herda, qualidade, FAQ, CTA). Saíram
stats, depoimentos e cases, que eram inventados, e as traduções `hero`, `features` e `stats`. Header com skip link e
menu mobile completo, footer, pricing (sem plano "recomendado" inventado), contato, sign-in/up, legal e 404 no
contrato. Entrada única do hero em CSS, partindo de opacidade 0,01 para não atrasar o LCP. `docsUrlEnv.test.tsx`
ajustado. `layout.tsx` sem `ToastContainer`.

### i18n

Chaves novas: `components.table.*` (busca, paginação, carregando), `components.button.retry`,
`apps.web.layout.skipToContent`, `signIn.brandPanel`, `entities.form.sections`, `home.chart.viewAll`,
`admin.home.activity.neverNoticeOne` e as da home da web. Removidas: `pricing.recommended` da web e
`organization.members.columns.email`. Reticências de um caractere nas mensagens de carregamento de verificação de
e-mail.

### Documentação

`docs/DESIGN.md` novo. Atualizados: `CLAUDE.md` (regra de ouro 12 e lista de skills), `AGENTS.md`,
`apps/app/CLAUDE.md`, `apps/web/CLAUDE.md`, `packages/CLAUDE.md`, `README.md`, `docs/AI-WORKFLOW.md`,
`docs/review-checklist.md` (seção 5.1), `docs/FORKING.md`, `docs/GLOSSARY.md`, `docs/feature-analysis-guide.md`,
`docs/templates/README.template.md`, `docs/delivery/03-product-quality.md`, `docs/delivery/05-legal-policies.md`,
`.claude/commands/kickoff.md`, `.claude/agents/{analista-qa,desenvolvedor,planejador-tarefa}.md`,
`scripts/kickoff/documents.mjs` (o prompt de design leva o contrato). Comentário da CSP em
`packages/security/middleware.ts` deixou de citar antd.

## Afirmações e instrumento

| afirmação | instrumento |
|-----------|-------------|
| Lint, typecheck e testes de todos os workspaces passam | `pnpm turbo run lint typecheck test --concurrency=2 --continue` → `Tasks: 29 successful, 29 total` (app 155 arquivos, web 36, design system 12) |
| `pnpm check` limpo | `Checked 1176 files … No fixes applied` |
| Contraste AA nos dois temas | `themeContrast.test.ts` (27 pares) e o script de contraste usado antes de gravar os tokens |
| Paridade de i18n | `pnpm --filter @repo/internationalization test` → 67/67 |
| Prompt do kickoff | `node --test scripts/kickoff/__tests__/documents.test.mjs` → 12/12 |
| Landing sem rolagem horizontal em 1440 e 390 | `agent-browser eval "document.documentElement.scrollWidth <= window.innerWidth"` → `true` nas duas larguras |
| E2E compatível com o menu e a tabela novos | leitura dos specs: usam `getByRole("menuitem" \| "row" \| "alertdialog")`. Não rodado |

A primeira rodada do turbo com `--concurrency=4` falhou no `web#test` com os 36 arquivos verdes; isolado e na
rodada com `--concurrency=2`, passou. Vários testes de jsdom estouram 20 s quando a máquina está carregada.

## A verificar no `/test`

Nada do `apps/app` foi visto renderizado: o worktree não tem credencial do Firebase. A landing foi vista em
1440 px escuro e 390 px claro, só a primeira dobra com atenção.

- Painel inteiro em claro, escuro, 390 px e 1440 px, nos três idiomas: sidebar, navbar, `PageHeader`, tabelas,
  `MetricStrip` com número de sete dígitos, formulários em `FormSurface`, `SettingsSection` destrutivo.
- Tabela: busca, paginação com `showSizeChanger` (usuários admin), esqueleto, vazio, rolagem horizontal no
  celular, `variant="flush"` nas sessões.
- `ActionsMenu`: abrir com mouse e teclado, excluir com confirmação, foco volta ao gatilho, transferência de posse
  da equipe pelo teclado.
- Toasts do Sonner nos dois temas e o botão de fechar.
- Auth: painel de marca no escuro, banner de cookies aberto, e-mail longo no convite, botões outline do Google e
  do link por e-mail lado a lado.
- Onboarding em 390 px com o `Footer` não fixo.
- `prefers-reduced-motion`: press e entrada de popover sem escala.
- Landing: LCP do h1 (`pnpm lighthouse`), menu mobile (Esc, foco, idioma, tema), skip link, axe da home.

## Gate do contrato (seção 5 do `DESIGN.md`)

1. Específico: em parte. O painel tem a casca de qualquer painel de operação, o que cabe num boilerplate; a
   landing fala do próprio produto (comandos, portas, gates do CI).
2. Evidência: passo pulado, sem chave do ThinkUI ou do Uizze.
3. Estados: cobertos no código e nos testes; vistos renderizados só na landing.
4. Conteúdo: sem nome de exemplo nem número inventado; o recorte do hero está marcado como ilustrativo.
5. Hierarquia: h1 e "Criar conta" na landing; botão primário nas telas de auth; a primeira célula do
   `MetricStrip` nas homes; o nome nas listas.
6. Limites: ver a lista acima.

## Decisões que o usuário pode querer rever

- A Taste Skill v1 em vez da 2.5, e a v1 só por nome.
- Sete skills do Emil fora (`animate-expo`, `write-swift`, `ask-emil`, `prototype`, `learn-taste`, `gestures`,
  `apple-design`).
- Seções de prova social removidas da landing até o fork ter dado real.
- Nenhum plano marcado como recomendado na web e na conta sem `?plan=`: o catálogo não tem esse campo.
- `Footer` do onboarding passou a não ser fixo, o que contraria o exemplo citado no `apps/app/CLAUDE.md`.
- Campos ficaram `h-9` também nas telas de auth, por densidade, apesar do botão `lg` ao lado.
