# Relatório de testes — `auth-panel-context`

Branch `feat/initial-files-v1` · escopo: os 28 commits de `999150f..HEAD` (o corpo de ferramental de IA
foi excluído do QA — não é código de produto). Nada commitado nesta etapa.

## Veredito: `done` (foi `blocked` na primeira passada — ver Resolução no fim)

Os **4 bugs relatados pelo usuário não reproduzem**. A validação executável, porém, encontrou **2
defeitos bloqueantes** no cenário central da feature (impersonação), com a **mesma causa raiz**.

---

## 1. Testes automatizados

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter app test` | ✅ 110 (era 93) |
| `pnpm --filter api test` | ✅ 32 (era 21) |
| `pnpm --filter @repo/internationalization test` | ✅ 2 (paridade pt-br/en/es) |
| `pnpm test` (root — gateia o `turbo build`) | ✅ 3/3 tasks, **144 testes** |
| `pnpm --filter {api,app,web} typecheck` | ✅ nos três |
| Biome no escopo | ✅ limpo (só `useFilenamingConvention`, pré-existente em toda a árvore) |

### Criados nesta etapa (working tree, não commitados)

Cobrem as lacunas que o `review/review.md` priorizou:

| Arquivo | Testes | O que trava |
|---------|--------|-------------|
| `apps/api/__tests__/usersRoute.test.ts` | 7 | `GET /users` atravessando o guard real: `requestRole === COMMON` força `type=common` e **ignora `?type=admin`** |
| `apps/api/__tests__/userRepositoryList.test.ts` | 4 | perfil órfão no Auth é omitido; falha transitória **propaga** |
| `apps/app/__tests__/proxy.test.ts` | 12 | o gate mais externo, que não tinha nenhum teste: default-deny, `isStaticAssetPath`, `?redirect=` preservado e honrado |
| `apps/app/__tests__/authRequestTimeZone.test.ts` | 5 | validação IANA e resolução da timezone do browser |

⚠️ **O enforcement de `GET /users` está correto e coberto, mas nunca é exercitado em runtime hoje** —
ver defeito 1: os headers de contexto não chegam à API.

## 2. Os 4 bugs relatados — verificados dirigindo o app

| # | Relato | Resultado |
|---|--------|-----------|
| 1 | Cache não limpava na troca de usuário | ✅ não reproduz |
| 2 | Componente de contexto quebrando o layout | ✅ não reproduz (largura fixa + truncamento) |
| 3 | Sidebar "piscando" ao navegar | ✅ não reproduz — segue recolhida entre navegações **e** trocas de contexto |
| 4 | Erro de hidratação do Next | ✅ **zero aviso** em todo o percurso |

## 3. Defeitos bloqueantes encontrados

### D1 — headers `x-*` são apagados depois de aplicados

Impersonando, `GET`/`POST /entities` respondem **403 `COMMON_PANEL_FORBIDDEN`**. Os headers capturados na
request real trazem só `accept` e `authorization` — nenhum `x-*`.

Cadeia (efeito de filho roda **antes** do de pai, em React):

1. `ClientLayout` renderiza → `AuthRequestPanelProvider` (filho) renderiza e aplica os `x-*` no
   inicializador do `useState`;
2. efeito do **filho** roda → aplica os `x-*` de novo e assina o store;
3. efeito do **pai** (`ClientLayout`) roda → `user` ainda é `null` (Firebase resolve async) → cai no
   `else` → `apiClient.clearAuthRequestContext()` **destrói todos os `x-*`**;
4. Firebase resolve → o efeito do pai re-roda e devolve **só** o `Authorization`;
5. o efeito do provider **não** re-roda: sua dependência é `actorUid`, que vem do servidor e não mudou;
   e o `store.subscribe` não dispara porque o store não mudou.

A linha do `clearAuthRequestContext()` é **anterior** a esta feature, mas era inofensiva: antes o contexto
vinha por rede e era aplicado *depois* desse efeito. Esta feature inverteu a ordem ao mover a aplicação
para o render — e com isso a limpeza do pai passou a ganhar.

Passou por todos os testes porque nenhum deles exercita o entrelaçamento dos dois efeitos, e porque
`requireAdminApi` só exige que o **ator** seja admin: `GET /users` continua 200 e o seletor parece são —
o filtro que aparenta funcionar vem do `?type=common` que o **cliente** manda.

### D2 — seletor de ambiente em dead-end permanente

`/users?type=common` responde **401** em carga fria (3/3 tentativas). A query dispara no primeiro efeito
— o gate é `enabled: profileKind !== null`, que conhece o painel mas **não** o token — enquanto o
`Authorization` só é definido no efeito async do `ClientLayout`. Com `retry: 1` e `staleTime: 60s` a lista
fica vazia, `impersonationOptions.length === 0` e o seletor fica **desabilitado para sempre**.

Funciona logo após o login (o sign-in já deixou o token aplicado), o que faz o sintoma parecer
intermitente sendo determinístico.

A regra "desabilitar o seletor quando não há alvo possível" está correta — está sendo acionada pelo
motivo errado.

### Causa raiz comum

**Duas fontes mutam o mesmo singleton `apiClient` em ordens diferentes, sem um dono único.** O
`ClientLayout` é dono do `Authorization`; o provider é dono dos `x-*`; e o primeiro limpa os headers do
segundo.

## 4. Defeitos menores

| Local | Problema |
|-------|----------|
| listagem de entidades | 403 é renderizado como "Nenhuma entidade cadastrada." — erro silenciado como estado vazio |
| formulário de entidade | submit falho não dá nenhum feedback (viola a regra de ouro 3: erro por `error.code` → toast) |
| `packages/design-system/.../select/index.tsx` | aviso `Select is changing from uncontrolled to controlled`: `resolveSelectValue` descarta valor válido enquanto `options` está vazio |

## 5. Evidências

18 screenshots em `test/e2e/` da primeira passada (light, dark e mobile) + 4 da resolução.

⚠️ Os prints **03** e **13** mostram a listagem de usuários do banco de dev, que inclui o e-mail da conta
de admin usada no teste. Nenhuma senha aparece em arquivo, nome de arquivo ou documento. Decidir se
mantém antes de commitar.

## 6. Cobertura pendente

- **Usuário comum de verdade**: o fluxo comum e "comum tentando `/admin`" só têm cobertura unit — falta
  credencial de um usuário comum para dirigir o app nesse papel.
- **Modo de produto `simple`**: não exercitado (exigiria `NEXT_PUBLIC_PRODUCT_MODE=simple`).
- **3 idiomas**: só `pt-br` foi percorrido no browser; a paridade de chaves é garantida por teste.

## 7. Estado dos dados de dev

**Nenhum dado criado ou apagado** — as tentativas de criar entidade retornaram 403 (defeito 1).

---

# Resolução (mesma rodada)

Os 2 bloqueantes foram corrigidos, e corrigi-los revelou **3 defeitos derivados** — todos da mesma
família: mais de um dono para o mesmo estado.

## Correção estrutural

`AuthRequestPanelProvider` passou a ser a **única autoridade** sobre os headers do `apiClient` — token e
`x-*` escritos juntos, na mesma passada. `ClientLayout` não toca mais em headers. Limpeza só quando o
servidor reporta ausência de sessão.

## Os 5 defeitos e o que cada um exigiu

| # | Defeito | Correção |
|---|---------|----------|
| D1 | `clearAuthRequestContext()` no efeito do pai apagava os `x-*` aplicados pelo filho → 403 em toda request impersonada | dono único dos headers |
| D2 | query saía antes do token → 401 cacheado → seletor em dead-end permanente | `sdkAuthorized` + gate |
| D3 | gate só no `useListUsers`: `/entities` seguia disparando 401 em carga fria | **`useAuthorizedQuery`** aplicado a **todos** os hooks autenticados |
| D4 | `router.refresh()` e `router.push()` no mesmo tick se cancelavam → trocar de painel não navegava | uma navegação por troca: `push` muda rota, `refresh` mantém |
| D5 | `queryClient.clear()` descartava o dado mas **não refazia** a busca → tabela vazia até refresh manual | `queryClient.resetQueries()` |
| D6 | `applyAuthHeaders` escrevia no store de dentro de uma subscription **dele mesmo** → re-entrância engolia as atualizações e o refetch nunca saía | escrita movida para o efeito |

D3 a D6 só apareceram **dirigindo o app**. Nenhum teste unitário os pegaria, porque todos são sobre
ordem de execução entre efeitos, navegação e cache.

## Verificação no browser (carga fria, admin impersonando)

| Checagem | Antes | Depois |
|----------|-------|--------|
| `GET /entities` | 403 `COMMON_PANEL_FORBIDDEN` | **200** |
| `GET /users?type=common` | 401 → lista vazia → seletor travado | **200**, 4 usuários |
| Controles de painel | desapareciam | ambos visíveis, painel segue "comum" |
| Trocar de usuário | dado antigo permanecia | `entities` refetcha (1 → 2 requests), ambos 200 |
| 401/403 no fluxo | presentes | **nenhum** |

Truncamento verificado por medição, não por impressão: `desenvolvimento@comanda10.com.br` tem
`scrollWidth > clientWidth` (está sendo clipado) e **todas** as opções carregam `title` para o hover.

## Testes: 116 → 148

Além dos 4 arquivos das lacunas do review, **`authHeaderOwnership.test.tsx`** renderiza a composição real
(`ClientLayout` + provider). Confirmei que ele **falha** contra o código antigo — reintroduzi o bug e o
teste quebrou com `expected undefined to be 'admin-1'`. Não é tautologia.

`authRequestPanel.test.tsx` ganhou a asserção de que `refresh` **não** é chamado junto do `push`, que é
exatamente o D4.

## Evidências novas

`20-picker-aberto-ellipsis.png` · `21-impersonando-light.png` · `22-impersonando-dark.png` ·
`23-impersonando-dark-desktop.png`.

⚠️ O print `23` foi capturado em **desktop**, não em mobile: `agent-browser viewport` não existe na versão
instalada (0.27.0). Renomeado para não descrever algo que não é. **Mobile segue sem cobertura visual** no
fluxo de impersonação.

## Continua pendente

- **Mobile** no fluxo de impersonação (sem comando de viewport disponível).
- **Credencial de usuário comum** — o papel comum puro só tem cobertura unit.
- **Modo de produto `simple`** não exercitado.
- Menores conhecidos e **não** corrigidos: 403/erro de carga renderizado como "Nenhuma entidade
  cadastrada." e submit sem feedback de erro. Deixam de aparecer no fluxo feliz agora que o 403 sumiu, mas
  a fragilidade de UI continua lá.
