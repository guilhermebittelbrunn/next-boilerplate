# Plano: acabamento da branch de design

Tarefa direta, sem spec. Roda na branch `feat/design-system-refresh`, que ainda não foi mergeada. A origem são
quatro achados 🟢 do `/review` da própria branch (`docs/features/design-system-refresh/review/review.md:53-62`),
reconferidos pela auditoria de 2026-11-27 (`specs/reference/AUDIT.md:384-390`, `:2134-2135`, `:1197`, `:1294`),
que pôs este acabamento como plano B quando nenhuma spec está aprovada (`specs/reference/AUDIT.md:352`, `:370`).

## 1. Contexto

### Problema

O refactor de design trocou antd e react-toastify por Radix, Sonner e uma `Table` própria. Quatro detalhes ficaram
para trás:

1. **Toast no tema errado quando a página força tema.** O `Toaster` escolhe o tema pelo `resolvedTheme`
   (`packages/design-system/components/ui/sonner.tsx:15`, `:37`). No `next-themes` 0.4.6
   (`packages/design-system/package.json:23`), `resolvedTheme` guarda a preferência salva e ignora `forcedTheme`.
   O provider do antd que saiu resolvia isso com `forcedTheme ?? resolvedTheme` (`main`,
   `packages/design-system/providers/antd-app.tsx:157-160`).
2. **Rejeição não tratada no `ActionsMenu`.** O `confirmDelete` usa `try/finally` sem `catch`
   (`packages/design-system/components/ui/action-menu.tsx:77-85`). Um `onDelete` que devolva promise rejeitada
   vira `unhandledrejection`.
3. **`pageSize` da `Table` congelado.** O estado nasce de `pagination.pageSize` (`table.tsx:141-144`) e não
   acompanha mudança posterior da prop.
4. **Menu mobile da landing não fecha com clique fora.** Escape fecha (`apps/web/app/[locale]/components/header/index.tsx:81-93`),
   clique fora não.

### Quem sente hoje

| # | Efeito atual | Por quê |
|---|--------------|---------|
| 1 | Latente | Nenhum app passa `forcedTheme` (busca por `forcedTheme` em `apps/` e `packages/` vazia). Mas o `DesignSystemProvider` repassa as props do `ThemeProvider` (`packages/design-system/index.tsx:12`, `:46`), então um fork que force tema numa área cai no defeito. O fundo e o texto do toast vêm de variáveis CSS (`sonner.tsx:29-36`), o que reduz o estrago; ícones, botão de fechar e as cores internas do Sonner seguem o `theme`. |
| 2 | Latente | Os quatro consumidores passam `mutation.mutate(...)`, que devolve `void` (`EntitiesListClient.tsx:146-150`, `UsersListClient.tsx:187-191`, `OrganizationInvitationsTable.tsx:92-94`, `OrganizationMembersTable.tsx:124-126`). Quem passar `mutateAsync` ou uma função `async` própria recebe a rejeição solta. |
| 3 | Latente | O único consumidor com `pageSize` passa a constante `10` (`UsersListClient.tsx:229-230`). |
| 4 | Real | Toda visita mobile da landing. É o comportamento esperado de qualquer menu sobreposto. |

### Objetivo e corte

Corrigir os quatro na raiz, sem mudar API pública de componente, sem dependência nova, sem copy nova.

**Fora de escopo** (vira achado, não código, por `.claude/cycle-policy.md:51`):

- O foco que cai no `body` ao seguir um link do menu mobile (`header/index.tsx:262`), que a auditoria lista junto
  (`specs/reference/AUDIT.md:390`, `:1294`). A tarefa pede só o clique fora.
- Trocar o painel feito à mão por um primitivo Radix. O `docs/DESIGN.md:140` manda usar Radix para menu, e o
  painel atual é `div` com foco manual. Migrar muda posicionamento, animação e os testes do header inteiro; fica
  como pergunta 3.
- `MetricStrip` com quatro itens e `themeColor` ausente, que a auditoria agrupa no mesmo acabamento
  (`specs/reference/AUDIT.md:390-391`) mas a tarefa não incluiu.

### Apps e modo

`packages/design-system` (itens 1 a 3) e `apps/web` (item 4). Afeta `apps/app` só por herança dos componentes.
Sem diferença entre `subscription` e `simple`, entre área comum e admin, ou sob impersonação.

## 2 a 4. Dados, SDK e API

N/A. Nenhuma coleção, DTO, action, rota, `error.code` ou entrada de `apiErrors`.

## 5. Front-end

### 5.1 `Toaster` respeita `forcedTheme`

Ler `forcedTheme` junto com `resolvedTheme` e usar `forcedTheme ?? resolvedTheme`, o mesmo padrão que o repo já
usou no provider do antd. O comentário da linha 14 continua verdadeiro (o Sonner só estiliza `light` e `dark`);
ajustar o texto para cobrir o tema forçado.

### 5.2 `ActionsMenu` com `onDelete` que rejeita

Decisão: **capturar a rejeição e manter o comportamento visível de hoje** (o diálogo sai do estado ocupado e fecha).
O componente não mostra erro; quem reporta é o chamador.

Por quê:

- No repo, quem reporta falha de exclusão é a mutation, com toast no `onError`
  (`entities/(hooks)/useEntityCrud.tsx:186-204`). O `ActionsMenu` não tem copy de erro nem conhece o
  `error.code`, e acrescentar isso pediria i18n nova e dependência de `@repo/shared` no componente.
- Os outros diálogos de confirmação do app fecham ao confirmar, e o erro chega por toast
  (`LeaveOrganizationButton.tsx:58-63`, com `AlertDialogAction`).
- É a menor mudança: o `finally` já fecha. Para os consumidores atuais, que passam `mutate`, nada muda.

A alternativa (manter aberto para tentar de novo) está na pergunta 1.

Precedente de `catch` vazio com o porquê: `apps/app/shared/lib/emailLinkSignIn.ts:10-12`.

### 5.3 `Table` acompanha `pagination.pageSize`

Usar o padrão do React para ajustar estado quando a prop muda: guardar o último `pageSize` recebido e, quando ele
mudar, aplicar o novo valor e voltar para a página 1 (o seletor de tamanho já volta para a 1, `table.tsx:341-342`).

Regra que o teste tem de travar: um re-render com a **mesma** prop (refetch, nova `dataSource`) não desfaz a escolha
que o usuário fez no seletor. Só uma mudança do valor da prop sobrescreve. É a semântica de prop controlada que o
antd tinha.

### 5.4 Menu mobile fecha com clique fora

Fechar no `pointerdown` fora da área do menu (o `div` que envolve botão e painel, `header/index.tsx:229`), enquanto
o menu estiver aberto. Sem devolver o foco ao botão: quem clicou fora escolheu outro alvo.

Armadilha: o painel contém o `LanguageSwitcher` e o `ModeToggle` (`header/index.tsx:303-306`), dois `DropdownMenu`
do Radix (`language-switcher.tsx:57-78`, `mode-toggle.tsx:28-48`) cujo conteúdo vai para um portal fora do `div`.
Um `contains(event.target)` no DOM veria o item do idioma como "fora", fecharia o painel no `pointerdown` e
desmontaria o dropdown antes da seleção. A detecção tem de seguir a árvore do React, que atravessa portais:

- `onPointerDownCapture` no `div` da área marca um ref `pointerStartedInsideMenu`;
- o listener de `pointerdown` em `document` (fase de bolha, registrado no mesmo `useEffect` do Escape) lê e zera o
  ref; se não estava marcado, fecha;
- o `useEffect` zera o ref ao registrar o listener. Sem isso, o `pointerdown` no botão que abriu o menu deixa o ref
  marcado e o primeiro clique fora seguinte é ignorado.

É a mesma técnica do `DismissableLayer` do Radix. Com o App Router o React hidrata o `document`, e o listener de
captura do React roda antes do nosso de bolha no mesmo nó, então a ordem não depende de quem registrou primeiro.

### 5.5 i18n e a11y

Nenhuma chave nova. O `aria-expanded` do botão já reflete o estado (`header/index.tsx:232`).

## 6. Autorização e segurança

N/A. Nada muda em guard, sessão ou dado.

## 7. Testes (Vitest)

Todos no nível de componente, com jsdom. Nenhum precisa de emulador nem de app de pé.

| Arquivo | Caso novo | O que prova |
|---------|-----------|-------------|
| `packages/design-system/__tests__/sonnerTheme.test.tsx` (novo) | `forcedTheme: "dark"` com `resolvedTheme: "light"` entrega `theme="dark"`; o inverso entrega `"light"`; sem `forcedTheme` segue o `resolvedTheme`; sem nada entrega `"light"` | O tema forçado vence. Mock de `next-themes` como o antigo `antdTheme.test.tsx` (`main`, linhas 21-26) e mock de `sonner` que expõe a prop `theme` num atributo. O primeiro caso falha com o código atual. |
| `packages/design-system/__tests__/actionMenu.test.tsx` | `onDelete` que rejeita: o botão sai de `aria-busy`, o diálogo fecha, o foco volta ao gatilho e nenhum `unhandledrejection` dispara | A rejeição é capturada. Escutar `process.on("unhandledRejection")` (ou `window` `unhandledrejection`) no teste e remover no fim. Reaproveitar `openConfirmationFromKeyboard` e `getDialogButton` (linhas 47-50). |
| `packages/design-system/__tests__/tablePagination.test.tsx` | (a) `rerender` com `pageSize` 5 mostra 5 linhas e volta à página 1; (b) escolher 20 no seletor e dar `rerender` com a mesma prop (e nova `dataSource`) mantém 20 | A prop acompanha, e o refetch não apaga a escolha do usuário. |
| `apps/web/__tests__/headerMobileMenu.test.tsx` | (a) abrir com `pointerDown` + `click` no botão, depois `pointerDown` em `document.body` fecha; (b) `pointerDown` num link dentro do painel não fecha; (c) abrir o `LanguageSwitcher` do painel e dar `pointerDown` no item do portal mantém o painel aberto; (d) abrir, fechar pelo botão, reabrir e clicar fora fecha | (a) cobre o ref zerado no efeito, porque o `pointerDown` real do botão vem antes do `click`. (c) cobre o portal. Para abrir o dropdown no jsdom, seguir o `openMenu` de `actionMenu.test.tsx:24-30` (`pointerDown` com `button: 0`). |

Os casos existentes continuam verdes sem alteração. Prova de mutação esperada no `/test`: reverter cada correção e
ver o caso novo correspondente falhar.

Comandos: `pnpm --filter @repo/design-system test`, `pnpm --filter web test`, e o `pnpm test` da raiz.

## 8. O que o `/test` vai percorrer

Superfície pequena. Uma passada, focada no item 4; os itens 1 a 3 não têm caminho na UI de hoje que produza o
defeito (são latentes), então o browser só confere que nada regrediu.

1. **Landing, menu mobile, 390 px** (light e dark; pt-br, en, es na abertura e no clique fora):
   - abrir o menu e tocar no conteúdo da página abaixo do header: fecha, `aria-expanded="false"`;
   - abrir e tocar numa área vazia do próprio painel: continua aberto;
   - abrir, abrir o seletor de idioma dentro do painel e escolher outro idioma: a troca acontece (a rota muda);
   - abrir, abrir o seletor de tema dentro do painel e escolher escuro: o tema muda;
   - Escape continua fechando e devolvendo o foco ao botão;
   - em 1024 px sem link de documentação o botão some (barra cheia em `lg`), sem regressão.
2. **App, toasts e exclusão** (regressão do design system): excluir uma entidade pelo `ActionsMenu` em light e dark;
   o diálogo fecha e o toast de sucesso aparece no tema da página.
3. **App, tabela de usuários do admin**: continua com 10 linhas por página.

Não observável no browser sem código de teste: o toast com `forcedTheme` (nenhuma página força tema), a rejeição
do `onDelete` (nenhum consumidor passa promise) e a troca de `pageSize` pela prop. Esses ficam provados só no Vitest,
e o relatório deve dizer isso em vez de marcar como medido no browser.

**Pré-requisitos de infra: nenhum.** A landing roda sem Firebase para o item 1. Os itens 2 e 3 usam o emulador local
que o `/test` já sobe (`pnpm e2e` ou o dado de QA de sempre); nada a provisionar, nada para `docs/PRE-PRODUCTION.md`.

## 9. Critérios de aceite

O `/test` gera o checklist no formato §9.1. Os casos que ele precisa cobrir:

- tema forçado vence a preferência salva, nos dois sentidos, e sem tema forçado nada muda;
- `onDelete` que rejeita não gera rejeição solta, o diálogo fecha e o foco volta ao gatilho; `onDelete` síncrono e
  `async` que resolve se comportam como antes; cancelar e Escape continuam bloqueados durante a exclusão;
- mudar `pagination.pageSize` aplica o novo tamanho e volta à página 1; re-render com a mesma prop preserva a escolha
  do seletor; `pagination={false}` continua mostrando tudo;
- clique fora fecha o menu mobile; clique dentro (inclusive no conteúdo portado dos dois seletores) não fecha; o
  botão continua alternando sem fechar e reabrir no mesmo toque; Escape e os links seguem como antes.

## 10. Blueprint

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `packages/design-system/components/ui/sonner.tsx` | `forcedTheme ?? resolvedTheme` |
| `packages/design-system/components/ui/action-menu.tsx` | `catch` no `confirmDelete` |
| `packages/design-system/components/ui/table.tsx` | sincronizar `pageSize` com a prop |
| `apps/web/app/[locale]/components/header/index.tsx` | fechar no `pointerdown` fora, ciente de portal |
| `packages/design-system/__tests__/sonnerTheme.test.tsx` | novo |
| `packages/design-system/__tests__/actionMenu.test.tsx` | caso novo |
| `packages/design-system/__tests__/tablePagination.test.tsx` | dois casos novos |
| `apps/web/__tests__/headerMobileMenu.test.tsx` | quatro casos novos |

### Pseudo-diffs

```tsx
// packages/design-system/components/ui/sonner.tsx
-  // Sonner only styles "light" and "dark"; the resolved theme is never the literal "system".
-  const { resolvedTheme } = useTheme();
+  // next-themes keeps the stored preference in resolvedTheme even when a page forces a theme,
+  // and Sonner only styles "light" and "dark".
+  const { forcedTheme, resolvedTheme } = useTheme();
+  const activeTheme = forcedTheme ?? resolvedTheme;
 ...
-      theme={resolvedTheme === "dark" ? "dark" : "light"}
+      theme={activeTheme === "dark" ? "dark" : "light"}
```

```tsx
// packages/design-system/components/ui/action-menu.tsx
     const confirmDelete = async () => {
         setDeleting(true);
         try {
             await onDelete?.();
+        } catch {
+            // The caller reports the failure (its mutation shows the error toast); the menu
+            // only has to leave the busy state.
         } finally {
             setDeleting(false);
             setConfirmOpen(false);
         }
     };
```

```tsx
// packages/design-system/components/ui/table.tsx
   const pageConfig = pagination === false ? null : (pagination ?? {});
-  const [pageSize, setPageSize] = useState(
-    pageConfig?.pageSize ?? DEFAULT_PAGE_SIZE
-  );
+  const configuredPageSize = pageConfig?.pageSize ?? DEFAULT_PAGE_SIZE;
+  const [pageSize, setPageSize] = useState(configuredPageSize);
+  const [appliedPageSize, setAppliedPageSize] = useState(configuredPageSize);
+  if (configuredPageSize !== appliedPageSize) {
+    setAppliedPageSize(configuredPageSize);
+    setPageSize(configuredPageSize);
+    setPage(1);
+  }
```

```tsx
// apps/web/app/[locale]/components/header/index.tsx
     const menuButtonRef = useRef<HTMLButtonElement>(null);
+    const pointerStartedInsideMenu = useRef(false);
 ...
     useEffect(() => {
         if (!isOpen) {
             return;
         }
+        pointerStartedInsideMenu.current = false;
         const closeOnEscape = (event: KeyboardEvent) => { ... };
+        // The language and theme pickers render their options in a portal outside this
+        // wrapper, so "inside" follows the React tree (capture handler below), not the DOM.
+        const closeOnPointerOutside = () => {
+            if (pointerStartedInsideMenu.current) {
+                pointerStartedInsideMenu.current = false;
+                return;
+            }
+            setOpen(false);
+        };
         document.addEventListener("keydown", closeOnEscape);
+        document.addEventListener("pointerdown", closeOnPointerOutside);
-        return () => document.removeEventListener("keydown", closeOnEscape);
+        return () => {
+            document.removeEventListener("keydown", closeOnEscape);
+            document.removeEventListener("pointerdown", closeOnPointerOutside);
+        };
     }, [isOpen]);
 ...
-                <div className={cn("flex shrink-0", fullBar.menu)}>
+                <div
+                    className={cn("flex shrink-0", fullBar.menu)}
+                    onPointerDownCapture={() => {
+                        pointerStartedInsideMenu.current = true;
+                    }}
+                >
```

O comentário do header entra pela exceção 2 de `.claude/rules/code-comments.md` (armadilha não evidente com
portal). Os outros dois descrevem restrição externa (`next-themes`, contrato com o chamador).

### Ordem de implementação e commit

Não há SDK, API nem i18n. Um commit por unidade, pacote antes de app:

1. `fix(design-system): let a forced theme drive the toaster theme`: `sonner.tsx` + `sonnerTheme.test.tsx`
2. `fix(design-system): catch a rejected onDelete in the actions menu`: `action-menu.tsx` + caso em `actionMenu.test.tsx`
3. `fix(design-system): follow pagination.pageSize changes in the table`: `table.tsx` + casos em `tablePagination.test.tsx`
4. `fix(web): close the mobile menu on a click outside`: `header/index.tsx` + casos em `headerMobileMenu.test.tsx`
5. `docs(features): design-refresh-followups`

O backlog (`specs/reference/AUDIT.md`, `specs/BACKLOG.md`) tem alterações não commitadas de outra rodada no working
tree. Não entram nesses commits; a reconciliação dos achados fechados é do `/spec --sync`.

### Env e config

Nenhuma.

## Perguntas em aberto

Todas já decididas pela escada do `/cycle`; ficam registradas para revisão.

1. **`ActionsMenu`, o que fazer quando `onDelete` rejeita.** Adotado: capturar, fechar o diálogo e deixar o erro para
   o chamador. Motivo: é o padrão das confirmações do app (fecham ao confirmar, erro por toast da mutation) e não
   muda nada para os consumidores atuais. Alternativa: manter o diálogo aberto para nova tentativa, que exige
   distinguir sucesso de falha no `try` e muda o contrato para quem usar `mutateAsync`.
2. **`Table`, quem vence entre prop e seletor.** Adotado: a prop vence quando o valor dela muda; re-render com o
   mesmo valor preserva a escolha do usuário. Motivo: semântica do antd que a `Table` substituiu, sem mudar a API.
   Alternativa: ignorar a prop depois da escolha do usuário.
3. **Menu mobile em Radix.** Adotado: corrigir o painel atual com o listener ciente de portal e deixar a migração
   como achado. Motivo: `.claude/cycle-policy.md:51` (mudança mínima) e o refactor desta branch manteve o painel
   feito à mão. Alternativa: trocar por um primitivo Radix, como pede `docs/DESIGN.md:140`, o que reabre
   posicionamento, animação e todos os testes do header.
4. **Foco no `body` ao seguir um link do menu.** Adotado: fora desta tarefa, segue como achado aberto da auditoria.
