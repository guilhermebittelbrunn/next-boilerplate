---
slug: linked-sign-in-methods
title: Métodos de login vinculados à conta
task: -
spec: linked-sign-in-methods
branch: feat/linked-sign-in-methods
epic: -
updated: 2026-10-19 10:03
---

# Pipeline — Métodos de login vinculados à conta

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-16 21:02 | analyze/plan.md | Seção "Métodos de login" na aba Segurança lida do `providerData`; definir senha por `POST /account/password/set` com ID token de reautenticação Google conferido no servidor (provedor `google.com`, `auth_time` até 5 min) e todas as sessões encerradas (D5); vincular Google com `linkWithPopup` no navegador e registro em `POST /account/sign-in-methods/linked`; desvincular no servidor por `DELETE /account/sign-in-methods/[id]` com o último método recusado (409); três ações novas na trilha; checagem "tem senha?" movida para `apps/app/shared/lib/signInMethods.ts`; zero dependência e env novas |
| develop | done    | 2026-10-19 09:13 | develop/handoff.md | Retomada após interrupção. Três rotas, painel "Métodos de login", formulário de definir senha, i18n nos 3 idiomas e docs. Medido no emulador: `updateUser({ password })` acrescenta o provedor e `providersToUnlink` remove a senha, mas apaga o e-mail; a rota devolve o e-mail e, como isso revoga os tokens, desvincular a senha encerra todas as sessões (desvio do plano). Gates: check limpo, typecheck 5/5, api 1280, app 906, auth 132 |
| review  | done    | 2026-10-19 09:19 | review/review.md | Nenhum bloqueante. Corrigido o aviso do diálogo de desvincular a senha nos 3 idiomas (a troca de e-mail não passa pelo canal de privacidade) e a quebra de linha do `FORKING.md`. Em aberto: a falha da devolução do e-mail deixa a conta sem e-mail e sem revogação. Branch `feat/linked-sign-in-methods` criada; 11 commits propostos, nenhum feito. Gates: check limpo, i18n 67, typecheck app+i18n 2/2 |
| test    | done    | 2026-10-19 10:03 | test/report.md  | Rodada 2: o revisor tirou o `reloadCurrentUser()` do desvínculo do Google e trocou o título de definir senha por `h3`. Medido: revincular a mesma identidade sem recarregar funciona, o erro de conexão sumiu (defeito fechado) e o heading é nível 3 com o mesmo visual. 13 critérios ✅, nenhum ❌, 3 🔒. `pnpm test` 15/15, app 914, api 1280, test:emulator 186 |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As 13 perguntas em aberto já vêm com a opção adotada, a
  descartada e o motivo, no fim do `analyze/plan.md`.
- A prova de posse do Google seguiu a recomendação da spec. D5 foi aplicada como a troca de senha faz:
  encerra todas as sessões, inclusive a atual (pergunta 13 do plano).
- Pré-requisitos manuais de infra na seção 12 do plano. Provedor Google e domínios autorizados já estão em
  `docs/FORKING.md:175-179`; a escolha de "User account linking" entra no `FORKING.md` nesta entrega. Três
  critérios dependem de projeto Firebase real e ficam 🔒 (seção 11).
- O `/develop` mede no emulador, antes de seguir, se `updateUser({ password })` acrescenta o provedor
  `password` a uma conta só Google e se `providersToUnlink` remove a senha. A alternativa, se não
  acrescentar, está em "Riscos".
- O `/test` cria a conta só Google pelo popup do emulador; o seed não tem uma (seção 10 do plano).
- Deriva da spec registrada no fim do plano: desvincular sai do cliente para o servidor, e
  `packages/auth/provider.tsx` não muda.
- `review = done` marcado pelo `/review` dentro do `/cycle`, que não commita. Os commits do plano em
  `review/review.md` dependem da aprovação do usuário.
- `/test` rodou contra o emulador de Auth com o IdP falso do Google. As contas de QA existiram só no
  emulador; nenhuma conta foi criada em projeto real.
- Rodada 1 do `/test` para o `/review` (2026-10-19): o reload do Firebase saiu do desvínculo, porque a
  falha dele mostrava erro depois de um `204` e, pelo código do SDK, ele não mudava o vínculo seguinte. O
  título "Definir senha" virou `<h3>`. O relink logo após desvincular ficou para o `/test` medir. Detalhes
  em `review/review.md`.
- `/test` rodada 2: app servida na 3100, porque a 3000 estava com um processo de outro workspace.
