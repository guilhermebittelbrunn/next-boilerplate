# Relatório de QA — consentimento de cookies e Consent Mode

Rodada autônoma do `/cycle`, em 2026-09-16, sobre a branch `feat/cookie-consent`. Nada foi commitado.

O `/develop` e o `/review` já mediram no browser a supressão das tags, a ordem no `dataLayer` e o alcance
dos links da tela de login depois da correção de layout. Esta rodada cobriu o que ficou de fora: o
acoplamento entre o banner e o layout de autenticação, duplo clique, persistência do cookie, navegador sem
JavaScript, o rodapé da landing sob o banner, e os critérios de aceite.

> **Nota de ordem.** Este relatório foi escrito depois de um vai-e-volta: o QA reprovou um critério, o
> `/review` corrigiu o defeito e remediu, e o texto abaixo reflete o estado final. A seção
> [Defeito encontrado](#defeito-encontrado) preserva o que foi medido nas duas pontas, porque o caminho
> importa tanto quanto o desfecho.

## Placar

| classificação | quantidade |
|---|---|
| aprovado | 23 |
| reprovado | 0 |
| não verificado | 4 |

O checklist item a item está em [`criterios-aceite.md`](criterios-aceite.md), com o meio de verificação de
cada critério.

O 23º aprovado é o critério do rodapé da `apps/web`, que o QA reprovou e o `/review` corrigiu em seguida.
Quem o verificou depois da correção foi o `/review`, não o QA — a distinção fica registrada porque a
verificação final não é independente da correção.

Os quatro não verificados e o motivo de cada um:

1. **Admin personificando mantém a escolha do navegador.** Exige tela autenticada. Autenticar exige os
   emuladores do Firebase, que pedem JDK 21, e a máquina tem `openjdk 17.0.13` (confirmei rodando
   `java -version`, em vez de aceitar a afirmação do handoff).
2. **O item de preferências no menu de perfil da `apps/app`, em tela.** Mesma limitação de JDK. O teste
   jsdom `apps/app/__tests__/profileDropdownCookieConsent.test.tsx` cobre as três condições do item, e o
   gatilho equivalente da `apps/web` abriu o diálogo no browser.
3. **O Consent Mode do lado do Google.** Medi os quatro sinais no `dataLayer` e o `gcs=G101` na requisição
   de coleta. O que o Google faz com eles só aparece numa propriedade real.
4. **O cookie entre subdomínios reais (`SESSION_COOKIE_DOMAIN`).** Em `localhost` o cookie é compartilhado
   sem configuração nenhuma, então o caminho com domínio pai não chega a ser exercitado.

Os itens 3 e 4 são pré-requisitos manuais de infra e não reprovam a entrega. Estão registrados na seção 7 de
[`docs/PRE-PRODUCTION.md`](../../../PRE-PRODUCTION.md).

## Defeito encontrado

**O card do banner cobria os links do rodapé no fim da rolagem da `apps/web`.** Defeito de código de
produção, então não corrigi aqui: voltou para o `/review`, que o corrigiu na mesma rodada.

Repro usado, com `apps/web` servindo e `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST00000`:

1. Abra `/pt-br` sem o cookie `bp:cookie-consent`, com a janela em 390x844.
2. Role até o fim da página, onde fica o rodapé.
3. Tente clicar em "Política de Privacidade".

Medido com `elementFromPoint` no centro de cada alvo, com a página no fim da rolagem:

| viewport | altura do banner | links do rodapé inalcançáveis |
|---|---|---|
| 390x844 | 354 px | "Início", "Preços", "Política de Privacidade", "Termos de Uso" |
| 1280x800 | 250 px | "Início", "Preços" |

O elemento no topo do ponto era um nó de dentro do `[data-cookie-banner]` nos dois casos, e não a faixa
transparente: a correção de `pointer-events` do `/review` estava funcionando, o que bloqueava era o card
opaco. A captura está em `e2e/05-rodape-coberto-mobile.png`.

Duas ressalvas mudavam a severidade, sem desfazer o defeito:

- A condição terminava assim que o visitante respondesse ao banner, com um clique. Não era permanente, ao
  contrário do caso da tela de login, onde a página não rolava e não havia caminho nenhum até os links.
- A política de privacidade continuava alcançável pelo link de dentro do próprio banner.

O quinto elemento do rodapé, o botão "Preferências de cookies", também aparecia bloqueado na medição, mas
por cima dele estava o `NEXTJS-PORTAL`, o distintivo do Next.js em desenvolvimento, que não existe em
produção. Descartei esse ponto da evidência, e o `/review` confirmou o descarte observando que o portal
aparece com e sem banner.

**Como foi corrigido.** O `/review` aplicou em `apps/web/app/[locale]/components/footer.tsx:56` a mesma
folga condicional que já havia usado na tela de login: `[body:has([data-cookie-banner])_&]:pb-96`, mais
`bg-background` para a faixa reservada não destoar do rodapé. Antes de confiar na correção, reproduziu o
defeito no próprio navegador zerando a folga à mão (`footer.style.paddingBottom='0px'`, valor computado de
`384px`) e remediu — os quatro alvos voltaram a acusar bloqueio, batendo com o que eu havia medido.

Depois da correção, os quatro links ficaram alcançáveis nas duas viewports, e sem banner o
`padding-bottom` do rodapé volta a `0px`, com `scrollHeight` exatamente 384 px menor. Os números estão em
[`../review/review.md`](../review/review.md).

## O que este defeito diz sobre o processo

A sobreposição do banner estava declarada como risco na seção 8 do plano. Ela atravessou o `/develop` e a
primeira rodada do `/review` sem ninguém medir, e a segunda rodada mediu só a tela de login — porque foi só
a tela de login que a instrução citou. Não foi falha de código, foi escopo de medição curto demais.

A regra que fica, e que vale para quem acrescentar um terceiro app: o banner é fixo na base da janela e
cobre os 250 px (desktop) a 354 px (celular) inferiores de **qualquer** página. Medir o fim da rolagem é
parte de montá-lo, não um extra.

## Gates

Rodados na árvore com os dois testes novos dentro.

| comando | resultado |
|---|---|
| `pnpm test` (raiz, turbo) | 10 de 10 tasks, 1038 testes, todos passando |
| `pnpm --filter app test` | 293 testes em 41 arquivos (eram 277 em 39) |
| `pnpm --filter web test` | 31 testes em 5 arquivos |
| `pnpm --filter @repo/analytics test` | 34 testes em 2 arquivos |
| `pnpm --filter @repo/shared test` | 44 testes em 4 arquivos |
| `pnpm --filter @repo/internationalization test` | 27 testes em 3 arquivos, paridade dos 3 idiomas inclusa |
| `pnpm --filter app typecheck` | passa |
| `pnpm check` | 543 arquivos, nenhum erro |

O `pnpm test` da raiz é o que interessa para o `turbo build`, que depende de `test`. Nenhum teste falhou em
nenhum momento desta rodada, e nenhum foi afrouxado.

## Testes criados

Dois arquivos, 16 testes, ambos em `apps/app/__tests__/`, que é o único workspace do escopo com jsdom e o
plugin do React já montados. Nenhum deles precisa de emulador, app servindo ou processo externo.

### `cookieBannerAuthLayoutOffset.test.tsx` (4 testes)

Prova o acoplamento que o `/review` registrou como a lacuna de maior consequência: a folga da página de
autenticação depende de o banner publicar `data-cookie-banner` e de o layout esperar exatamente esse
atributo. O teste lê o seletor direto do arquivo de layout, renderiza o banner e aplica o seletor lido ao
que foi renderizado. Cobre também que a folga não existe com o banner fechado e que o contêiner usa
`min-h-dvh`, sem o que a página volta a não rolar.

Conferi que o teste falha quando o acoplamento quebra: renomeei `data-cookie-banner` para
`data-cookie-notice` no componente e o teste reprovou; restaurei o arquivo e confirmei com `diff` que ele
voltou byte a byte.

Custo escolhido: leitura de arquivo mais render em jsdom, na casa dos milissegundos. Subir os dois apps
para clicar num link do login provaria a mesma coisa e custaria minutos por execução, em toda PR.

### `analyticsConsentProvider.test.tsx` (12 testes)

Cobre o comportamento do `AnalyticsProvider` com o Google Analytics e o Vercel Analytics trocados por
marcadores: nenhuma tag antes da decisão, nenhuma tag depois de uma recusa, as duas tags depois de um
consentimento, o script de padrões antes da tag na árvore, o conteúdo do `consent default` nos três estados
de cookie, a gravação do cookie com TTL de 180 dias e o repasse de `domain` e `secure`, o duplo clique em
cada botão do banner, e o modo degradado sem medição configurada.

Também conferi que o teste de ordem falha quando a ordem muda: movi o `<ConsentModeDefaults>` para depois
do `<GoogleAnalytics>` no provider e o teste reprovou; restaurei e confirmei com `diff`.

Limite honesto desse teste: ele fixa a ordem dos nós na árvore, que é o lado que este repositório controla.
A estratégia de carregamento do `@next/third-parties` continua sem proteção, e uma versão futura que troque
`afterInteractive` por outra coisa muda a ordem no `dataLayer` sem quebrar teste nenhum. Isso só apareceria
numa passada de browser.

### Onde não criei teste novo

- `packages/analytics/consent.ts` já tem 24 testes, incluindo cookie corrompido, versão desconhecida,
  categoria ausente e entrada hostil. Cobrem o critério de cookie corrompido inteiro. Rodei, não
  acrescentei.
- `packages/shared/__tests__/cookies.test.ts` já fixa que `setCookie` sem opções produz a string de antes, e
  que `domain` e `secure` entram quando pedidos. É o que sustenta o critério de TTL.
- `packages/internationalization` já tem o teste de paridade, que cobre as 14 chaves novas nos 3 idiomas.
- `apps/app/__tests__/profileDropdownCookieConsent.test.tsx` cobre o item do menu de perfil. Sem browser
  autenticado, é a única cobertura possível hoje, e ela existe.
- Nenhum teste da faixa cara foi criado. Nada nesta entrega tem infraestrutura como objeto: não há consulta
  ao Firestore, regra de segurança, repositório nem sessão envolvidos.

### Lacuna que permanece

O rodapé da `apps/web` virou um segundo consumidor de `data-cookie-banner`, e esse acoplamento não tem
teste. A suíte da `web` roda em `environment: "node"`, sem jsdom, então o equivalente ao teste da `app` não
cabe lá sem mudar `vitest.config.mts`.

## Evidências do e2e

Capturas em `e2e/`, da `apps/web` e da `apps/app` servindo em portas próprias:

| arquivo | o que mostra |
|---|---|
| `01-banner-primeira-visita.png` | primeira visita, tema escuro, 1280x800 |
| `02-banner-claro-desktop.png` | mesmo estado no tema claro, com os dois botões no mesmo peso |
| `03-preferencias-claro.png` | diálogo de preferências, medição desligada, necessários fixos |
| `04-banner-mobile.png` | 390x844, botões empilhados em largura cheia |
| `05-rodape-coberto-mobile.png` | o defeito: rodapé sob o card no fim da rolagem |
| `06-signin-rolado-com-banner.png` | tela de login rolada até o fim, com o banner aberto |
| `07-signin-sem-banner.png` | a mesma tela depois da decisão, de volta à altura da janela |

Medições feitas no browser além das capturas:

- Primeira visita: `dataLayer` com uma entrada, `consent default` negado com `wait_for_update: 500`, nenhum
  recurso de terceiro carregado.
- Duplo clique em "Recusar tudo": um `consent update` no `dataLayer`, um cookie gravado, banner fora do
  documento, zero recursos de `googletagmanager`, `google-analytics` ou `vercel`.
- Aceitar: ordem `consent default`, `consent update (granted)`, `js`, `config`; cookies `_ga` e
  `_ga_TEST00000` gravados; a requisição de coleta saiu com `gcs=G101`.
- Atributos do cookie de consentimento lidos do Chrome: `session: false`, `sameSite: Lax`, `expires`
  15.552.000 segundos à frente, que são os 180 dias declarados no código.
- Decisão tomada na `apps/app` (porta 3010) suprimiu o banner na `apps/web` (porta 3011), sem carregar tag
  nenhuma.
- Tela de login com o banner aberto: `scrollHeight` 1110 contra janela de 844 no celular, 1142 contra 800 no
  desktop, e os três alvos alcançáveis com a página rolada ao fim. Depois da decisão, `scrollHeight` volta a
  800 em janela de 800.
- Os três idiomas na landing, com `htmlLang` e link da política acompanhando: `/pt-br/legal/privacy`,
  `/en/legal/privacy`, `/es/legal/privacy`.

Comportamento sem JavaScript, medido pelo HTML servido, que é tudo o que um navegador nessas condições
recebe:

| estado do cookie | `analytics_storage` no script | `wait_for_update` | banner no HTML | citações a `googletagmanager` |
|---|---|---|---|---|
| ausente | `denied` | sim | sim | 0 |
| `v1:analytics=denied` | `denied` | não | não | 0 |
| `v1:analytics=granted` | `granted` | não | não | 1, um `link rel=preload` |
| `v9:lixo` | `denied` | sim | sim | 0 |

A única citação ao Google no HTML aparece depois do consentimento, como `preload`. Antes da decisão, o
documento servido não tem nada do Google, então um navegador sem JavaScript não mede e não é medido.

## Ambiente do e2e

As portas 3000 e 3001 estavam ocupadas por outro projeto do usuário. Não toquei nelas e conferi ao final que
continuam como estavam. Subi dois servidores em portas livres, guardei os PIDs e matei os dois:

| serviço | porta | como subiu | estado final |
|---|---|---|---|
| `apps/web` | 3011 | `next dev -p 3011` com `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST00000` | derrubado, porta livre |
| `apps/app` | 3010 | `next dev -p 3010` com a mesma variável | derrubado, porta livre |

O `pnpm exec next dev` deixa um processo filho `next-server` que sobrevive à morte do pai. Matei os dois
filhos por PID e confirmei com `lsof -ti tcp:3010` e `lsof -ti tcp:3011`, que voltaram vazios. Nenhum `.env`
foi alterado: as variáveis foram passadas na linha de comando. O browser do `agent-browser` foi fechado.

## Observações e follow-ups

Nenhum destes reprova a entrega, e nenhum foi corrigido aqui.

- **Recusar depois de ter aceitado não apaga os cookies `_ga` já gravados.** O Consent Mode passa a negar o
  armazenamento e a tag para de carregar, então nada novo é escrito nem enviado, mas os valores antigos
  continuam no navegador até expirarem. Remover cookie de terceiro na retirada do consentimento não está no
  corte da spec nem no plano. Vale como próxima iteração.
- **O cookie `x-locale` é de sessão.** Li os atributos no Chrome enquanto verificava o de consentimento:
  `expires: -1`, `session: true`. É anterior a esta tarefa e não afeta o consentimento, mas significa que a
  escolha de idioma se perde ao fechar o navegador.
- **A divergência de locale que o `/review` registrou não aparece na `apps/web`.** Ali a página inteira
  segue o cookie `x-locale`, então banner e conteúdo ficam sempre no mesmo idioma. Na primeira requisição
  depois de trocar de idioma, a página inteira sai na locale anterior, o que é comportamento antigo do
  repositório. O achado do `/review` continua valendo para a `apps/app`, onde o segmento `[locale]` da URL
  guia o conteúdo e o cookie guia o resto.

## Dados de QA criados

Nenhuma conta, nenhum documento no Firestore, nenhum dado remoto. O único estado é o cookie
`bp:cookie-consent` no perfil de navegador do `agent-browser`, em `localhost`, junto com os `_ga` que a tag
de teste gravou com o id falso `G-TEST00000`. Nada disso sai da máquina.
