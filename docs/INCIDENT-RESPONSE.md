# Resposta a incidente de segurança com dados pessoais

> **Modelo, não parecer jurídico.** Este documento vem preenchido com o que o boilerplate faz e marca com
> `[FORK]` o que só o produto pode preencher. Revise com quem responde juridicamente pelo produto antes de
> usar como procedimento oficial.
>
> Fontes coletadas em 2026-09-30. Base na nota
> [`compliance-trust-baseline`](../specs/research/compliance-trust-baseline.md), a revalidar depois de
> 2027-08-21. Prazo legal muda com resolução nova; confira antes de confiar num número daqui.

Roteiro para quem está de plantão quando alguém descobre que dado pessoal vazou, foi alterado, apagado ou
ficou inacessível. Leia os papéis e os prazos antes do primeiro incidente, não durante.

## Papéis

| Papel | Quem |
|---|---|
| Decide se o incidente é comunicado, e quando | `[FORK]` |
| Encarregado ou canal do titular | `NEXT_PUBLIC_PRIVACY_CONTACT`; vazio, o canal é o formulário de `/contact` (`apps/web/shared/lib/privacyContact.ts:10-19`) · `[FORK]` |
| Contato técnico de plantão | `[FORK]` |
| Quem tem acesso aos consoles (Firebase, Vercel, Stripe, Resend, Arcjet) | `[FORK]` |
| Quem envia a comunicação à ANPD | o controlador, pelo encarregado ou por representante com procuração (Res. CD/ANPD 15/2024, art. 6º, §5º) · `[FORK]` |

## Prazos

Os prazos da ANPD contam em **dias úteis** a partir do momento em que o controlador sabe que o incidente
afetou dados pessoais (art. 6º, §1º, e art. 9º). Fonte:
[Res. CD/ANPD 15/2024](https://dspace.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html), lida em
2026-09-30.

| Para quem | Prazo | Agente de pequeno porte | Fonte |
|---|---|---|---|
| ANPD | 3 dias úteis | 6 dias úteis | art. 6º, caput e §8º |
| ANPD, complementação fundamentada | 20 dias úteis a contar da comunicação | 40 dias úteis | art. 6º, §3º e §8º |
| Titular | 3 dias úteis, em linguagem simples e de forma individual | 6 dias úteis | art. 9º, caput e §6º |
| ANPD, declaração de que o titular foi comunicado | 3 dias úteis após o fim do prazo do titular | não dobra no texto | art. 9º, §4º |
| Divulgação pública, se não der para avisar cada titular | no mínimo 3 meses no ar | igual | art. 9º, §3º |
| Autoridade de controle na UE | 72 horas, salvo se for improvável que o incidente gere risco | igual | GDPR art. 33(1) |
| Titular na UE | "without undue delay", só quando o incidente é "likely to result in a high risk" | igual | GDPR art. 34(1) |
| Registro interno | todo incidente, inclusive o não comunicado, por no mínimo 5 anos | igual | Res. 15/2024, art. 10 |

Quem é pequeno porte está na Res. CD/ANPD 2/2022, art. 2º; tratamento de alto risco tira a empresa dessa
categoria (art. 3º). Resumo na [nota de pesquisa](../specs/research/compliance-trust-baseline.md).
`[FORK]` O fork é agente de pequeno porte? `[FORK]` Atende titulares na União Europeia?

## 1. Conter

| Ação | Como, neste repositório | Limite |
|---|---|---|
| O titular encerra as próprias sessões | `POST /account/sessions/revoke`, na área de conta (`apps/api/app/(routes)/account/sessions/revoke/route.ts:7-8`), que chama `revokeRefreshTokens` (`packages/auth/server.ts:330-332`) | A API passa a recusar o cookie de sessão (`packages/auth/server.ts:305-308`, com revogação conferida) e o ID token de login anterior à revogação (`packages/auth/server.ts:183-186`). Até expirar, em até 1 hora (nota de pesquisa, sessão segura), o ID token só passa na verificação local sem revogação, que a emissão do cookie faz antes de chamar o Firebase (`packages/auth/session.ts:150`). O Firebase recusa trocá-lo por cookie novo: medido em 2026-09-30 contra um projeto de dev, `createSessionCookie` (`packages/auth/session.ts:161`) lança `auth/id-token-expired`, e a rota de sessão responde `401 AUTH_INVALID_TOKEN` (`packages/auth/session-routes.ts:87`). |
| O admin bloqueia uma conta | `PUT /users/:id` com `disabled: true` (`apps/api/app/(routes)/users/[id]/route.ts:110`, `:144-149`), que em seguida revoga as sessões da conta (`revokeUserSessions`, `:151-153`) | A API recusa a conta desativada já na requisição seguinte, nos dois transportes. O cookie de sessão cai na conferência com revogação, que também recusa conta desativada (`packages/auth/server.ts:291-309`). O ID token enviado como bearer passa por `getIdTokenSession` (`apps/api/(shared)/lib/resolve-api-actor.ts:35`), que olha `disabled` no registro do usuário que já carrega (`packages/auth/server.ts:183-186`) e responde `401 AUTH_INVALID_TOKEN`. Isso vale também para conta desativada direto no console do Firebase, que não passa pela revogação. Como o `PUT` revoga as sessões, reativar a conta não ressuscita os tokens anteriores e a pessoa precisa entrar de novo. Se a revogação falhar, o erro vai só para o log e o bloqueio segue valendo pela checagem de `disabled`; perde-se apenas essa garantia na reativação. A recusa do bearer está coberta por teste de unidade (`packages/auth/__tests__/serverSessionRevocation.test.ts`). Medido em 2026-09-30 contra um projeto de dev, com conta de QA: com a conta só desativada, sem revogação, a API respondeu `401 AUTH_INVALID_TOKEN` ao bearer emitido antes, e o mesmo bearer voltava a passar quando a checagem de `disabled` era retirada do código. Depois do `PUT` que desativa e do que reativa, o bearer antigo continuou recusado e um login novo funcionou. |
| Revogar a sessão de outro usuário | Não existe rota de admin só para isso. A saída é desativar a conta e reativá-la pelo mesmo `PUT /users/:id`: a desativação revoga as sessões e a reativação devolve o acesso, com login novo. | `[FORK]` se precisar revogar sem bloquear a conta, nem por um instante, use o Admin SDK num script fora do repositório. |
| Rodar credencial vazada | Trocar o valor no painel do provedor e na Vercel de cada app, e fazer deploy novo: `FIREBASE_ADMIN_PRIVATE_KEY` (nova chave da service account e apagar a antiga), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_TOKEN`, `ARCJET_KEY`, `FIREBASE_WEB_API_KEY` | Variável `NEXT_PUBLIC_*` só muda com deploy novo. Nunca cole o valor antigo nem o novo no registro do incidente. |
| Base exposta por rule errada | Republicar `firestore.rules` e `storage.rules` do repositório | Nunca afrouxar rule como rollback ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 1). |
| Dado apagado ou corrompido | Restaurar pelo procedimento de [`BACKUP.md`](BACKUP.md) | No plano Spark não existe backup de nenhum tipo. |

## 2. Levantar evidência

Colete antes de mudar qualquer coisa que apague rastro, e guarde fora do repositório.

| Fonte | O que tem | Limite |
|---|---|---|
| Trilha de auditoria em `/admin/audit` (`GET /audit-events`, só admin: `apps/api/app/(routes)/audit-events/route.ts:10`) | ações sensíveis com quem agiu, sobre quem, quais campos mudaram e o `requestId`; ações registradas em `packages/sdk/src/types/audit/audit.ts:2-11`; filtro por usuário e por período | retenção não decidida ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §1.3); não registra leitura de dado |
| Log estruturado da API, no stdout da plataforma | uma linha por evento, `[escopo] evento chave=valor` (`packages/shared/utils/helpers/log.ts:51-57`), com os escopos `account`, `audit`, `auth`, `auth-action-link`, `email`, `payments`, `request`, `security` e `storage` (`packages/shared/utils/helpers/log.ts:5-14`). O `requestId` é o cabeçalho `x-request-id` (`packages/shared/utils/helpers/request-id.ts:6`), que a API grava em toda resposta e que o usuário pode informar | não carrega IP nem corpo; a retenção é a da plataforma ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §11) |
| Bloqueios de limite e de origem | `[security] blocked` com motivo, caminho, método e `requestId` (`apps/api/proxy.ts:64-76`) | sem endereço de origem, de propósito |
| Log de requisição da plataforma de deploy | IP, data e hora, caminho | retenção do plano; `[FORK]` conferir no painel |
| Painéis dos provedores | eventos e logs da Stripe, envios da Resend, requisições no painel da Arcjet (30 dias) | `[FORK]` quem tem acesso |
| Data Access logs do Firestore | quem leu qual documento | vêm desligados e o bucket `_Default` do GCP retém 30 dias (nota de pesquisa, retenção de log). Só existem se foram ligados antes do incidente. |

## 3. Avaliar se o incidente é comunicável

**LGPD.** Comunica-se à ANPD e ao titular o incidente que "possa acarretar risco ou dano relevante aos
titulares" (Res. 15/2024, art. 4º). O art. 5º define isso com duas condições que precisam valer juntas:

1. poder afetar significativamente interesses e direitos fundamentais dos titulares (o §1º dá exemplos:
   impedir o uso de um serviço, dano material ou moral, fraude financeira, roubo de identidade); e
2. envolver pelo menos um de: dado sensível; dado de criança, adolescente ou idoso; dado financeiro; dado de
   autenticação em sistemas; dado sob sigilo legal, judicial ou profissional; dado em larga escala (§2º:
   número significativo de titulares, volume, duração, frequência e extensão geográfica).

**GDPR.** Comunica-se à autoridade, salvo se for improvável que o incidente gere risco aos titulares (art.
33(1)). Ao titular, só quando houver alto risco (art. 34(1)); o art. 34(3)(a) dispensa a comunicação se o
dado estava ininteligível para quem o acessou, por exemplo cifrado.

Perguntas para quem decide, sem decidir por ele:

- Que dados foram afetados, e em qual coleção ou provedor? (A lista está em [`ROPA.md`](ROPA.md).)
- Houve dado de autenticação? Neste boilerplate, cookie de sessão, ID token, link de ação e chave de API
  contam. A senha passa pela API a caminho do Firebase (cadastro, login, troca, redefinição e confirmação
  da exclusão), não é gravada no Firestore nem vai para o log, e o Firebase guarda só o hash.
- Houve dado financeiro? Aqui, estado de assinatura e faturas; o cartão fica na Stripe.
- Quantos titulares? Qual o total de titulares tratados na atividade afetada?
- O dado estava ininteligível para quem acessou?
- Algum titular é criança, adolescente ou idoso?

`[FORK]` Registre a decisão e o porquê, inclusive quando a decisão é não comunicar.

## 4. Comunicar

- **ANPD**: pelo formulário eletrônico (art. 6º, §4º), na
  [página de comunicação de incidente](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis).
  O art. 6º, §2º, lista o que a comunicação traz: natureza e categoria dos dados; número de titulares
  (separando crianças, adolescentes e idosos); medidas de segurança antes e depois; riscos e impactos
  possíveis; motivo da demora, se houver; medidas para reverter ou mitigar; data do incidente e do
  conhecimento; dados do encarregado; identificação do controlador e, se for o caso, a declaração de
  pequeno porte; identificação do operador; descrição e causa principal; total de titulares tratados na
  atividade afetada. O que faltar pode ser complementado no prazo da tabela acima.
- **Titular**: individual, pelo meio que o produto já usa para falar com ele (e-mail, se a Resend estiver
  ligada), com o conteúdo do art. 9º: dados afetados, medidas de segurança, riscos, motivo da demora, medidas
  tomadas, data do conhecimento e contato. Se não der para avisar cada um, divulgação no site e nos canais
  por no mínimo 3 meses (art. 9º, §3º).
- **Operadores**: `[FORK]` avisar o provedor envolvido pelo canal que o DPA dele indica
  ([`SUBPROCESSORS.md`](SUBPROCESSORS.md)).

## 5. Registrar

Todo incidente, comunicado ou não, entra no registro por no mínimo 5 anos (art. 10). O mínimo que o art.
10, §1º, exige:

| Campo | Conteúdo |
|---|---|
| Data de conhecimento | |
| Circunstâncias | descrição geral de como aconteceu |
| Dados afetados | natureza e categoria |
| Titulares afetados | número |
| Avaliação de risco | riscos e danos possíveis aos titulares |
| Correção e mitigação | medidas tomadas, quando houver |
| Comunicação | forma e conteúdo, se foi comunicado à ANPD e aos titulares |
| Motivo de não comunicar | quando for o caso |

⛔ **Guarde o registro fora deste repositório.** Ele contém dado real de pessoas, e `docs/` vai para o
histórico do git de todo fork. `[FORK]` onde o registro fica e quem tem acesso.

## 6. Depois

- Restaurar dado, se preciso, pelo [`BACKUP.md`](BACKUP.md), incluindo a etapa de reaplicar as exclusões de
  conta posteriores ao backup.
- Revisar [`SUBPROCESSORS.md`](SUBPROCESSORS.md) e [`ROPA.md`](ROPA.md), se o incidente mostrou um fluxo de
  dado que não estava lá.
- Ligar o que faltou: Data Access logs, retenção de log maior, `ARCJET_KEY`, backup agendado.
