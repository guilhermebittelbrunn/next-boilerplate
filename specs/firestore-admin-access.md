---
id: firestore-admin-access
title: Acesso ao Firestore via Admin SDK e security rules aplicáveis
status: proposed
value: alto
effort: M
audience: confianca
area: [apps/api, packages/auth, raiz]
mode: ambos
depends_on: []
feature: -
updated: 2026-08-21
---

# Acesso ao Firestore via Admin SDK e security rules aplicáveis

## Problema

A API deste boilerplate conversa com o banco como se fosse um visitante anônimo do navegador: usa
credenciais que são públicas por natureza. A única coisa que impede qualquer pessoa na internet de ler e
escrever a base inteira, ignorando todos os guards, é o fato de as regras de acesso do Firestore ainda não
terem sido publicadas — e publicá-las, hoje, derruba a API. É um impasse com duas saídas ruins:
indisponibilidade ou exposição. Enquanto ele existir, todo controle de autorização escrito na API é
opcional para quem quiser contorná-lo, e **todo fork nasce com o impasse herdado**.

## O que já existe no repo

- `apps/api/(shared)/infra/dabatase.ts:1-17` (o erro de digitação no nome do arquivo é real) — inicializa
  `firebase/app` + `firebase/firestore`, ou seja, o **client SDK sem autenticação**, e exporta a instância
  como default. A config do projeto (`apiKey`, `projectId`, …) está **hardcoded** em `:4-12`.
- `apps/api/(shared)/repositories/base.repository.ts:4-15,34-40` — toda a persistência é escrita contra a
  API do client SDK (`collection`, `getDocs`, `query`, `where`, `addDoc`, `updateDoc`), com a instância
  recebida no construtor. Consumidores: `entity.repository.ts:3` e `user.repository.ts:4`.
- `firestore.rules:30-32` — postura `deny-all` para acesso direto de cliente. `:12-18` — o comentário no
  topo **avisa explicitamente** que a API hoje usa o client SDK e que publicar as regras nesse estado faz a
  API perder acesso e quebrar. `:34-51` — bloco alternativo (regras por dono) deliberadamente comentado,
  com a ressalva de que `entity.userId` guarda o id do documento de perfil, não o UID do Auth.
- `firestore.indexes.json:1-4` — vazio (`indexes: []`, `fieldOverrides: []`): nenhum índice versionado.
- `packages/auth/server.ts:74-80` — **a peça correta já existe**: acesso ao Firestore via `firebase-admin`,
  memoizado sobre o app admin (`:40-64`). A API simplesmente não a usa.
- `docs/SECURITY.md:26-42` — o achado já está documentado, com a ordem de migração e a instrução de não
  publicar as regras antes; o texto o classifica como "a prioridade #1 de segurança do fork". `:57` registra
  a config hardcoded como higiene pendente.
- **Lacuna:** nenhum caminho de leitura/escrita da API roda com identidade de serviço; as rules não podem
  ser publicadas; nenhum índice acompanha as consultas existentes.

## Evidência de mercado

- Nota: [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md)
- A nota abre com este item como **bloqueador que precede tudo**: "a `apps/api` acessa o Firestore pelo
  **client SDK não autenticado**, com `firestore.rules` em `deny-all`. Enquanto isso não migrar para
  `firebase-admin`, **qualquer controle de autorização a mais é teatro**." A frase é geral — a nota não a
  restringe a controles numerados específicos.
- **Controle 11** (autorização espelhada + rules deny-by-default), boa prática **OWASP A01**: a nota
  registra que "o Firebase documenta que as security rules são **'the only safeguard'** contra acesso direto
  do cliente". Com o cliente sendo a própria API, o safeguard está desligado por necessidade.
- **A01 Broken Access Control** é o primeiro item do **OWASP Top 10:2025**, a versão corrente segundo a nota.
- Fontes (da nota): <https://firebase.google.com/docs/rules/basics> · <https://owasp.org/Top10/2025/>

> Não se trata de prevalência entre starters: isto é pré-condição, não diferencial. Nenhum kit sério usa
> credencial pública de cliente como caminho de escrita do backend.

## Proposta — corte de MVP

- [ ] A API passa a acessar o Firestore com identidade de serviço confiável, não com credencial pública.
- [ ] O CRUD de referência (`entity`) e a gestão de usuários seguem funcionando igual, com a suíte verde.
- [ ] As credenciais do projeto saem do código e passam pelo env tipado, falhando cedo quando ausentes.
- [ ] As regras `deny-all` podem ser publicadas sem quebrar a aplicação, com o caminho de publicação
      documentado.
- [ ] Os índices exigidos pelas consultas atuais ficam versionados no repositório, em vez de nascerem
      clicados no console.

### Fora do corte

- Teste automatizado das rules no emulador — spec `firebase-emulator-seed`, que **só faz sentido depois**
  desta: hoje as rules não podem sequer ser publicadas.
- Modelo de acesso direto do cliente ao Firestore (regras por dono): `firestore.rules:34-51` explica por que
  não é recomendado aqui; continua fora mesmo depois desta spec.
- Firebase App Check (controle 16 da nota) — anti-abuso na borda, escopo de `api-hardening`.
- Reescrita da paginação para cursor — `cursor-pagination`.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum: o contrato HTTP não muda. |
| `apps/api` | Coração da mudança: a instância de banco e a camada de repositórios trocam de SDK. Nenhuma rota, guard ou DTO muda de forma. |
| `apps/app` | Nenhum, se o contrato for preservado — é o que os sinais de pronto verificam. |
| `apps/web` | N/A. |
| `packages/*` | `@repo/auth` já expõe o acesso admin (`server.ts:74-80`); nenhuma API nova. |
| Infra/env | Credenciais admin passam a ser obrigatórias na API (hoje `apps/api/env.ts:15-17` declara `server: {}`, isto é, nada). Publicar rules e índices vira passo de deploy. |

## Riscos e trade-offs

- **Custo herdado por todo fork:** a API deixa de subir sem credencial de service account. Hoje ela sobe
  com a config embutida no arquivo — cômodo e inseguro. É um passo a mais no setup de todo fork.
- Diferente de `ARCJET_KEY` em `packages/security/index.ts:12-18`, isto **não pode** ser opt-in com NO-OP:
  um fallback silencioso para o client SDK reintroduz exatamente a falha. Ausência de credencial tem de ser
  erro, não degradação.
- As duas APIs do Firestore não são intercambiáveis (`Timestamp`, formato de query, escrita). O risco
  concreto é regressão silenciosa em normalização de data; os mappers concentram isso, o que reduz mas não
  elimina.
- A config hardcoded aponta para um projeto Firebase real (`apps/api/(shared)/infra/dabatase.ts:5-11`).
  Tirá-la do código não a torna secreta — chave de cliente não é segredo —, mas encerra a ambiguidade sobre
  qual projeto a API usa e deixa cada fork apontar para o seu.
- Enquanto a migração não acontecer, publicar as rules derruba a aplicação e **não** publicar mantém a base
  alcançável. Não há terceira opção: adiar é escolher entre indisponibilidade e exposição.

## Sinais de pronto

- Com as regras `deny-all` publicadas, a aplicação funciona de ponta a ponta: login, listagem, criação,
  edição e exclusão no CRUD de referência.
- Uma tentativa de leitura direta ao Firestore usando as credenciais públicas do projeto é negada.
- Subir a API sem as credenciais de serviço falha de imediato, com mensagem clara, sem modo degradado.
- Nenhuma chamada do app precisou mudar: o contrato exposto pelo SDK é o mesmo antes e depois.

## Perguntas em aberto

- Publicar as rules como parte da entrega ou deixar como passo manual de cada fork? — **recomendação:**
  entregar o comando documentado e publicar no projeto de referência; o fork publica no dele.
- Corrigir o nome do arquivo (`dabatase`) junto, ou manter para reduzir o diff? — **recomendação:** corrigir;
  o raio de impacto são três imports, e o erro se propaga a todo fork.
- Ativar os Data Access logs do Firestore (opt-in, segundo a nota) já aqui? — **recomendação:** não; é
  configuração de projeto e pertence a `audit-log`.
