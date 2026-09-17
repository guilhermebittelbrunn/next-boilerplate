---
slug: session-refresh
title: Renovação deslizante da sessão
task: -
spec: session-refresh
branch: auth/feat/session-refresh
epic: -
updated: 2026-09-17 20:27
---

# Pipeline — Renovação deslizante da sessão

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-17 16:36 | analyze/plan.md | Teto absoluto imposto em `mintSessionCookie`, rota `POST /api/auth/session/refresh` com throttle, claim `sessionAuthTime` carregada pelo SSO |
| develop | done    | 2026-09-17 17:51 | develop/handoff.md | Teto, throttle e rota de renovação em `packages/auth`; claim `sessionAuthTime` confirmada contra o emulador; 39 testes novos |
| review  | done    | 2026-09-17 20:15 | review/review.md | Rodada 1: laço de redirecionamento corrigido em `provider.tsx` e `SignInForm.tsx`. Rodada 2: `?redirect=` do proxy deixou de ser sobrescrito na tela de login, medido no browser, 2 testes novos |
| test    | done    | 2026-09-17 20:27 | test/report.md  | 21 critérios ✅ e 1 🔒 (revogação ponta a ponta, só com Firebase real); o ❌ do `?redirect=` foi corrigido pela revisão e reverificado no browser; 8 testes novos fixam o laço |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma. As dez perguntas em aberto já vêm decididas, cada uma com a alternativa
  descartada, no fim do `analyze/plan.md`.
- **A spec estava desatualizada num ponto que muda o desenho.** Ela afirma que "nada renova"
  (`specs/session-refresh.md:52`). Renova: `onIdTokenChanged` → `applySignedInUser` → `POST
  /api/auth/session` regrava o cookie de hora em hora, sem teto e sem ninguém ter decidido isso
  (§1.1 do plano). O item de maior valor do corte passa a ser o teto absoluto, não o caminho de renovação.
- O teto é imposto em `mintSessionCookie`, não na rota nova. Só na rota ele seria decorativo: o
  `provider.tsx` chama o `sessionPOST` direto e passaria por cima.
- **Pressuposto do §7.1 verificado no `/develop` e confirmado**: `createSessionCookie` preserva a claim
  `sessionAuthTime` do ID token no cookie, e ela sobrevive também ao `signInWithCustomToken`, como número.
  Medido contra o emulador de Auth antes de construir em cima. O fallback não foi necessário.
- **A revogação não é verificável sob o emulador.** `verifySessionCookie(cookie, true)` aceita o cookie
  depois de `revokeRefreshTokens`, o que atinge igualmente o `getUserFromSessionCookie` que o proxy já usa.
  O caminho está coberto por teste unitário; a verificação de ponta a ponta exige projeto Firebase real.
  Ver `develop/handoff.md`.
- Contenção alta com a spec `account-security-mfa`, que declara os mesmos três arquivos de `packages/auth`.
  As duas não podem rodar no mesmo lote.
- `packages/auth` declara `next: 15.1.3` enquanto o monorepo está em `16.0.0`. Fora do raio da tarefa. O
  risco para este plano foi avaliado no §7.4 e é baixo: a única API do Next tocada é `cookies()`, já
  `await`ada e igual nas duas majors.
- **Pré-requisito manual de infra: um só, e não bloqueia.** `SESSION_ABSOLUTE_MAX_AGE_DAYS` na Vercel,
  apenas se o fork quiser um teto diferente de 30 dias. Sem rules, índice, webhook ou serviço a ativar.
  Nenhum critério de aceite depende de infra externa.
- Linha de base dos gates medida na análise: `pnpm check` 601 arquivos 0 erros ·
  `pnpm turbo run lint typecheck test` 24/24 tasks · 1276 testes em 130 arquivos.
- Gates depois do `/develop`: `pnpm check` 605 arquivos 0 erros · 24/24 tasks · 1315 testes em 132
  arquivos. Nenhum teste existente editado ou desativado.
- **A revisão achou um laço de redirecionamento e corrigiu.** Com o teto estourado e o cookie já ausente,
  `POST /api/auth/session` recusa, e os dois chamadores no cliente ignoravam a recusa: a tela ficava presa
  entre `/pt-br` e `/pt-br/sign-in` com spinner permanente. Correção em `packages/auth/provider.tsx` e em
  `apps/app/.../sign-in/components/SignInForm.tsx`, verificada no browser. Ver `review/review.md`.
- Gates depois do `/review`: iguais aos do `/develop` (605/0 · 24/24 · 1315 testes em 132 arquivos).
- **Segunda rodada do `/review`, a pedido do `/test`.** O `?redirect=` montado pelo proxy era sobrescrito
  quando a expiração aparecia já na tela de login, e o re-login caía em `/pt-br` em vez do destino
  original. `handleSessionExpired` passou a preferir o destino que já está na URL, sanitizado por
  `postAuthRedirectTarget`. Medido no browser: o re-login volta para `/pt-br/entities`. Dois casos novos em
  `apps/app/__tests__/sessionExpiredSignOut.test.tsx` fixam o contrato, e falham sem a correção. Gates:
  607/0 · 24/24 · 1325 testes em 134 arquivos.
- **O laço que a revisão corrigiu agora tem teste.** Dois arquivos novos em `apps/app/__tests__`
  (`sessionExpiredSignOut.test.tsx` e `signInPersistedSessionRedirect.test.tsx`, 8 casos) cobrem o caminho
  `sessionPOST` → 401 `AUTH_SESSION_EXPIRED` → `handleSessionExpired` e o efeito do `SignInForm` que não
  navega em 401. Ambos foram conferidos contra o código anterior à correção e falham nele.
- Gates finais, medidos pelo `/test` depois da segunda rodada de revisão: `pnpm check` 607 arquivos 0
  erros · 24/24 tasks · 1325 testes em 134 arquivos. Nenhum teste existente editado, desativado ou
  afrouxado em nenhuma das etapas.
- **O critério 7 foi reverificado pelo `/test`, não aceito de segunda mão.** Ambiente novo, mesmo repro:
  login, 314 s sem tocar na aba, recarga de `/pt-br/entities`. A URL fica em
  `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities` e permanece lá depois da navegação do cliente; duas
  requisições de auth e nenhum laço; autenticando ali, a listagem volta. Screenshots `11` e `12`.
- **A cobertura dos dois conjuntos de teste é complementar, e foi medida por mutação.** Revertendo
  `expiredSessionOrigin` para o pathname, só os dois casos da revisão falham: os seis do `/test` passam
  verdes. Os primeiros provam para onde a navegação aponta, os segundos provam que a sessão morta desloga
  sem laço. Por isso não houve caso adicional.
- **A revogação continua 🔒**, com a classificação explícita: nem aprovada nem reprovada. O código chama
  `getSessionFromCookie` com `checkRevoked` antes do mint e o caso tem teste unitário, mas o emulador
  aceita o cookie revogado e não permite a verificação de ponta a ponta. Por ser pré-requisito de infra
  externa, não impede o fechamento da etapa.
- **Efeito colateral do throttle, medido e registrado.** A checagem do teto roda depois do limiar de
  renovação, então uma sessão pode sobreviver ao teto por até metade da vida do cookie: 32,5 dias com os
  padrões de 5 e 30 dias. Medido com janelas de 302 s (navegação passou aos 317 s, recusa veio aos 345 s).
  A revisão já tinha registrado a ordem de execução como 🟡; a decisão de mantê-la é de produto.
