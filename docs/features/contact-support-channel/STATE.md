---
slug: contact-support-channel
title: Canal de contato e suporte que entrega a mensagem
task: -
spec: contact-support-channel
branch: feat/contact-support-channel
epic: -
updated: 2026-10-19 12:15
---

# Pipeline — Canal de contato e suporte que entrega a mensagem

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-19 10:59 | analyze/plan.md | Rota pública `POST /contact` (Zod, rate limit no proxy, `503 CONTACT_UNAVAILABLE` sem caixa ou sem Resend) entrega o template `contact` em `getBrand().supportEmail` com `replyTo` do visitante; `ownerInbox` vira `supportInbox`; formulário da landing com `HookForm*` pelo SDK e aviso de indisponível quando a caixa falta; server action e dois testes dela saem; "Ajuda e contato" no menu do perfil abre a landing em aba nova com o e-mail preenchido pela sessão compartilhada, nunca pela URL; zero dependência e env novas |
| develop | done    | 2026-10-19 11:15 | develop/handoff.md | `POST /contact` pública (Zod, rate limit, `503 CONTACT_UNAVAILABLE`) entrega em `supportInbox()`; formulário da landing pelo SDK com aviso de indisponível, e-mail preenchido pela sessão e confirmação; "Ajuda e contato" no menu do perfil; i18n nos 3 idiomas; docs alinhados (incluindo `SUBPROCESSORS.md`, fora do plano); typecheck, `pnpm check` e testes verdes |
| review  | in-progress | 2026-10-19 12:15 | review/review.md | Rodada 1: sem bloqueante; corrigidos o inventário de guards do `SECURITY.md` (41 rotas, 15 sem guard), seis âncoras deslocadas pelo `proxy.ts` e o limite de 320 do e-mail na landing; branch `feat/contact-support-channel` criada. Rodada 2: trava do envio duplo com `useRef` liberada no `onSettled` (teste novo falha com a guarda antiga, 8/8 com a trava); plano de 12 commits |
| test    | done    | 2026-10-19 11:58 | test/report.md | 16 ✅, 0 ❌, 4 🔒 (entrega real no Resend, confirmação no browser, 429 com `ARCJET_KEY`, preenchimento em domínio real); 10 itens do review confirmados; 2 lacunas fechadas (`page.tsx` e e-mail > 320); `pnpm test` 15/15; achado 🟢: dois `submit` na mesma tarefa de JS geram 2 requisições |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As 10 perguntas em aberto já trazem a opção adotada, a descartada
  e o motivo, no fim do `analyze/plan.md`.
- D7 aplicada: o destino é `NEXT_PUBLIC_APP_SUPPORT_EMAIL`. A recomendação da spec (página da landing com e-mail
  preenchido) foi mantida; o e-mail vem de `useAuth()` na landing porque `?email=` iria para o GA no
  `page_location`.
- Pré-requisitos manuais de infra na seção 11 do plano. Três critérios dependem de Resend, `ARCJET_KEY` ou cookie
  de domínio real e ficam 🔒 (seção 10).
- Remoções previstas e justificadas na seção 8 do plano: `contact/actions/contact.tsx`, `contactAction.test.ts`
  e `contactFormDateLocale.test.tsx` (o assunto deles sai do código).
- Rodada 2 do `/review` mudou `contact-form-client.tsx` depois do `/test`: a trava do envio duplo. A mudança foi
  medida só por teste de componente (`contactFormPrefill.test.tsx`, 8/8); o envio pelo navegador não foi refeito.
