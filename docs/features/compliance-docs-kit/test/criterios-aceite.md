# Critérios de Aceite (Checklist)

Modelos de conformidade (RoPA, runbook de incidente, subprocessadores e backup). Os itens marcados foram
medidos no `/test` de 2026-09-30 com o instrumento citado em cada um; o valor observado está em
`report.md`. Os dois itens desmarcados dependem de infra que esta rodada não tem (projeto no Blaze) ou de
leitura jurídica, e ficam 🔒. Nenhum item reprovou.

- [x] **O fork chega aos quatro documentos a partir do checklist de produção**
  O `docs/PRE-PRODUCTION.md` tem o item 14 com um checkbox para cada documento (`ROPA.md`,
  `INCIDENT-RESPONSE.md`, `SUBPROCESSORS.md`, `BACKUP.md`). O item 7 ganhou o checkbox que manda listar os
  subprocessadores na política de privacidade, e a rotina final cita o teste de restauração. O
  `docs/FORKING.md` avisa que o Spark não tem backup e aponta para `BACKUP.md`.
  Status: ✅ leitura do `git diff` e comando 1 do §8 (0 links relativos quebrados em 88).

- [x] **Cada documento avisa no topo que é modelo, não parecer jurídico, e diz quando foi coletado**
  As primeiras linhas dos quatro arquivos trazem o aviso "Modelo, não parecer jurídico" uma única vez, a
  data de coleta (2026-09-30) e o link para `specs/research/compliance-trust-baseline.md` com a revalidação
  depois de 2027-08-21, que é o `revalidate_after` da nota.
  Status: ✅ leitura e `grep -c` (1 ocorrência do aviso por arquivo; `revalidate_after: 2027-08-21` na nota).

- [x] **A lista de subprocessadores bate com o código, sem provedor a mais nem a menos**
  `SUBPROCESSORS.md` tem 9 linhas em 5 empresas (Google, Stripe, Resend, Vercel, Arcjet), cada uma com
  `arquivo:linha`, obrigatoriedade e a variável que liga a integração. O comando 3 do §8 lista 21 arquivos
  e todos importam Firebase, Stripe, Resend, Arcjet, `@vercel/analytics` ou `@next/third-parties/google`.
  A seção "O que não entra" cobre Firebase Analytics, `@stripe/agent-toolkit`, Sentry/Better Stack/Axiom,
  GitHub e fontes, e as três buscas de evidência dela voltam vazias.
  Status: ✅ comandos 3 e 4 do §8 (80 âncoras, todas existentes e dentro do arquivo) e leitura das linhas citadas.

- [x] **Cada subprocessador tem DPA, lista de subprocessadores do provedor, região e mecanismo, ou a lacuna escrita**
  As URLs de DPA e de subprocessadores de Google Cloud, Google Analytics, Stripe, Resend e Vercel respondem
  200. O DPA da Arcjet aparece como "não encontrado" com a data da busca; `arcjet.com/dpa` e
  `arcjet.com/legal` continuam respondendo 404. A região do Firestore fica com o fork, com o ponteiro para
  `FORKING.md` §4, passo 5. Células sem fonte dizem "não confirmado", "não informado" ou `[FORK]`.
  Status: ✅ comando 2 do §8 (38 de 38 URLs com 200) e `curl` nas duas URLs da Arcjet (404).

- [x] **A nota de transferência internacional não afirma adequação que a pesquisa não confirmou**
  Lido com a correção do handoff: o Cloud DPA do Google e o adendo de transferência da Stripe trazem
  cláusulas brasileiras, e a tabela diz isso por provedor. A seção cita LGPD arts. 33 e 35, diz que a SCC
  de DPA é mecanismo do GDPR, avisa que ninguém comparou as cláusulas do Google e da Stripe com o anexo da
  Res. CD/ANPD 19/2024, e marca Resend, Vercel, Google Analytics e Arcjet como "não encontrado". A Res.
  32/2026 aparece como existente, com texto integral não lido, e o documento não conclui que ela cobre
  provedor nos Estados Unidos.
  Status: ✅ leitura e `curl` nas fontes ("cláusulas-padrão contratuais aprovadas pela ANPD" na página das BR SCCs, "BR SCCs" no Cloud DPA, "Brazilian Standard Contractual Clauses" no adendo da Stripe).

- [x] **O registro de operações segue os blocos do modelo da ANPD**
  `ROPA.md` tem o bloco de informações de contato com os oito campos em branco e 10 registros, cada um com
  os sete blocos (categorias de titulares, dados pessoais, compartilhamento, medidas de segurança, período
  de armazenamento, processo/finalidade/hipótese legal, observações). Os dados aparecem como tipos. O
  documento cita a URL do modelo oficial, que responde 200.
  Status: ✅ leitura e `grep -c` (10 ocorrências de cada um dos sete blocos).

- [x] **O registro de operações cobre as nove operações que o código faz**
  Os registros 1 a 9 cobrem cadastro e autenticação, sessão e registro de acesso, cobrança, e-mail
  transacional, formulário de contato, analytics com consentimento, trilha de auditoria, proteção contra
  abuso e arquivos enviados, cada um com "Onde está no código". As opcionais dizem qual variável as liga.
  O registro 10 é a lacuna `[FORK]` dos dados do domínio.
  Status: ✅ leitura e `grep -c "Onde está no código"` (9).

- [x] **Hipótese legal e prazo de guarda são sugestão marcada, com lacuna onde o código não decide**
  Cada hipótese cita o inciso do art. 7º e vem marcada `[FORK] confirmar`. Os prazos que o código fixa
  conferem com a fonte: cookie de consentimento 180 dias (`packages/analytics/consent.ts:10`), sessão de 5
  dias com teto de 30 (`packages/auth/session.ts:23-29`), Arcjet 30 dias. A retenção de `auditEvent` aponta
  para `PRE-PRODUCTION.md` §1.3 e o registro de acesso para o Marco Civil, art. 15, e a §11.
  Status: ✅ leitura e `sed -n` nas linhas citadas.

- [x] **O runbook responde em quantos dias úteis comunicar a ANPD, sem pesquisa**
  A tabela de prazos traz ANPD em 3 dias úteis (6 para pequeno porte), complementação em 20 (40), titular
  em 3 (6), declaração em 3 dias úteis, divulgação por 3 meses, GDPR 72 horas e o limiar de alto risco do
  art. 34(1), cada linha com a fonte.
  Status: ✅ leitura e `curl` no texto da Res. CD/ANPD 15/2024 (art. 6º caput "três dias úteis", §3º "vinte dias úteis", §8º "contados em dobro" para caput e §3º, art. 10 "cinco anos").

- [x] **O runbook diz quem decide e como avaliar se o incidente é comunicável**
  A seção de papéis tem as lacunas de quem decide, do contato técnico e de quem acessa os consoles, e o
  canal do titular via `NEXT_PUBLIC_PRIVACY_CONTACT`, que cai no formulário de `/contact` quando vazio
  (conferido em `apps/web/shared/lib/privacyContact.ts:10-19`). A avaliação segue as duas condições
  cumulativas do art. 5º da Res. 15/2024 e o limiar do GDPR, com a dispensa do art. 34(3)(a).
  Status: ✅ leitura.

- [x] **O runbook exige registro de todo incidente por 5 anos, fora do repositório**
  A seção 5 cita o art. 10 da Res. 15/2024, lista os oito campos do §1º e manda guardar o registro fora do
  git, porque ele contém dado real de pessoas.
  Status: ✅ leitura.

- [x] **O runbook aponta onde buscar evidência no repositório, sem prometer o que o código não faz**
  Aponta `/admin/audit` (`GET /audit-events` com `requireAdminApi`), o log por escopo com a lista de
  escopos de `log.ts:5-14`, o `x-request-id`, o bloqueio da Arcjet sem IP, a revogação pelo titular e a
  desativação pelo admin. Declara que não há rota de admin para revogar sessão de outro usuário e que os
  Data Access logs do Firestore vêm desligados.
  Status: ✅ comando 4 do §8 e `sed -n` nas âncoras do runbook.

- [x] **Os limites de sessão do runbook batem com o comportamento medido**
  Numa conta desativada pelo admin, o ID token emitido antes continua aceito pela API como bearer: a
  resolução do ator devolve o usuário com `disabled=true`, e nenhum guard confere `disabled`. O cookie de
  sessão da mesma conta é recusado. Depois de `revokeRefreshTokens(uid)`, o mesmo bearer é recusado, e
  continua recusado se a conta for reativada. Na revogação pelo titular, o ID token anterior é recusado
  como bearer, o cookie anterior é recusado, e um cookie novo não sai com esse token: o Firebase responde
  `auth/id-token-expired` a `createSessionCookie`, então a rota de sessão responderia `401
  AUTH_INVALID_TOKEN`. As linhas 50 e 51 do runbook estão corretas; a 50 ainda diz "não foi medido" sobre
  a emissão de cookie, e isso agora está medido.
  Status: ✅ script descartável contra o projeto de dev (Admin SDK real, sem emulador). O Auth emulator não serve para esta medição: nele o Admin SDK sempre confere revogação e `disabled`, e a conta desativada dá 401.

- [x] **O procedimento de backup diz o que fazer no Spark**
  A primeira seção do `BACKUP.md` diz que backup agendado, PITR e export gerenciado exigem faturamento, com
  a fonte de cada um, e dá as duas saídas (migrar para o Blaze ou registrar no `ROPA.md` que opera sem
  backup). O documento não sugere script próprio de cópia.
  Status: ✅ leitura e `curl` na documentação de backups ("requires the Blaze pricing plan").

- [x] **O procedimento de backup cobre ligar, restaurar e testar, com os limites do código**
  O documento mostra os comandos com a data da coleta, diz que a restauração vai para banco novo e que a
  API só lê o `(default)` (`packages/auth/server.ts:100`), e dá o caminho de volta por export/import,
  avisando que o import sobrescreve e não apaga documento criado depois. Lista o que o backup não cobre
  (contas do Authentication, objetos do Storage, dados na Stripe, variáveis de ambiente, políticas de TTL)
  e traz a rotina de teste num banco descartável.
  Status: ✅ leitura. A sintaxe dos comandos confere com o `--help` do `firebase-tools` 15.30.1 e do `gcloud` instalados (`--retention 14w` passa pelo parser `^(\d+)([hdmw])$`).

- [x] **Restaurar não ressuscita em silêncio conta excluída**
  O passo 1 da restauração manda listar os eventos `account.delete` e `user.delete` posteriores ao backup
  pela trilha, que guarda `targetUserId` (`packages/sdk/src/types/audit/audit.ts:29-31`), e o passo 4 manda
  reaplicar. O documento declara que o core não tem ferramenta para reaplicar a exclusão de conta.
  Status: ✅ leitura e `sed -n` nas âncoras.

- [x] **Nenhum segredo, e-mail real ou dado pessoal nos arquivos novos**
  O comando 5 do §8 não acha nada nos quatro documentos. A mesma busca nas linhas acrescentadas em
  `PRE-PRODUCTION.md`, `FORKING.md` e na nota também volta vazia.
  Status: ✅ comando 5 do §8 (0 acertos).

- [x] **Nada fora de `docs/` e do adendo da nota mudou**
  `git status` mostra os quatro documentos novos, `PRE-PRODUCTION.md`, `FORKING.md`, a nota, os artefatos
  da feature e a auditoria do backlog. A edição em `specs/compliance-docs-kit.md` é a remedição de âncora
  (`:522` para `:532`) que o plano já encontrou no disco quando foi escrito, então vem da auditoria. Nenhum
  arquivo em `apps/` ou `packages/` mudou.
  Status: ✅ `git status --short` e `git diff`.

- [ ] **Os comandos de backup e restauração funcionam num projeto real**
  Ligar o agendamento, listar backups, restaurar para banco novo, exportar e importar de volta ao
  `(default)` e a restauração no lugar precisam de um projeto no Blaze com faturamento. Só a sintaxe foi
  conferida.
  Status: 🔒 não verificável sem infra.

- [ ] **O texto atende à lei**
  A spec pede que o `/test` confira conteúdo e coerência com o código e com as fontes, não conformidade
  jurídica. Se as BR SCCs do Google e da Stripe coincidem com o anexo da Res. 19/2024, e se os modelos
  bastam para um fork específico, é decisão de quem responde juridicamente pelo produto.
  Status: 🔒 fora do alcance do QA.
