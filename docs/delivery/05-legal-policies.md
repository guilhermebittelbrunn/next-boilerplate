# Parte 5: políticas e conformidade legal

Confere o que o produto promete e declara para quem usa: as políticas publicadas, o banner de cookies, os
dados que cada formulário pede, o que a landing afirma, de quem são as imagens, quem é a empresa por trás e
o que muda quando o produto vende para outros países.
Erro aqui raramente quebra uma tela, mas pode gerar reclamação no Procon, notificação da ANPD ou um pedido
de remoção de conteúdo.

Visão geral da etapa e regras de status em [`README.md`](README.md).

> ⚠️ **Esta parte não é parecer jurídico.** Ela confere se o produto tem o que a lei e os provedores pedem e
> se o que está publicado bate com o que o código faz. O texto final das políticas, a base legal de cada
> tratamento e os riscos do item 5.12 precisam de uma pessoa responsável pelo produto, de preferência com
> apoio de um advogado.

## O que outras partes já cobrem

Alguns temas desta parte já são medidos em outro lugar e não se repetem aqui:

| Tema | Onde já é medido |
|------|------------------|
| Atributos dos cookies (`HttpOnly`, `Secure`, `SameSite`) | [1.18 Cookies inseguros](01-security-review.md#118-cookies-inseguros) |
| Dado pessoal vazando em log, URL ou analytics | [1.16 Dados sensíveis expostos](01-security-review.md#116-dados-sensíveis-expostos) |
| Google Analytics sem requisição antes do aceite | [3.8 Google Analytics](03-product-quality.md#38-google-analytics) |
| Contraste e `alt` presentes (checagem automática) | axe na suíte E2E, nos temas claro e escuro (`apps/e2e/support/a11y.ts`), que o CI roda em toda PR e a [3.1](03-product-quality.md#31-simular-o-uso-num-celular) roda no celular |
| Documentos de LGPD do core (ROPA, subprocessadores, incidente, backup) em dia | [4.3 Documentos do produto em dia](04-documentation.md#43-documentos-do-produto-em-dia) confere que existem; o 5.7 confere o conteúdo |
| Texto traduzido, datas, números e moeda no formato de cada idioma | [3.12 Idiomas e formatos](03-product-quality.md#312-idiomas-e-formatos) |

## Onde medir

Quase tudo aqui é leitura: as páginas públicas da `web`, os formulários da `app` e os textos do dicionário
(`packages/internationalization/translations/`). O que pede navegador (banner, teclado) roda com o
`agent-browser`, contra a preview que vai virar produção ou contra o ambiente local com emuladores.

Nos comandos abaixo, `$WEB` e `$APP` são as URLs base (sem barra no fim) e `$LOCALE` é um dos três idiomas
(`pt-br`, `en`, `es`).

## 5.1 Política de privacidade

**Por quê.** A LGPD obriga a informar ao titular, de forma clara, a finalidade, a forma e a duração do
tratamento, quem é o controlador, com quem os dados são compartilhados e quais são os direitos dele
([Lei 13.709/2018, art. 9º](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)). A
política é o lugar onde isso fica escrito.

**O core já faz.** A página `/<locale>/legal/privacy` existe nos três idiomas e o rodapé da landing aponta
para ela. O texto é um **modelo**: quatro seções genéricas e um aviso "Este é um modelo do boilerplate.
Substitua por sua política real antes de publicar."
(`packages/internationalization/translations/apps/web/pages/legal/index.ts`). O canal de privacidade sai
de `NEXT_PUBLIC_PRIVACY_CONTACT` ou, sem ela, do formulário de contato (`apps/web/shared/lib/privacyContact.ts`).

**Como medir.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$WEB/$LOCALE/legal/privacy"     # esperado: 200
git grep -n "modelo do boilerplate\|boilerplate template\|plantilla del boilerplate" -- packages/internationalization
```

Leia a página nos três idiomas e confira se ela cobre:

- quem é o controlador (razão social, CNPJ e contato) e o encarregado (item 5.7);
- cada dado coletado, a finalidade e a base legal de cada tratamento;
- os cookies e scripts de terceiros, com o mesmo nome e a mesma duração que o banner mostra (5.3 e 5.4);
- com quem os dados são compartilhados: a lista do [`SUBPROCESSORS.md`](../SUBPROCESSORS.md) do fork,
  incluindo a transferência internacional (Vercel, Google, Stripe, Resend ficam fora do Brasil);
- por quanto tempo cada dado fica guardado;
- os direitos do titular e como exercê-los (no produto: Minha conta › Privacidade);
- data da última atualização.

**Aprovado quando** a página responde 200 nos três idiomas, o aviso de modelo sumiu, os sete pontos acima
estão no texto e nada nele contradiz o código (um cookie que não existe, um direito que o produto não
oferece). Gravidade: 🔴 se o aviso de modelo ainda está publicado ou a página não existe; 🟡 nos demais
casos.

## 5.2 Termos de serviço

**Por quê.** Os termos definem o que o produto entrega, o que o usuário não pode fazer, como a conta é
encerrada e o foro. Sem eles, cada conflito vira interpretação. Em venda ao consumidor, o Código de Defesa
do Consumidor exige informação clara sobre o serviço e o preço
([Lei 8.078/1990, art. 6º, III](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)).

**O core já faz.** A página `/<locale>/legal/terms` existe nos três idiomas, com três seções genéricas e o
mesmo aviso de modelo. **O cadastro não mostra link para os termos nem para a política**, nem na `app` nem
na landing.

**Como medir.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$WEB/$LOCALE/legal/terms"       # esperado: 200
```

Leia os termos e confira: descrição do serviço, regras de uso, planos e cobrança (com link para a política
de reembolso, 5.5), suspensão e encerramento da conta, limitação de responsabilidade, alterações nos
termos, lei aplicável e foro, dados da empresa (5.11). Depois abra o cadastro da `app` e o da landing e
confira se há, perto do botão de criar conta, uma frase com link para os termos e para a política.

**Aprovado quando** a página responde 200 nos três idiomas sem o aviso de modelo, cobre os pontos acima, e
as duas telas de cadastro apontam para termos e política. Gravidade: 🔴 se o aviso de modelo segue
publicado num produto que cobra; 🟡 nos demais casos.

## 5.3 Aviso de cookies

**Por quê.** Cookie ou script que não é estritamente necessário só pode rodar depois do consentimento, e
recusar tem de ser tão fácil quanto aceitar. A ANPD detalha isso no
[guia orientativo de cookies](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf).

**O core já faz.** O banner (`packages/design-system/components/ui/cookie-consent.tsx`) tem "Aceitar" e
"Recusar" no mesmo nível, guarda a escolha por 180 dias e pode ser reaberto pelo botão de preferências do
rodapé (`apps/web/app/[locale]/components/cookiePreferencesButton.tsx`). O GA só carrega depois do aceite
(conferido no 3.8).

**Como medir.** Em aba anônima, com o `agent-browser`, na landing e na `app`:

1. O banner aparece na primeira visita, nos três idiomas, e tem link para a política de privacidade.
2. "Recusar" está no mesmo nível visual de "Aceitar" (mesmo tamanho, sem esconder em "mais opções").
3. Recuse, recarregue: o banner não volta, e nenhum cookie além dos necessários foi gravado
   (`document.cookie` e a aba Application do navegador).
4. Reabra as preferências pelo rodapé e troque a escolha.
5. Cada cookie gravado aparece, com nome e finalidade, na seção de cookies da política (5.1).

**Aprovado quando** os cinco passos conferem. Gravidade: 🔴 se recusar não é possível ou um cookie não
necessário é gravado antes da escolha; 🟡 se a política não lista os cookies que o produto grava.

## 5.4 Scripts de terceiros e rastreamento

**Por quê.** Pixel de anúncio, mapa de calor, chat e vídeo incorporado mandam dados do visitante a
terceiros. Cada um precisa estar atrás do consentimento (quando não é necessário), listado na política e
coberto no [`SUBPROCESSORS.md`](../SUBPROCESSORS.md). O 3.8 cobre o GA; este item cobre todo o resto que o
fork acrescentou.

**Como medir.**

```bash
git grep -nE "<script|next/script|googletagmanager|facebook|fbq\(|hotjar|clarity|tiktok|linkedin|intercom|crisp|youtube\.com/embed" -- apps packages ':!**/__tests__/**'
```

Depois, em aba anônima e **sem aceitar** o banner, abra a home, o cadastro e a tela principal do produto e
liste na aba Network todo domínio de terceiro chamado. Repita aceitando.

**Aprovado quando** sem aceite só aparecem domínios necessários ao funcionamento (o próprio produto,
Firebase, Stripe no checkout), todo script de rastreamento só carrega depois do aceite, e cada terceiro
está na política e no `SUBPROCESSORS.md`. Gravidade: 🔴 para script de rastreamento antes do aceite; 🟡
para terceiro fora da política.

## 5.5 Política de reembolso

**Por quê.** Compra feita pela internet dá ao consumidor sete dias para desistir, com devolução do valor
pago ([CDC, art. 49](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm);
[Decreto 7.962/2013, art. 5º](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm)).
A Stripe também pede uma política de reembolso visível
([checklist de site](https://docs.stripe.com/get-started/checklist/website)).

**O core já faz.** Cancelamento e troca de plano pelo portal da Stripe. Não há página de reembolso nem
texto sobre arrependimento nos termos.

**Como medir.** Se o produto não cobra (`NEXT_PUBLIC_PRODUCT_MODE=simple` ou sem Stripe), o item é ➖.
Se cobra, confira:

- existe uma página ou seção dos termos sobre reembolso, com link a partir da página de preços e do
  checkout;
- ela diz o prazo de arrependimento de 7 dias, como pedir, em quanto tempo o dinheiro volta e o que
  acontece com o acesso;
- o que ela promete é possível no painel da Stripe (o reembolso é manual, pelo Dashboard, a não ser que o
  fork tenha automatizado).

**Aprovado quando** os três pontos conferem. Gravidade: 🔴 se o produto cobra e não há política; 🟡 se a
política existe mas não cita o prazo de 7 dias.

## 5.6 Formulários e dados mínimos

**Por quê.** A LGPD só permite coletar o dado necessário para a finalidade declarada (princípio da
necessidade, [art. 6º, III](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)).
Campo "por via das dúvidas" (CPF no cadastro, data de nascimento, telefone obrigatório) é dado que vira
risco em caso de vazamento e não traz nada.

**O core já faz.** O cadastro pede só e-mail e senha; o nome entra depois, no onboarding. O formulário de
contato pede nome, e-mail e mensagem.

**Como medir.** Liste todos os formulários do produto (cadastro, onboarding, perfil, contato e os do fork) e,
para cada campo, escreva no relatório a finalidade em uma frase. Confira também:

- campo obrigatório só quando o produto não funciona sem ele;
- dado sensível (saúde, religião, biometria, origem racial, orientação sexual, opinião política,
  [art. 5º, II](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)) só com base legal
  escrita e consentimento específico;
- caixa de consentimento de marketing (newsletter, ofertas) desmarcada por padrão e separada do aceite dos
  termos;
- se o produto pode ser usado por menor de idade, o tratamento segue o
  [art. 14](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) (consentimento de um
  dos pais para criança).

**Aprovado quando** todo campo tem finalidade escrita e os quatro pontos conferem. Gravidade: 🔴 para dado
sensível sem base legal ou consentimento de marketing pré-marcado; 🟡 para campo sem finalidade.

## 5.7 Conformidade LGPD

**Por quê.** Além da política, a LGPD pede um encarregado com contato público
([art. 41](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)), atendimento aos
direitos do titular ([art. 18](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)),
registro das operações de tratamento ([art. 37](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm))
e comunicação de incidente à ANPD e ao titular
([art. 48](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)). O agente de pequeno
porte tem regras simplificadas
([Resolução CD/ANPD nº 2/2022](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/regulamentacoes-da-anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)),
mas continua obrigado a ter um canal de comunicação com o titular.

**O core já faz.** Exportar os dados e apagar a conta, em Minha conta › Privacidade (rotas
`apps/api/app/(routes)/account/export` e `account/deletion`), com anonimização dos registros da trilha de
auditoria. Os modelos [`ROPA.md`](../ROPA.md), [`SUBPROCESSORS.md`](../SUBPROCESSORS.md),
[`INCIDENT-RESPONSE.md`](../INCIDENT-RESPONSE.md) e [`BACKUP.md`](../BACKUP.md), preenchidos com o que o
core faz e com marcadores `[FORK]` para o resto ([`PRE-PRODUCTION.md`](../PRE-PRODUCTION.md) §14).

**Como medir.**

```bash
git grep -n "\[FORK\]" -- docs/ROPA.md docs/SUBPROCESSORS.md docs/INCIDENT-RESPONSE.md docs/BACKUP.md
```

Confira também:

- o nome e o contato do encarregado (ou o canal, para quem é de pequeno porte e dispensado) estão na
  política e funcionam;
- exportar e apagar a conta funcionam de ponta a ponta com uma conta de teste;
- o ROPA tem uma linha para cada tratamento que o fork acrescentou (coleção nova, integração nova);
- cada subprocessador tem o DPA aceito, e a transferência internacional tem o mecanismo registrado;
- o roteiro de incidente tem um responsável com nome e o prazo de comunicação.

**Aprovado quando** nenhum `[FORK]` sobra nos quatro documentos e os cinco pontos conferem. Gravidade: 🔴
se não há canal do titular ou apagar a conta não funciona; 🟡 nos demais casos.

## 5.8 Acessibilidade

**Por quê.** Site mantido por empresa com sede ou representação no Brasil tem de ser acessível
([Lei 13.146/2015, art. 63](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm)). A
referência técnica é a [WCAG 2.2](https://www.w3.org/TR/WCAG22/), nível AA.

**O core já faz.** O axe roda na suíte E2E com as regras de WCAG 2.0 e 2.1, níveis A e AA, nos temas claro
e escuro, nas telas que a suíte percorre (landing, cadastro da landing, 404, login e CRUD de `entity`), e a lista de
exceções está vazia (`apps/e2e/a11y/allowlist.ts`). Isso cobre contraste e a presença de `alt` nessas
telas. O que o axe não julga fica para este item.

**Como medir.**

1. **Telas do fork no E2E.** Toda tela principal que o fork acrescentou chama `expectAccessible` num teste
   E2E. Tela fora da suíte não tem contraste nem `alt` conferidos.
2. **Teclado.** Com o `agent-browser`, percorra cadastro, login, a ação principal do produto e um diálogo só
   com `Tab`, `Shift+Tab`, `Enter`, `Espaço` e `Esc`: todo controle é alcançável, o foco é visível e não
   fica escondido atrás de barra fixa, o diálogo prende o foco e devolve ao fechar, e nada exige mouse.
3. **`alt` com sentido.** O axe confere que o atributo existe, não que ele descreve a imagem. Leia o `alt`
   de cada imagem de conteúdo da landing: descreve o que a imagem mostra, e imagem decorativa tem
   `alt=""`.

**Aprovado quando** os três passos conferem. Gravidade: 🔴 se um fluxo principal não completa pelo teclado;
🟡 nos demais casos.

## 5.9 Publicidade honesta

**Por quê.** Publicidade enganosa é proibida, inclusive por omissão
([CDC, art. 37](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)). Depoimento inventado,
número de clientes que não existe, selo que o produto não tem e "garantia" que os termos não sustentam
entram aqui.

**O core já faz.** A landing do core descreve o próprio boilerplate e não traz depoimento, logo de cliente
nem número de uso; o recorte do painel no hero tem dados marcados como ilustrativos. Os textos ficam em
`packages/internationalization/translations/apps/web/pages/` e existem para o fork trocar. Seção de prova
social só entra quando o fork tiver depoimento ou número real, com a origem escrita (regra também em
[`DESIGN.md`](../DESIGN.md)).

**Como medir.** Leia a landing inteira, nos três idiomas, e para cada afirmação verificável escreva no
relatório de onde ela vem:

- depoimentos e avaliações: pessoa real, com autorização por escrito para uso do nome e da foto;
- números ("+10 mil usuários", "99,9% de disponibilidade"): fonte ou medição;
- selos, logos de clientes e "visto em": autorização ou contrato;
- promessas de resultado, prazo, segurança ("100% seguro", "resultado garantido") e de preço ("grátis para
  sempre"): sustentadas pelos termos e pelo produto;
- comparação com concorrente: verdadeira e verificável.

**Aprovado quando** toda afirmação verificável tem origem escrita e nenhum texto de exemplo do core segue
publicado. Gravidade: 🔴 para depoimento, número ou selo inventado; 🟡 para promessa que os termos não
cobrem.

## 5.10 Direitos autorais das imagens e do conteúdo

**Por quê.** Usar imagem, ícone, fonte, vídeo ou texto sem licença é violação de direito autoral
([Lei 9.610/1998](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm)), e o titular pode pedir a
remoção e indenização. Imagem achada no Google não vem com licença.

**Como medir.** Liste todo arquivo de imagem, vídeo e fonte que o fork publica:

```bash
git ls-files 'apps/web/public/**' 'apps/app/public/**' | grep -Ei '\.(png|jpe?g|webp|gif|svg|avif|mp4|webm|woff2?)$'
```

Para cada um, escreva no relatório a origem: criado pelo time, banco de imagem (com o nome e o tipo de
licença), gerado por IA (com a ferramenta, conferindo se os termos dela permitem uso comercial) ou do
cliente (com a autorização). Confira também as fontes carregadas de fora e a licença delas, e se foto de
pessoa identificável tem autorização de uso de imagem.

**Aprovado quando** todo arquivo tem origem e licença escritas. Gravidade: 🔴 para material sem licença
na landing; 🟡 para licença não documentada.

## 5.11 Dados da empresa

**Por quê.** Quem vende pela internet precisa mostrar, em local de destaque, nome empresarial, CNPJ (ou
CPF), endereço físico e eletrônico e as demais informações para localização e contato
([Decreto 7.962/2013, art. 2º](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm)).
Mesmo fora do comércio eletrônico, é o que dá confiança a quem paga e o que a Stripe pede no site.

**O core já faz.** Nada. O rodapé mostra a marca e os links legais, sem dados da empresa.

**Como medir.** Abra o rodapé da landing e os termos e confira: razão social, CNPJ, endereço, e-mail e
um canal de atendimento. Os dados precisam ser os mesmos da conta da Stripe e da política de privacidade.

**Aprovado quando** os cinco dados aparecem no rodapé ou numa página de "sobre" com link no rodapé, e
batem com a Stripe e a política. Gravidade: 🔴 se o produto cobra e não mostra CNPJ ou CPF; 🟡 nos demais
casos.

## 5.12 Riscos jurídicos

**Por quê.** Os itens anteriores conferem o que é comum a todo produto. Cada fork tem riscos próprios do
domínio dele, e esses precisam ser vistos por alguém antes de abrir para o público.

**Como medir.** Responda no relatório, uma linha cada:

- O produto trata dado sensível, de criança ou de saúde? Atividade regulada (financeira, saúde, educação,
  jurídica, apostas)?
- O produto publica conteúdo de usuário? Há regra de moderação e canal de denúncia?
- O produto guarda registro de acesso? O [Marco Civil, art. 15](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm)
  obriga o provedor de aplicação constituído como pessoa jurídica a guardar os registros por seis meses.
- O produto usa IA para decidir algo sobre a pessoa (crédito, seleção, preço)? A LGPD dá direito à revisão
  de decisão automatizada ([art. 20](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)).
- Há contrato com o cliente que pede algo além disto (SLA, cláusula de dados, seguro)?
- Quem revisou as políticas e os termos, e quando.

**Aprovado quando** todas as perguntas têm resposta, e cada risco identificado tem uma decisão (tratado,
aceito com dono ou levado a advogado). Gravidade: 🟡 para risco sem decisão; a pessoa que assina pode
subir para 🔴.

## 5.13 Mercados atendidos

**Por quê.** Os itens anteriores seguem a lei brasileira. Quem vende para outro país herda as regras de lá:
privacidade (o [GDPR](https://gdpr-info.eu/) na União Europeia, as leis estaduais dos EUA, como a da
Califórnia), direito de arrependimento e reembolso do país do consumidor, e imposto sobre venda digital
cobrado no destino.

**O core já faz.** As páginas legais existem nos três idiomas, como modelo. O checkout da Stripe abre no
idioma da pessoa. O core **não** calcula imposto, não coleta documento fiscal e não oferece o mesmo plano em
várias moedas: isso é a spec [`international-billing`](../../specs/features/international-billing.md).

**Como medir.** Escreva no relatório a lista de países ou regiões onde o produto vende ou capta usuário, e
para cada um:

- a lei de privacidade aplicável e se a política (5.1) cobre o que ela pede: base legal, direitos do titular,
  transferência internacional e contato;
- se os termos (5.2) e a política de reembolso (5.5) valem para o consumidor de lá, no idioma dele;
- se há imposto sobre o serviço digital a cobrar ou recolher, e quem cuida disso (Stripe Tax, contador,
  merchant of record);
- em que moeda o preço aparece e é cobrado, e se isso está escrito na página de preços;
- se as páginas legais existem no idioma do mercado.

Mercado só no Brasil: o item fica ➖, com a frase "vende só no Brasil".

**Aprovado quando** todo mercado listado tem as cinco respostas, e cada lacuna tem uma decisão (tratada,
aceita com dono ou levada a advogado ou contador). Gravidade: 🔴 se o produto cobra em outro país sem
política de privacidade que cubra aquele mercado; 🟡 nos demais casos.

## Registro no relatório

Na seção 5 do [`report-template.md`](report-template.md), cada item ganha o status, a evidência escrita (a
URL da página, o resultado do comando, a lista de campos com finalidade, a origem de cada imagem) e, no
5.12, as respostas. Print não conta: o que ele prova vai escrito.
