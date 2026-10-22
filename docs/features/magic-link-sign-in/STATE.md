---
slug: magic-link-sign-in
title: Entrar com link enviado por e-mail
task: -
spec: magic-link-sign-in
branch: guilhermebittelbrunn/feature-valor-cycle
epic: -
updated: 2026-10-22 00:56
---

# Pipeline — Entrar com link enviado por e-mail

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-22 00:05 | analyze/plan.md | Flag `EMAIL_LINK_SIGN_IN_ENABLED` só na API; `GET /auth/sign-in/email-link` informa disponibilidade e `POST /auth/sign-in/email-link/request` pede o link no molde da recuperação (resposta igual, entrega em `after()`, rate limit); kind `sign-in` no gerador de links, só para conta com senha e e-mail confirmado (D1); página `/sign-in/email-link` pede e conclui; mutation no `AuthProvider` reaproveita a sessão do login por senha; zero dependência e zero campo no Firestore |
| develop | done    | 2026-10-22 00:25 | develop/handoff.md | SDK, duas rotas (GET disponível com `force-dynamic`, POST no rate limit), kind `sign-in` com filtro D1, mutation no `AuthProvider`, página de pedido e conclusão, i18n nos 3 idiomas e item 15 do PRE-PRODUCTION; check, typecheck e testes verdes; fluxo no navegador fica para o `/test` |
| review  | done    | 2026-10-22 00:33 | review/review.md | Nada bloqueante. Corrigida a página de conclusão, que ficava sem saída quando a sessão não era gravada depois de o código ser aceito. Gates verdes; sete itens para o `/test` medir; plano de 14 commits na branch `feat/magic-link-sign-in`, ainda não criada |
| test    | done    | 2026-10-22 00:56 | test/criterios-aceite.md, test/report.md | 18 critérios: 16 verificados, 2 dependem de infra externa (rate limit com Arcjet, falha do provedor no Firebase real), nenhuma falha. Os sete itens do `/review` confirmados no emulador e no navegador; três testes novos para o estado pós-sucesso; `pnpm test` verde |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As cinco perguntas em aberto já trazem a opção adotada e o motivo,
  no fim do `analyze/plan.md`.
- D1 estreita o corte da spec: conta só Google e conta com e-mail não confirmado não recebem link. A razão é
  medida (emulador nesta análise) e documentada (Firebase remove a senha de conta não verificada no login por
  link). É a Q1.
- O emulador diverge da produção nesse ponto: ele mantém a senha da conta não verificada.
- `/develop` corrigiu um ponto do blueprint: o GET de disponibilidade sem `dynamic = "force-dynamic"` seria
  pré-renderizado no build e congelaria a flag. Os outros desvios estão no `develop/handoff.md`.
- `/review` marcado como `done` pela rodada do `/cycle`, a pedido do orquestrador, sem commit feito: o plano de
  commits e a troca de nome da branch (`git branch -m feat/magic-link-sign-in`) esperam a aprovação do usuário.
  Quando os commits saírem, a seção "Commits realizados" do `review/review.md` precisa ser preenchida.
- O `/review` deixou uma decisão em aberto: o `AuthProvider` engole a falha ao gravar a sessão e a mutation
  termina em sucesso. A página do link já tem uma saída; a correção na raiz pede antes uma mensagem traduzida.
- `/test`: a ferramenta de escrita do subagent recusou gravar o `test/report.md`; o orquestrador do `/cycle`
  gravou o conteúdo devolvido, sem alteração.
- Commits feitos em 2026-10-22 com aprovação do usuário, na branch `guilhermebittelbrunn/feature-valor-cycle`; a
  troca de nome para `feat/magic-link-sign-in` não foi feita. Lista no `review/review.md`.
