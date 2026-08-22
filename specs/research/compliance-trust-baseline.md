---
topic: compliance-trust-baseline
question: Qual é o baseline de confiança (segurança, privacidade, conformidade e acessibilidade) que um SaaS de MVP com público Brasil + internacional precisa entregar, e o que disso cabe num boilerplate genérico?
lens: confianca
panel: [lgpd, anpd-resolucoes, gdpr, eprivacy, marco-civil, owasp, wcag, lbi, stripe-pci, firebase-security]
collected: 2026-08-21
revalidate_after: 2027-08-21
confidence: alta
---

# Baseline de confiança: LGPD, GDPR, OWASP, WCAG e exigências de provedor

> Fontes de **nível 1** (lei/órgão regulador) e **nível 2** (doc oficial de provedor). Onde não houve
> confirmação em fonte primária, está marcado **não confirmado** — não presuma.

## Resposta curta

Boa parte do que se vende como "conformidade" é **documento e configuração**, não código. O que é
**código reutilizável** e portanto cabe neste boilerplate: direitos do titular (exportar/eliminar conta),
consentimento de cookies, headers/CSP, sessão segura, trilha de auditoria consultável, e design system
acessível. O resto (registro de operações, runbook de incidente, DPA, subprocessadores) entra como
**template em `docs/` + checklist de fork**.

E há um **bloqueador que precede tudo**: a `apps/api` acessa o Firestore pelo **client SDK não
autenticado**, com `firestore.rules` em `deny-all`. Enquanto isso não migrar para `firebase-admin`,
qualquer controle de autorização a mais é teatro.

## Prevalência

Aqui, "prevalência" é **natureza da obrigação** — obrigatório por lei, exigido por provedor, ou boa prática.

| # | Controle | Natureza | Esforço | Onde se materializa |
|---|---|---|---|---|
| 1 | Direitos do titular | **lei** (LGPD 18; GDPR 15–21) | G | tela autenticada + rotas na API |
| 2 | Exportação/portabilidade | **lei** (LGPD 18-V; GDPR 20) | M | export dos dados do titular |
| 3 | Eliminação de conta | **lei** (LGPD 18-VI; GDPR 17) | M | exclusão + cascade (Auth, Stripe, storage) |
| 4 | Aviso de privacidade + Termos | **lei** (LGPD 9; GDPR 13) | P | já existe a rota; falta conteúdo real nos 3 idiomas |
| 5 | Consentimento de cookies | **lei** (ePrivacy 5(3); guia ANPD) | M | banner 2 níveis + Consent Mode v2 |
| 6 | Registro de operações (RoPA) | **lei** (LGPD 37; GDPR 30) | P | **documento**, não código |
| 7 | Canal do encarregado | **lei** (LGPD 41 §1º) | P | seção no aviso + contato |
| 8 | Resposta a incidente | **lei** (LGPD 48; GDPR 33) | M | runbook + auditoria consultável |
| 9 | Subprocessadores + DPA | **lei** (GDPR 28) | P | página pública + DPAs assinados |
| 10 | Retenção de log de acesso | **lei** (Marco Civil 15) | M | bucket de log ≥ 6 meses |
| 11 | Autorização espelhada + rules deny-by-default | boa prática (OWASP A01) | M | guards na API + `firestore.rules` |
| 12 | Sessão segura | boa prática (OWASP A07) | M | session cookie + revogação |
| 13 | Security headers + CSP | boa prática (OWASP A02) | P | `packages/security/middleware.ts` |
| 14 | Cartão nunca no servidor + webhook + SCA | **provedor** (Stripe/PCI) | M | Checkout/Element + webhook |
| 15 | Divulgações de comerciante | **provedor** (Stripe) | P | reembolso, cancelamento, contato, moeda |
| 16 | Anti-abuso: App Check + rate limit | boa prática | M | App Check + rate limit na API |
| 17 | MFA + política de senha | boa prática | M | GCIP (TOTP) |
| 18 | Acessibilidade WCAG 2.2 AA | **lei** (LBI 63) | G | `packages/design-system` |
| 19 | Transferência internacional | **lei** (LGPD 33/35; GDPR Cap. V) | P | cláusulas-padrão no DPA |

## O que o mercado trata como o mínimo

### Direitos do titular e prazos (1–3)

**LGPD art. 18** garante 9 direitos: confirmação, acesso, correção, anonimização/bloqueio/eliminação,
**portabilidade (18-V)**, **eliminação dos dados tratados com consentimento (18-VI)**, informação sobre uso
compartilhado, informação sobre não consentir e **revogação do consentimento (18-IX)**. O **§ 5º** obriga a
atender **sem custos** ao titular.

**Prazos — LGPD art. 19**: confirmação/acesso em **formato simplificado, imediatamente** (inc. I); ou
**declaração clara e completa em até 15 dias** (inc. II). Para **agente de pequeno porte**, a
**Res. CD/ANPD nº 2/2022 art. 14, I e III** dobra esses prazos (→ **30 dias** para a declaração completa) e
o **art. 15** permite entregar a declaração simplificada **em até 15 dias** em vez de "imediatamente".

**GDPR art. 12(3)**: "without undue delay and in any event **within one month**", prorrogável por **2 meses
adicionais** (total 3), informando o titular **dentro do primeiro mês**.

**Armadilha da eliminação:** deletar o usuário e deixar órfãos — assinatura Stripe ativa, arquivos no
bucket, vínculos, logs. O correto é **cancelar + limpar + anonimizar** de forma coordenada.

### O alívio real do MVP (6–7)

É aqui que a economia acontece, e quase toda a internet erra:

- **Registro de operações**: LGPD art. 37 exige de controlador **e operador**, "especialmente quando baseado
  no legítimo interesse". A **Res. 2/2022 art. 9º** permite cumprir **de forma simplificada** — é
  **simplificação, não isenção**. Não existe norma da ANPD que isente pequeno porte do art. 37.
- **Encarregado (DPO)**: LGPD art. 41 exige indicar e **divulgar publicamente** o contato (§ 1º,
  "preferencialmente no sítio eletrônico"). A **Res. 2/2022 art. 11** é a única **dispensa** propriamente
  dita: pequeno porte **não é obrigado a indicar encarregado**, desde que **disponibilize um canal de
  comunicação com o titular** (§ 1º). Indicar de todo modo conta como boa prática de governança
  (art. 52, § 1º, IX da LGPD → mitiga sanção). A **Res. 18/2024** detalha a divulgação (art. 9º: "local de
  destaque e de fácil acesso, no sítio eletrônico") e reafirma o canal para os dispensados (art. 3º, § 3º).
- **Quem é "pequeno porte"** (Res. 2/2022 art. 2º, I): ME, EPP, **startups**, PJ de direito privado, pessoas
  naturais. **Mas o art. 3º exclui** quem faz **tratamento de alto risco** (art. 4º: critério geral de larga
  escala/afetação significativa **+ cumulativamente** um específico — decisão unicamente automatizada
  inclusive perfilamento, dados sensíveis, de crianças/adolescentes/idosos, tecnologia emergente,
  vigilância de zona pública) ou ultrapassa os limites de receita.
- **GDPR art. 30(5)** parece isentar quem tem menos de 250 funcionários, **mas** os carve-outs são
  alternativos ("or"): a isenção cai se o tratamento **"is not occasional"** — o que é o caso de **qualquer
  SaaS**. Ou seja: no Brasil você simplifica; na Europa, não escapa.

### Incidente de segurança (8)

**O prazo não está na LGPD.** O art. 48, § 1º diz apenas "prazo razoável, conforme definido pela autoridade
nacional". O prazo real vem da **Res. CD/ANPD nº 15/2024 (RCIS)**:

- **art. 6º**: comunicar **à ANPD em 3 dias úteis**, contados do conhecimento de que o incidente afetou
  dados pessoais; complementação fundamentada em 20 dias úteis; via formulário eletrônico. **§ 8º: prazos em
  dobro para pequeno porte** (→ **6 dias úteis**).
- **art. 9º**: comunicar **ao titular também em 3 dias úteis**, em linguagem simples e de forma
  individualizada; se inviável, divulgação pública por **no mínimo 3 meses**. **§ 6º: dobro para pequeno
  porte**.
- **Gatilho (art. 5º)**: risco/dano relevante = afetar significativamente direitos fundamentais **e,
  cumulativamente**, envolver dados sensíveis, de crianças/adolescentes/idosos, **financeiros**, **de
  autenticação em sistemas**, sob sigilo, ou **em larga escala**.
- **art. 10**: manter registro do incidente — **inclusive dos não comunicados — por no mínimo 5 anos**.

**GDPR art. 33(1)**: **72 horas** à autoridade, salvo se improvável gerar risco. **Art. 34(1)**: ao titular
"without undue delay" só quando **"likely to result in a HIGH risk"** — limiar mais alto; **34(3)(a)**
dispensa se os dados estavam **inintelegíveis** (ex.: criptografados).

### Consentimento de cookies (5)

Quem exige consentimento é a **ePrivacy 2002/58/CE art. 5(3)** (alterada pela 2009/136/CE), com exceção do
que é **estritamente necessário** para prestar o serviço explicitamente solicitado — **não é o GDPR**. O GDPR
só fornece a *definição* de consentimento válido (arts. 4(11) e 7) que o art. 5(3) invoca.

⚠️ **Não assuma que isso vai mudar:** a proposta de **ePrivacy Regulation** foi **retirada** pela Comissão
(JO C/2025/5423, de 06/10/2025). A Diretiva 2002/58/CE e suas transposições nacionais continuam em vigor.

O **guia orientativo da ANPD** é prescritivo e vale como requisito de projeto: no 1º nível, botão de
**rejeitar todos os não necessários** com visualização tão fácil quanto aceitar; no 2º nível, categorias por
finalidade com **cookies de consentimento desativados por padrão**. **Proíbe** botão único, dar destaque só
ao "aceitar" e — relevante para este repo — **política apenas em idioma estrangeiro**.

As **EDPB Guidelines 05/2020 on consent (v1.1)** fixam o padrão de validade, com os parágrafos:
**cookie wall é inválido** (§39; exemplo 6a: script bloqueante com só um botão "Accept cookies" → "This does
not constitute valid consent"); **granularidade por finalidade** (§§42–43); **checkbox pré-marcado é
inválido** e silêncio/inatividade não é consentimento (§79, §81); **rolar a página nunca satisfaz** o
requisito de ação afirmativa (§86); **retirar tem de ser tão fácil quanto conceder** (§§113–114).

As **EDPB Guidelines 2/2023 (v2.0, adotadas em 07/10/2024)** ampliam o alcance técnico do art. 5(3) para
além do cookie: **tracking pixels, URL/pixel tracking, identificadores únicos e tracking por IP**. Efeito
prático: **um pixel de analytics sem cookie também precisa de consentimento.**

O **Consent Mode v2** do Google acrescentou `ad_user_data` e `ad_personalization` a
`ad_storage`/`analytics_storage`; a exigência é para tráfego do **EEE** (a política subjacente cobre EEE,
Reino Unido e Suíça) e o Google a trata como **perda de audiência**, não sanção. Para o **Brasil não é
exigido** — mas continua sendo a forma padrão de ligar um banner LGPD às tags do Google. Obrigação distinta e
frequentemente confundida: **publishers** de AdSense/Ad Manager/AdMob precisam, desde **16/01/2024**, de CMP
certificada e integrada ao **IAB TCF** para usuários no EEE/Reino Unido.

### Retenção de log de acesso (10) — o item mais mal citado

**Marco Civil da Internet art. 15**, verbatim: "O provedor de aplicações de internet **constituído na forma
de pessoa jurídica e que exerça essa atividade de forma organizada, profissionalmente e com fins
econômicos** deverá manter os respectivos registros de acesso a aplicações de internet, sob sigilo, em
ambiente controlado e de segurança, pelo prazo de **6 (seis) meses**". São **três requisitos cumulativos** —
um SaaS comercial os cumpre; um projeto pessoal sem fins econômicos, não.

**O que é "registro de acesso" (art. 5º, VIII)**: "o conjunto de informações referentes à **data e hora de
uso** de uma determinada aplicação de internet **a partir de um determinado endereço IP**". Só isso.

⚠️ **Três confusões frequentes, todas erradas:**
1. O art. 13 (**1 ano**) é de **conexão** e o sujeito é o **administrador de sistema autônomo** — ISP, não
   SaaS. E o art. 14 **proíbe** ao provedor de conexão guardar registro de aplicação.
2. **"A lei exige 6 meses de logs" é falso como generalização.** São 6 meses **apenas** do registro de
   acesso (data/hora + IP), **apenas** para o provedor PJ/organizado/profissional/com fins econômicos.
3. **Não existe, no Brasil, obrigação legal de trilha de auditoria de negócio com prazo** (quem criou/
   alterou/excluiu qual registro). O **Decreto 8.771/2016, art. 13, § 2º** aponta no sentido oposto:
   "os provedores […] devem **reter a menor quantidade possível** de dados pessoais […] os quais deverão ser
   excluídos: I – tão logo atingida a finalidade de seu uso; ou II – se encerrado o prazo determinado por
   obrigação legal." Trilha de auditoria se justifica por **accountability** (LGPD art. 6º, X) e por
   finalidade própria (segurança, prova contratual) — **nunca** pelo Marco Civil.

**Novidade em vigor:** o **Decreto 12.975, de 20/05/2026** inseriu o **art. 15-A no Decreto 8.771/2016** — o
dever de guarda de IP dos arts. 13 e 15 "abrangerá a **porta lógica de origem** sempre que necessário para a
identificação inequívoca do terminal de origem", independentemente de prévia requisição.

**Entrega a terceiros exige ordem judicial** (art. 10, § 1º); exceção para **dados cadastrais**
(qualificação, filiação, endereço) a autoridades administrativas competentes (art. 10, § 3º).

**LGPD não fixa prazo de retenção.** Regime finalístico: art. 15 (término do tratamento), art. 16
(eliminação, ressalvada obrigação legal), art. 6º, III (necessidade). A ANPD confirma no FAQ (item 5.5):
"A LGPD não especifica um prazo durante o qual pode haver o tratamento dos dados pessoais".

No GCP, o bucket `_Default` retém **30 dias** — insuficiente. Data Access logs do Firestore são **opt-in**.

### Pagamentos (14–15)

- **Checkout ou Payment Element mantém você em SAQ A.** Qualquer rota que aceite número de cartão no body
  joga para **SAQ D**. Guarde apenas `cus_`/`pm_`/bandeira/últimos 4/validade.
- **Webhook**: verificação de assinatura com **corpo bruto**, tolerância padrão (nunca 0) e **dedupe por
  `event.id`** — a Stripe não garante ordem nem entrega única.
- **SCA/3DS**: tratar `requires_action` e `invoice.payment_action_required`; confirmar por `invoice.paid`.
- A Stripe mantém um **"Website checklist"** com 10 itens exigidos de todo comerciante: descrição do que
  vende, moeda, contato de atendimento, **políticas de reembolso e cancelamento**, privacidade, endereço,
  termos de trial, HTTPS.

### Baseline técnico (11–13)

- **OWASP Top 10:2025** é a versão corrente: A01 Broken Access Control · A02 Security Misconfiguration ·
  A03 Software Supply Chain Failures · A04 Cryptographic Failures · A05 Injection · A06 Insecure Design ·
  A07 Authentication Failures · A08 Software or Data Integrity Failures · A09 Security Logging and Alerting
  Failures · A10 Mishandling of Exceptional Conditions. A **ASVS 5.0.0** (30/05/2025) substituiu a 4.0.3 —
  cite a versão ao referenciar requisitos.
- A **ASVS 5.0.0** define o **Level 1** como "the **minimum requirements** […] around 20% of the ASVS
  requirements" (70 de 345), e diz textualmente que "an early-stage startup that is only collecting limited
  sensitive data may decide to focus on Level 1". Achado contraintuitivo: no 5.0, o capítulo **V16 (Security
  Logging and Error Handling) não tem nenhum requisito L1** — todos são L2/L3. Se o objetivo é
  logging/erro, ancore em **A10:2025** (Mishandling of Exceptional Conditions), que subiu exatamente esse
  tema ao Top 10, e nos itens L2 **16.5.1** (mensagem genérica ao consumidor, sem stack trace) e **16.5.3**
  (falhar de forma segura, nunca *fail open*).
- Requisitos **L1** que batem direto neste repo: senha **≥ 8 caracteres** sem regras de composição
  (6.2.1/6.2.5), checar contra as **top 3000** senhas comuns (6.2.4), **permitir colar e gerenciador de
  senha** (6.2.6/6.2.7), **proibido** "pergunta secreta" (6.4.2); **novo token de sessão a cada
  autenticação** (7.2.4) e **desabilitar/excluir conta encerra todas as sessões** (7.4.2); autorização
  **numa camada de serviço confiável, não em JavaScript no cliente** (8.3.1); validação idem (2.2.2);
  `Strict-Transport-Security` em **todas** as respostas com `max-age` ≥ 1 ano (3.4.1); cookies com `Secure`
  e prefixo `__Host-`/`__Secure-` (3.3.1); **CORS com allowlist, nunca refletindo `Origin`** (3.4.2).
- O Firebase documenta que as security rules são **"the only safeguard"** contra acesso direto do cliente.
- **Sessão**: o session cookie do Firebase aceita **5 minutos a 2 semanas**, `httpOnly`+`secure`, e a doc
  adverte explicitamente sobre **CSRF** (o exemplo oficial valida um csrfToken). **Armadilha crítica:**
  `revokeRefreshTokens` **não invalida ID tokens já emitidos** — eles seguem válidos até expirar (1 hora).
  Rotas sensíveis precisam de `verifySessionCookie(cookie, true)`.

### Acessibilidade (18) — obrigatória, não recomendável

**LBI (Lei 13.146/2015) art. 63**: "É **obrigatória** a acessibilidade nos sítios da internet mantidos por
empresas com sede ou representação comercial no País […] conforme as melhores práticas e diretrizes de
acessibilidade adotadas internacionalmente"; o § 1º exige **símbolo de acessibilidade em destaque**.

⚠️ A lei escreve **"sítios da internet"** e o escopo é amplo — empresa privada com **sede *ou representação
comercial*** no Brasil. Mas a norma técnica é **aberta** ("melhores práticas e diretrizes adotadas
internacionalmente"): **a LBI não nomeia WCAG**. O **eMAG** e o **Decreto 5.296/2004 art. 47** vinculam
**apenas a administração pública** — não use nenhum dos dois como base legal para empresa privada. E
**"selo de acessibilidade" não existe na Lei 13.146/2015**: o § 1º exige **símbolo** ("selo" tem 0
ocorrências no texto); Selo de Acessibilidade Digital é certificação municipal voluntária.

A referência internacional é **WCAG 2.2** (REC original de 05/10/2023; edição revisada corrente de
12/12/2024), que adicionou 9 critérios e **removeu** o 4.1.1 Parsing. Para alvo **AA**, o delta prático são
**6**: **2.4.11** Focus Not Obscured, **2.5.7** Dragging Movements, **2.5.8** Target Size (alvos ≥ 24px) e
**3.3.8** Accessible Authentication (nível AA) + **3.2.6** Consistent Help e **3.3.7** Redundant Entry
(nível A). Os que batem direto neste repo: **2.5.8** e **3.3.8** no design system e na tela de login;
**3.3.7** no cadastro multi-etapa e no checkout.

**European Accessibility Act — Diretiva (UE) 2019/882 — aplica-se a e-commerce e serviços digitais.** O
art. 2(2)(f) inclui expressamente "e-commerce services" (definidos no art. 3(30) como serviços prestados à
distância por websites e apps para concluir contrato de consumo). **Aplicável desde 28/06/2025** (art. 31) —
**um site novo não tem carência**; o prazo de 2030 do art. 32 é só para **produtos legados** usados na
prestação. **Microempresa é isenta apenas para SERVIÇOS** (art. 4(5)): art. 3(23) define microempresa como
**menos de 10 pessoas E** faturamento **ou** balanço anual ≤ **€2 milhões**. **PME não é isenta** — o
art. 3(24) exclui microempresas da definição de PME de propósito.

## Custo herdado por todo fork

- **Zero custo em dinheiro:** direitos do titular, exportação, exclusão, banner de cookies, CSP/headers,
  sessão, acessibilidade, páginas legais. Tudo código do repo.
- **Configuração de projeto, não código:** RoPA, runbook de incidente, DPA/subprocessadores, retenção de log
  (bucket no GCP), transferência internacional. Entregue como **template + checklist de fork**.
- **Serviço externo:** rate limiting distribuído (Redis) e MFA no GCIP têm custo — **não confirmado** o
  preço de MFA no GCIP.

## Não confirmado

- Conteúdo da **retificação de 18/08/2025** à Res. CD/ANPD nº 19/2024 (cláusulas-padrão).
- Texto integral da **Res. CD/ANPD nº 32/2026**, que reconhece a União Europeia como tendo grau de proteção
  adequado (existência, data e objeto **confirmados** na página da ANPD).
- Obrigação brasileira de NFS-e para SaaS. Confirmado apenas que **a Stripe não emite** documento fiscal das
  suas vendas.
- Se o Customer Portal da Stripe satisfaz, por si, obrigação regulatória de cancelamento.
- Preço de MFA no Google Cloud Identity Platform.
- **Data exata de publicação** do OWASP Top 10:2025 (confirmado que é a versão corrente e final, não RC;
  a janela de contribuição de dados encerrou em 31/07/2025).
- A decisão de execução no JO que cita **EN 301 549** como norma harmonizada do EAA (art. 15).
- Qualquer norma federal brasileira que **fixe versão/nível de WCAG** para empresa privada.
- Qualquer modelo de política de retenção de log de auditoria da ANPD/Governo Digital aplicável a SaaS
  privado — o que circula é modelo para **órgãos da administração pública federal**. Não usar como base
  legal.

## Fontes

**Nível 1 — lei e regulador**
- <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm> — LGPD (arts. 7º, 9º, 18, 19, 37, 41, 46, 48)
- <https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd> — índice oficial com status de vigência
- <https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/regulamentacoes-da-anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022> — Res. 2/2022 (pequeno porte)
- <https://www.gov.br/anpd/pt-br/assuntos/comunicacao-de-incidentes-de-seguranca-cis> · <https://dspace.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html> — Res. 15/2024 (incidente)
- <https://dspace.mj.gov.br/handle/1/13151> — Res. 18/2024 (encarregado)
- <https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados> — Res. 19/2024 + adequação UE
- <https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf> — guia de cookies
- <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm> — Marco Civil (arts. 5º, 10, 13, 14, 15, 16)
- <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12975.htm> — Decreto 12.975/2026 (porta lógica)
- <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm> — LBI (art. 63)
- <https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf> — EDPB 05/2020 (consentimento)
- <https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf> — EDPB 2/2023 v2.0 (pixels e IP tracking)
- <https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52025XC05423> — retirada da proposta de ePrivacy Regulation
- <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L0882> — European Accessibility Act
- <https://gdpr-info.eu/chapter-3/> · <https://gdpr-info.eu/art-12-gdpr/> · <https://gdpr-info.eu/art-17-gdpr/> · <https://gdpr-info.eu/art-25-gdpr/> · <https://gdpr-info.eu/art-28-gdpr/> · <https://gdpr-info.eu/art-30-gdpr/> · <https://gdpr-info.eu/art-33-gdpr/> · <https://gdpr-info.eu/art-34-gdpr/> · <https://gdpr-info.eu/art-37-gdpr/>
- <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02002L0058-20091219> — ePrivacy consolidada (art. 5(3))
- <https://www.w3.org/TR/WCAG22/> — WCAG 2.2

**Nível 2 — provedor e norma técnica**
- <https://owasp.org/Top10/2025/> · <https://owasp.org/www-project-application-security-verification-standard/>
- <https://firebase.google.com/docs/rules/basics> · <https://firebase.google.com/docs/auth/admin/manage-cookies>
- <https://firebase.google.com/terms/data-processing-terms> · <https://firebase.google.com/terms/subprocessors>
- <https://stripe.com/guides/pci-compliance> · <https://docs.stripe.com/webhooks> · <https://docs.stripe.com/get-started/checklist/website>
- <https://cloud.google.com/logging/quotas> · <https://developers.google.com/tag-platform/security/guides/consent>
