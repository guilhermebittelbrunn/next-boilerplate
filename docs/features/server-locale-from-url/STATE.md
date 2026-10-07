---
slug: server-locale-from-url
title: O idioma renderizado no servidor sai da URL, não do cookie
task: -
spec: none
branch: fix/server-locale-from-url
epic: -
updated: 2026-10-07 19:04
---

# Pipeline — O idioma renderizado no servidor sai da URL, não do cookie

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-07 18:20 | analyze/plan.md | Os dois proxies repassam o idioma da URL no header de requisição `x-request-locale` (mesmo mecanismo do `x-app-path`) e `getDictionary()` lê header → cookie `x-locale` → padrão (via `resolveLocale`); `cookieStore.set` dos proxies fica; nenhum dos 18 chamadores nem os layouts mudam; `NotFoundPage` da app passa a usar `getDictionary()`; 12 casos Vitest (9 falham no código atual); 5 docs corrigidos; sem SDK, API, i18n, env ou infra; 7 commits sugeridos |
| develop | done    | 2026-10-07 18:29 | develop/handoff.md | `getDictionary()` lê `x-request-locale` → cookie → padrão (`resolveLocale`); os dois proxies repassam o header com `set`; o ramo de asset da app descarta o header vindo do navegador (desvio do plano); `NotFoundPage` usa `getDictionary()`; 11 testes novos falharam no código antigo; `pnpm check` e typecheck/test de i18n, web e app verdes |
| review  | in-progress | 2026-10-07 18:59 | review/review.md | Rodada 2 após o `/test`: O2 corrigido com `DocumentLangSync` no root layout da app (o `<html lang>` acompanha a troca suave de idioma; teste jsdom falhou antes e passa depois); rodada 1 corrigiu JSDoc e `ARCHITECTURE.md`; repro do item 7 trocado para `/x/y/nao-existe.txt`; O1, O3 e o redirect com padrão inválido vão para o backlog; branch `fix/server-locale-from-url`; 9 commits propostos |
| test    | done    | 2026-10-07 19:04 | test/report.md  | Rodada 2: 11 ✅, 0 ❌, 0 🔒 em build de produção. O ❌ da rodada 1 (troca suave na app sem atualizar o `<html lang>`, antigo) foi corrigido pelo `DocumentLangSync` do `/review` e remedido: `en`→`es`→`pt-br` com uma mudança do atributo por troca, e o 404 raiz mantém o `lang` do servidor. app 826 testes; 3 achados antigos para o backlog |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir da recomendação da auditoria de 2026-10-07 em `specs/BACKLOG.md:177-210` e
  do achado em `specs/BACKLOG.md:547`. Plano feito em rodada autônoma do `/cycle`: as 7 perguntas da §11 já vêm
  com a opção adotada, e as decisões tomadas sem perguntar estão na §12.
- A contagem da auditoria ("27 chamadores") foi refeita: 27 arquivos importam o módulo do servidor, 18 chamam
  `getDictionary()` (16 web, 2 app). Os outros 9 da app já usam `getTranslations` com o idioma dos `params`
  (plano, §1.2).
- O critério 4 não fecha literalmente para a metade "cookie" do caso 3, que é comportamento preservado e por
  isso passa no código atual. A justificativa e a cobertura alternativa estão na pergunta 5 do plano.
- O `/test` mede em `build && start` das duas apps, nunca em `next dev`.
- Pré-requisitos manuais de infra: nenhum.
- O `/test` precisa remedir só o item 10 do `review/review.md` (troca suave de idioma na app e o 404 raiz
  depois da hidratação); a linha `test` acima é da rodada anterior à correção.
