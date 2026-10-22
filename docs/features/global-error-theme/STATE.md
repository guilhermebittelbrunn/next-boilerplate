---
slug: global-error-theme
title: Estilo e tema nas telas de erro global
task: -
spec: none (achado BACKLOG)
branch: fix/auth-forms-and-global-error-theme
epic: -
updated: 2026-10-21 22:04
---

# Pipeline: estilo e tema nas telas de erro global

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-21 21:42 | analyze/plan.md | `apps/app` e `apps/web`, só os dois `global-error.tsx` e os dois `globalErrorLocale.test.tsx`: cada tela importa o `styles.css` do próprio app, monta o `ThemeProvider` do design system, ganha `suppressHydrationWarning` e um card no molde do `NotFoundPage`; os testes ganham stub de `matchMedia` (sem ele quebram, medido) e um caso do tema; sem SDK, API, i18n ou env |
| develop | done    | 2026-10-21 21:47 | develop/handoff.md | os 4 arquivos do blueprint; o teste do tema executa o script do `next-themes` em 4 estados (app 8 casos, web 9); build de produção da web com sonda mostrou que a tela é renderizada no cliente e o CSS chega pela entrada `"G"` do payload RSC, não como `<link rel="stylesheet">` no HTML do 500, o que muda o F1 do `/test` |
| review  | in-progress | 2026-10-21 22:05 | review/review.md | Sem bloqueante; 1 🟢 corrigido (`runThemeScript` falha explícito sem `<script>`, nos dois testes); `new Function` aceito no teste; E1 a E4 confirmados por leitura do `next-themes` 0.4.6; 6 itens no "Verificar no `/test`" (F1 na app, quadro claro antes do escuro, console de produção, CSS extra nas páginas normais); `pnpm check` 971 arquivos limpo, typecheck app e web exit 0; branch `fix/auth-forms-and-global-error-theme` criada a partir da `web/fix/auth-forms` e validada no regex; 7 commits propostos, unificados com a `web-auth-forms` e a auditoria |
| test    | done    | 2026-10-21 22:04 | test/report.md  | 11 de 11 critérios ✅ em build de produção das duas apps (CSS no DOM depois de montar e na entrada `"G"`, E1 a E4, 375 px, 3 idiomas, `reset()`, console sem aviso de hidratação, sem CSS extra nas páginas normais); app 979, web 207, `pnpm test` da raiz 15/15; nenhum teste novo; observação: 1 ou 2 quadros claros (até ~30 ms) antes do escuro em E2/E3; sonda removida, portas livres |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação da passada incremental da noite de 2026-10-21 (`specs/BACKLOG.md:350-415`) e
  o achado 🟢 de `specs/BACKLOG.md:2054`. Rodada autônoma do `/cycle`: as sete decisões da §13 do plano já vêm com a
  opção adotada.
- Desvio da recomendação do BACKLOG: os dois testes atuais não aceitam a mudança como estão. No `jsdom`, o
  `ThemeProvider` chama `window.matchMedia` durante o `renderToString` e o `jsdom` não tem essa API (medido com teste
  temporário, apagado). O plano inclui o stub, com precedente em `apps/app/__tests__/tableLoadMore.test.tsx:5-15`.
- Risco que o `/test` mede: o CSS importado no `global-error` chegar ao HTML da resposta 500 no build Turbopack. Plano B
  na §11 do plano (manter só o tema nativo via `color-scheme`).
- Pré-requisitos manuais de infra: nenhum.
- Working tree compartilhado com `web-auth-forms` (sem commit). Nenhum arquivo deste plano está naquele diff; os root
  layouts que o `/test` edita temporariamente também não.
- `/develop`: o HTML do 500 em produção é o shell `__next_error__` do Next. O F1 do plano (procurar `<link rel="stylesheet">` no `curl`) reprovaria uma entrega correta; o roteiro corrigido está em `develop/handoff.md`.
- `/review`: o diff passou a levar `apps/app`, então a revisão criou a branch `fix/auth-forms-and-global-error-theme`
  (sem projeto, por ter mais de um app) a partir da `web/fix/auth-forms`, que ficou intacta e sem commit. O plano de
  commits em `review/review.md` cobre o working tree inteiro. O critério "Testes e gates" do plano usa 8 casos na app e 9
  na web, não 5 e 6.
- `/test`: a sonda incondicional do plano quebra o `typecheck` do build da app; usei `if (Date.now() > 0) throw …` e
  removi com `git checkout` do arquivo exato. O `review` segue `in-progress` porque os commits do plano ainda não foram
  feitos.
- `/review` da `app-sign-up-copy`: o working tree ganhou uma terceira tarefa (copy do cadastro da app e o "¿" do login).
  A branch `fix/auth-forms-and-global-error-theme` foi mantida, e o plano de commits unificado passou para
  `docs/features/app-sign-up-copy/review/review.md`, com os commits desta tarefa sem mudança.
