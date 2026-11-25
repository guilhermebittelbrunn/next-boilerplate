---
topic: signup-email-verification-code
question: Um boilerplate deve exigir a confirmação do e-mail por código antes de liberar o painel no cadastro, e com que parâmetros (tamanho, validade, tentativas, reenvio)?
lens: confianca
panel: [nist-sp-800-63b-rev4, clerk, supabase-auth, better-auth, auth0, firebase-auth]
collected: 2026-11-24
revalidate_after: 2027-05-24
confidence: média
---

# Confirmação de e-mail por código no cadastro

## Resposta curta

Exigir a confirmação antes de liberar o acesso é o padrão em 2 de 5 provedores de autenticação consultados
(Clerk e Supabase hospedado). Confirmar por código de 6 dígitos é o padrão no Clerk e opção no Supabase, no
Better-Auth e, segundo artigo de suporte, no Auth0. O Firebase, base deste repo, só oferece link. O NIST
proíbe e-mail como segundo fator de autenticação, mas exclui dessa proibição o código que confirma o endereço.
Na prática: código no cadastro é confirmação de posse do e-mail, não 2FA, e o segundo fator de verdade é
TOTP.

## Prevalência

Painel de 5 provedores de autenticação mais a norma NIST. Lidos em 2026-11-24.

| Referência | Bloqueia acesso até confirmar? | Código por e-mail? | Validade / tentativas / reenvio | Fonte |
|------------|-------------------------------|--------------------|---------------------------------|-------|
| Clerk | sim: o cadastro só fica `complete` depois da verificação, e só então a sessão é ativada | sim, padrão ("Email verification code is enabled by default") | código vale 10 min; reenvio após 30 s | clerk.com/docs |
| Supabase Auth | sim em projeto hospedado ("On hosted Supabase projects, this is true by default") | OTP de 6 dígitos no login sem senha; no cadastro com senha a doc mostra link | 1 pedido a cada 60 s; expira em 1 h por padrão | supabase.com/docs |
| Better-Auth (plugin `email-otp`) | não confirmado na página do plugin | opção: `overrideDefaultEmailVerification` troca o link pelo código | 6 dígitos, 300 s, 3 tentativas; reenvio gera código novo por padrão | better-auth.com/docs |
| Auth0 | não confirmado | link por padrão; código como opção segundo artigo de suporte, não confirmado na doc principal | não confirmado | support.auth0.com (via busca) |
| Firebase Auth | não; o app decide | não; só link de verificação e login por link | n/a | firebase.google.com/docs |

Totais: bloqueio por padrão em 2 de 5; código como padrão em 1 de 5 e disponível em mais 2 confirmados (3 se
contar o Auth0). Firebase não tem código nativo, então o código seria implementado pelo próprio repo.

## O que o mercado trata como o mínimo

- 6 dígitos (Supabase, Better-Auth; NIST pede pelo menos 6 dígitos decimais para segredo fora de banda).
- Validade curta: 5 min (Better-Auth), 10 min (Clerk; NIST para autenticação fora de banda), 1 h
  (Supabase).
- Limite de tentativas por código (Better-Auth: 3) e intervalo entre reenvios (Clerk 30 s, Supabase 60 s).
- Reenvio que gera código novo e invalida o anterior (Better-Auth, `resendStrategy: "rotate"` por padrão).

## O que é opcional / avançado

- Código também no login (e-mail como fator): o NIST desaconselha como autenticação.
- Configurar o método (link ou código) por projeto (Auth0, Better-Auth).

## Obrigações e requisitos externos

- NIST SP 800-63B rev. 4, § 3.1.3.1: "Email SHALL NOT be used for out-of-band authentication"; a mesma seção
  diz que códigos de confirmação de endereço de e-mail "are not authentication processes and not affected by
  the above prohibition".
- § 3.1.3.2: segredo fora de banda com pelo menos 6 dígitos decimais; autenticação inválida se não concluída
  em 10 minutos; abaixo de 64 bits de entropia, limitar tentativas.
- § 3.2.2: no máximo 100 falhas consecutivas por autenticador; o limite pode ser menor.
- Firebase: MFA exige e-mail verificado ("MFA requires email verification"), e os fatores documentados são
  SMS e TOTP, com upgrade para Identity Platform. E-mail não aparece como segundo fator.

## Armadilhas conhecidas

- Bloquear o painel até confirmar depende de o e-mail sair. Sem provedor configurado, o bloqueio trancaria
  todo cadastro novo.
- Quem fecha a aba no meio volta com conta criada e e-mail não confirmado; o bloqueio precisa estar no
  servidor e levar de volta à tela do código, não depender do estado do formulário.
- Código curto exige limite de tentativas próprio. Limite só por IP (rate limit de borda) não protege contra
  tentativa distribuída sobre a mesma conta.

## Custo herdado por todo fork

- Zero quando o fork não configura e-mail: o fluxo atual continua.
- Com e-mail: um envio por cadastro e por reenvio no provedor (Resend). Escrita de estado do código no
  Firestore, poucas por cadastro.
- Nenhuma variável nova se a ativação seguir a detecção de e-mail que já existe.

## Fontes

- https://pages.nist.gov/800-63-4/sp800-63b.html (acesso em 2026-11-24): §§ 3.1.3.1, 3.1.3.2, 3.2.2.
- https://clerk.com/docs/guides/development/custom-flows/authentication/email-password (acesso em
  2026-11-24): cadastro só completa depois da verificação por código, que é o padrão.
- https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options (acesso em 2026-11-24):
  código válido por 10 min, reenvio após 30 s.
- https://supabase.com/docs/guides/auth/passwords (acesso em 2026-11-24): confirmação obrigatória por padrão
  em projeto hospedado.
- https://supabase.com/docs/guides/auth/auth-email-passwordless (acesso em 2026-11-24): OTP de 6 dígitos, 60 s
  entre pedidos, expira em 1 h.
- https://better-auth.com/docs/plugins/email-otp (acesso em 2026-11-24): 6 dígitos, 300 s, 3 tentativas,
  `overrideDefaultEmailVerification`, `resendStrategy`.
- https://support.auth0.com/center/s/article/Sending-verification-email-with-OTP-code (só pelo resultado de
  busca, página não lida): código como alternativa ao link.
- https://firebase.google.com/docs/auth/web/multi-factor (acesso em 2026-11-24): MFA exige e-mail verificado;
  fatores SMS e TOTP.
