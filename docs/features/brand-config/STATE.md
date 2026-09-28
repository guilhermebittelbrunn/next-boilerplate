---
slug: brand-config
title: Marca num lugar só e roteiro de criação de fork
task: -
spec: brand-config
branch: -
epic: -
updated: 2026-09-27 12:10
---

# Pipeline — Marca num lugar só e roteiro de criação de fork

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-27 11:20 | analyze/plan.md | `getBrand()` em `packages/next-config/brand.ts` lido por barra lateral, painel de entrada, header/footer/JSON-LD da web, `createMetadata` e e-mails (corpo, suporte e remetente); depoimento de exemplo removido; ícones do app; CSP aceita a origem do logo; `docs/FORKING.md` novo |
| develop | done    | 2026-09-27 11:38 | develop/handoff.md | Marca lida de `getBrand()` em app, web, metadata e e-mails; depoimento fora; ícones do app; CSP com a origem do logo; `FORKING.md`. Dois desvios corrigem o plano: `signUp.layout` e o `favicon.ico` em RGBA |
| review  | done    | 2026-09-27 11:50 | review/review.md | Sem bloqueante. Dois achados corrigidos: host de logo com `;` quebrava a CSP (`brand.ts`) e o `FORKING.md`/`PRE-PRODUCTION.md` mandavam hospedar o logo na web, que não serve arquivo solto. Branch proposta `feat/brand-config`; 16 commits aguardam aprovação |
| test    | done    | 2026-09-27 12:10 | test/report.md  | 14 critérios ✅, 0 ❌, 1 🔒 (nome não ASCII no inbox da Resend). `pnpm test` 12/12, 2208 testes; 11 itens do review medidos em `build && start`; 5 observações anteriores à entrega, nenhuma bloqueante |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As três perguntas em aberto já vêm com a opção adotada, e as
  13 decisões tomadas sem perguntar estão no fim do `analyze/plan.md`, cada uma com a alternativa descartada.
- Ajuste ao sinal de pronto da spec: o `grep` por "Acme" é medido excluindo `__tests__`, porque as
  fixtures de entidade e os testes de credencial da Resend usam o nome como dado de exemplo.
- Nenhum pré-requisito de infra bloqueia a entrega. Variáveis de marca em produção, logo hospedado e ícones
  do produto são do fork e ficam no item 13 do `PRE-PRODUCTION.md`.
- `/develop`: o `favicon.ico` que o plano descrevia (PNG gray+alpha embutido) fazia toda rota do app
  responder 500 no `next dev`. Saiu em RGBA, e o teste de ícones cobra o formato.
- `/review`: rodou dentro do `/cycle`, que proíbe criar branch e commitar. A etapa fica `done` para o
  `/test` seguir; a branch `feat/brand-config` e os 16 commits do `review/review.md` só existem depois da sua
  aprovação.
- `/test`: testes novos no working tree (`brandSurfaces.test.tsx` e casos em `brand.test.ts`, nos dois
  `securityPolicySources.test.ts` e em `templates.test.tsx`), para o `/review` incluir nos commits 1, 3, 8,
  10 e 11 do plano. Portas e emuladores devolvidos; nenhuma conta criada fora do emulador.
