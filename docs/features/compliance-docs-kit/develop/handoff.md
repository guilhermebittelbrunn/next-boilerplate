# Handoff do develop: modelos de conformidade

Só documentação. Nenhum arquivo em `apps/`, `packages/`, env, rule ou índice mudou. Rodada autônoma de
`/cycle`, sem pergunta ao usuário.

## Blueprint → arquivos

| Item do plano | Arquivo | Estado |
|---|---|---|
| 10.2 Subprocessadores e transferência internacional | `docs/SUBPROCESSORS.md` | novo |
| 10.3 Registro de operações | `docs/ROPA.md` | novo, 9 registros + 1 em branco para o domínio do fork |
| 10.4 Runbook de incidente | `docs/INCIDENT-RESPONSE.md` | novo |
| 10.5 Backup e restauração | `docs/BACKUP.md` | novo |
| 10.6 Ponteiros | `docs/PRE-PRODUCTION.md` (checkbox no item 7, item 14 novo, frase na rotina final), `docs/FORKING.md` §4 passo 1 | editados |
| 10.5 Adendo da nota | `specs/research/compliance-trust-baseline.md` (seção "Adendo de 2026-09-30", `amended: 2026-09-30`) | editado |

Contrato (SDK/DTO/action): nenhum. Códigos de erro novos: nenhum. i18n: nenhuma chave.

## Desvios do plano

### ⚠️ Três pontos em que o plano estava errado

1. **O DPA que cobre Authentication, Firestore e Storage é o do Google Cloud, não o do Firebase.** A nota
   (adendo de 2026-09-26) e o esqueleto do §10.2 apontavam `firebase.google.com/terms/data-processing-terms`.
   A [tabela de termos do Firebase](https://firebase.google.com/terms) põe os três serviços sob os Google
   Cloud Platform Terms of Service, e a [privacidade do Firebase](https://firebase.google.com/support/privacy)
   diz que eles "are already covered by ... the Cloud Data Processing Addendum" (lido em 2026-09-30). O
   documento usa `cloud.google.com/terms/data-processing-addendum` e `cloud.google.com/terms/subprocessors`,
   e o adendo da nota registra a correção.
2. **O critério "a presença das cláusulas-padrão da ANPD no DPA não foi confirmada" (§9, transferência) não
   vale para dois provedores.** O Cloud DPA (Apêndice 3, seção Brazil, §3.1) incorpora "BR SCCs", que o texto
   em <https://cloud.google.com/sccs/br-c2p?hl=pt-br> chama de "cláusulas-padrão contratuais aprovadas pela
   ANPD"; o adendo de transferência da Stripe (<https://stripe.com/legal/dta>, §11) aplica as "Brazilian
   Standard Contractual Clauses". O documento diz isso por provedor. O que continua não confirmado é se esses
   textos coincidem com o anexo da Res. 19/2024. Resend, Vercel, Google Analytics e Arcjet ficaram "não
   encontrado", como o plano previa. O `/test` deve ler esse critério com a correção.
3. **"ID token já emitido vale até 1 hora" não descreve a API depois de uma revogação.** `getCurrentUser`
   recusa ID token emitido antes de `tokensValidAfterTime` (`packages/auth/server.ts:180-183`, função em
   `:153-165`). O limite real está na desativação pelo admin: `PUT /users/:id` com `disabled` não revoga
   tokens, e `getCurrentUser` não confere `disabled`, então um ID token enviado como bearer
   (`apps/api/(shared)/lib/resolve-api-actor.ts:24`) segue aceito até expirar, pela leitura do código. O
   runbook descreve os dois casos separados. Nenhum dos dois foi medido (ver "A verificar no `/test`").

### Acréscimos e ajustes menores

- **O DPA da Vercel só vale nos planos Pro e Enterprise** ("applies ... for Customers who are on Enterprise
  and Pro plans", <https://vercel.com/legal/dpa>, 2026-09-30), e o Hobby é "non-commercial personal use only"
  (<https://vercel.com/docs/limits/fair-use-guidelines>). Entrou como nota em `SUBPROCESSORS.md` e como um
  parágrafo a mais no item 14 do `PRE-PRODUCTION.md`, fora do pseudo-diff do plano.
- **`BACKUP.md` tem um segundo caminho de volta ao `(default)`: a restauração no lugar** (apagar o banco e
  restaurar com o mesmo id, <https://docs.cloud.google.com/firestore/native/docs/restore-in-place>). O plano
  só tinha export/import, que continua como primeira opção. A página não faz exceção ao `(default)`; não foi
  testado.
- **Restaurar também devolve os rótulos pessoais apagados da trilha**, porque o expurgo apaga
  `actorLabel`/`targetLabel` (`apps/api/(shared)/repositories/audit-event.repository.ts:48-62`) e o backup é
  anterior. Está no passo 4 da restauração.
- **`user.delete` é arquivamento, não exclusão.** O admin marca `deletedAt`
  (`apps/api/app/(routes)/users/[id]/route.ts:169` → `apps/api/(shared)/repositories/base.repository.ts:225-226`);
  `account.delete` é o expurgo do titular. O procedimento separa os dois, e para `user.delete` o admin pode
  arquivar de novo pela tela de usuários.
- **Prazo de complementação para pequeno porte confirmado:** o §8º do art. 6º da Res. 15/2024 dobra "os
  prazos constantes no caput e no § 3º", então 40 dias úteis
  (<https://dspace.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html>, 2026-09-30). Os campos do registro
  vêm do art. 10, §1º (oito itens), no lugar da lista do esqueleto.
- **Tabela de subprocessadores em duas partes**, 9 linhas cada: o que sai e onde o código chama; região e
  contrato. Uma tabela de nove colunas ficaria ilegível.
- **Âncoras que derivaram desde o plano**, conferidas no disco: `packages/security/index.ts:39` e `:81` (o
  plano dizia `:42` e `:84`); `packages/email/index.ts:76-79` (`:75-78`); `packages/auth/server.ts:323-325`
  (`:323-329`); `apps/api/app/(routes)/users/[id]/route.ts:117-122` (`:112-118`); TTL de `paymentEvent` em
  `docs/PRE-PRODUCTION.md:528-536` (`:529-533`).
- **Hipótese legal do formulário de contato**, que o plano não fixava: execução de contrato (art. 7º, V) ou
  legítimo interesse (IX), marcada `[FORK] confirmar`.
- A spec `specs/compliance-docs-kit.md` não foi editada nesta etapa. O diff que aparece nela já estava no
  working tree antes (auditoria do backlog).

## Fontes coletadas em 2026-09-30

Coletadas com `curl -sL` + extração de texto (HTML e `pdftotext`), porque o `WebFetch` não estava disponível
nesta execução. Tudo está no adendo da nota. O que ficou **não confirmado**:

- se `firebase auth:export` exige o Blaze (<https://firebase.google.com/docs/cli/auth> não diz);
- se o DPA da Vercel cobre o Web Analytics (o DPA não lista produtos);
- região do Google Analytics (os termos dizem "any country");
- retenção de e-mail e log na Resend (as páginas lidas não informam);
- DPA da Arcjet (`arcjet.com/dpa` e `arcjet.com/legal` com 404) e o conteúdo de
  `trust.arcjet.com/subprocessors`, que monta por JavaScript;
- se as BR SCCs do Google Cloud e da Stripe coincidem com o anexo da Res. 19/2024; a retificação de
  18/08/2025; o texto integral da Res. 32/2026;
- restauração no lugar sobre o `(default)`.

## Validação

| Verificação | Comando | Resultado |
|---|---|---|
| Lint/format | `pnpm check` | "Checked 806 files in 316ms. No fixes applied." (Biome não lê `.md`; o gate não diz nada sobre estes arquivos) |
| Links relativos | loop `grep -oE '\]\(([^)#]+)'` + `test -e` sobre os 4 documentos, `PRE-PRODUCTION.md`, `FORKING.md` e a nota | 0 quebrados em 85 links relativos (12 + 11 + 8 + 5 + 24 + 21 + 4) |
| Links externos | comando 2 do §8 do plano (`curl -L -w '%{http_code}'`) | 38 URLs únicas nos 4 documentos, 38 com `200` |
| Âncoras `arquivo:linha` | extração de todas as âncoras com caminho dos 4 documentos e da nota, `test -f` + `wc -l` + `sed -n <linha>p` | todas existem, nenhuma fora do arquivo, e a linha impressa bate com a afirmação |
| Inventário de provedores | comando 3 do §8 do plano | só pacotes de Firebase, Stripe, Resend, Arcjet, `@vercel/analytics` e `@next/third-parties/google`, todos com linha |
| Segredo e e-mail | comando 5 do §8 do plano, estendido a `PRE-PRODUCTION.md`, `FORKING.md` e a nota | nenhum acerto nos arquivos novos; os 3 acertos são `example.com` já existentes em `FORKING.md:285-286` e `PRE-PRODUCTION.md:882` |
| Travessão | `grep -c '—\|–'` nos 4 documentos e no adendo | 0 |
| Lacunas | `grep -c "\[FORK\]"` | ROPA 42, SUBPROCESSORS 13, INCIDENT-RESPONSE 13, BACKUP 5 |
| Índice git | `git diff --cached --stat` | só o rename `specs/account-email-change.md → docs/features/account-email-change/spec.md`, que já estava lá; nada foi adicionado |

Typecheck e testes não rodaram: não há código no diff.

## A verificar no `/test`

- **Conta desativada com ID token válido.** Pela leitura, a API aceita o bearer até ele expirar. Repro no
  emulador: entrar como usuário comum, guardar o ID token, desativar a conta como admin (`PUT /users/:id`
  com `{"disabled": true}`), chamar `GET /account` com `Authorization: Bearer <id token>`. O código prevê
  `200`; se vier `401`, o runbook está errado nessa linha.
- **Revogação e emissão de cookie.** `mintSessionCookie` confere o ID token sem checar revogação
  (`packages/auth/session.ts:150`) antes de `createSessionCookie` (`:161`). Repro: revogar as sessões e
  tentar emitir cookie com um ID token anterior à revogação.
- **Coerência dos documentos com o código**, com os comandos 1 a 5 do §8 do plano.
- 🔒 Os comandos de backup, export/import e restauração no lugar: exigem projeto no Blaze. Não verificável
  sem infra.

## Lacunas conhecidas (fora do escopo, continuam abertas)

- Não há rota de admin para revogar a sessão de outro usuário.
- Não há ferramenta que reaplique uma exclusão de conta depois de restaurar backup.
- A API só lê o banco `(default)` (`packages/auth/server.ts:100`).
- `docs/review-checklist.md` não cobra atualizar `SUBPROCESSORS.md` e `ROPA.md` quando entra integração nova
  (pergunta 2 do plano).
