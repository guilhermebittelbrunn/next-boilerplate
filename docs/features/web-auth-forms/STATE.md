---
slug: web-auth-forms
title: Formulários de login e cadastro da landing
task: -
spec: none (achado BACKLOG)
branch: fix/auth-forms-and-global-error-theme
epic: -
updated: 2026-10-21 21:25
---

# Pipeline: formulários de login e cadastro da landing

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-21 20:56 | analyze/plan.md | Só `apps/web`, dois `*-form-client.tsx`: login manda para `/${locale}` quem chega autenticado (efeito com `useRef` para não perder o `?redirect=` do provider); cadastro pede `sendEmailVerification({ locale })` pelo SDK e descarta a falha (503 sem Resend); `px-4 md:px-2` e `noValidate` nos dois; 1 teste novo e 2 editados; sem SDK, API, i18n ou env |
| develop | done    | 2026-10-21 20:59 | develop/handoff.md | Login navega para `/${locale}` quem chega autenticado (`signInStartedHereRef` deixa o login feito na tela com o provider); cadastro pede `sendEmailVerification({ locale })` e descarta a falha; `px-4 md:px-2` e `noValidate` nos dois; web 199/199 testes (10 novos), typecheck exit 0, `pnpm check` limpo |
| review  | in-progress | 2026-10-21 21:05 | review/review.md | Sem bloqueante nem correção; fim de sessão confirmado por leitura (o `logout` zera o `user` antes do `router.push`); 3 🟢 registrados; `pnpm check` 970 arquivos limpo, typecheck da web exit 0; branch `web/fix/auth-forms` criada e validada no regex; 4 commits propostos |
| test    | done    | 2026-10-21 21:25 | test/report.md, test/criterios-aceite.md | 11 critérios ✅, 0 ❌, 1 🔒 (entrega real do e-mail); os 6 itens do "Verificar no `/test`" confirmados no navegador com emulador, 3 idiomas, claro/escuro, 375 px; `?redirect=` preservado 5 de 5 vezes; cadastro gera `POST /auth/email-verification/send` 503 `EMAIL_NOT_CONFIGURED` sem toast de erro; teste novo `signUpFormValidation` (4); web 203/203, `pnpm test` 15/15 tasks; portas liberadas |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação da auditoria pós-PR #54 (`specs/BACKLOG.md:263-301`). Rodada autônoma do
  `/cycle`: as seis decisões da §11 do plano já vêm com a opção adotada.
- Desvio da recomendação do BACKLOG: o efeito do login não é cópia literal do cadastro. A cópia concorreria com o
  `AuthProvider` e perderia o `?redirect=` do fim de sessão (§1.3 e D1 do plano). O `/test` mede isso no fluxo F3.
- Pré-requisitos manuais de infra: nenhum para o `/develop`. A entrega real do e-mail de verificação fica 🔒 (Resend,
  `NEXT_PUBLIC_APP_URL` e `FIREBASE_WEB_API_KEY` na `apps/api`; §13 do plano e pendência 13 do BACKLOG).
- `specs/BACKLOG.md`, `specs/account-security-mfa.md` e `specs/observability-logging.md` estão modificados no working
  tree pela auditoria, que não pertence a esta tarefa; este passo não mexeu neles.
- `/test`: a etapa `review` continua `in-progress` porque os commits do plano ainda não foram feitos (`git log main..HEAD`
  vazio); no `/cycle` isso é esperado, e quem fecha o gate é o orquestrador do `/review` depois de commitar.
- `/test`: teste novo `apps/web/__tests__/signUpFormValidation.test.tsx` no working tree. Vai no commit do cadastro
  (`fix(web): request the verification e-mail after a landing sign-up`).
- `/review` da `global-error-theme`: o working tree ganhou `apps/app`, e a revisão daquela tarefa criou a branch
  `fix/auth-forms-and-global-error-theme` a partir desta. Os commits desta tarefa entram no plano unificado de
  `docs/features/global-error-theme/review/review.md`, com o `signUpFormValidation.test.tsx` no commit do cadastro.
- `/review` da `app-sign-up-copy`: o working tree ganhou uma terceira tarefa (copy do cadastro da app e o "¿" do login).
  A branch `fix/auth-forms-and-global-error-theme` foi mantida, e o plano de commits unificado passou para
  `docs/features/app-sign-up-copy/review/review.md`, com os commits desta tarefa sem mudança.
