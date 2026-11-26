# Plano: prévia do upload de imagem achatada no mobile

Tarefa direta, sem spec (`spec: -`). Origem: achado registrado no `/test` de `account-avatar-polish`
(`docs/features/account-avatar-polish/test/report.md:119-121`). A 390 px, o contêiner da prévia do
`ImageUploadInput` mede 55,4 x 64 px e a imagem redonda vira elipse. O defeito aparece com e sem
personificação e não veio daquele diff.

## 1. Contexto e corte

O usuário que escolhe uma foto (avatar da conta, foto da entidade) vê uma prévia de 64 x 64 px em formato de
círculo. No celular ela fica oval, o que parece imagem distorcida ou corte errado.

Corte de MVP: a prévia mantém 64 x 64 em qualquer largura de tela. Nada além disso.

Fora de escopo:
- mexer no `ResponsiveImage` em si (ver §3, decisão D1);
- reorganizar o layout do campo (empilhar prévia e botões no mobile, mudar tamanho da prévia);
- o fallback por URL (`HookFormInput type="url"`), que não tem prévia.

Apps impactados: só `packages/design-system`. Nenhuma mudança em `apps/app`, `apps/web`, `apps/api`, SDK ou
i18n. Modo de produto, assinatura, dados, contrato, API, autorização e impersonação: N/A (a mudança é uma
classe CSS; o comportamento sob personificação não muda).

Estado do working tree: `git status --short packages/design-system/` sai vazio. O arquivo alvo não tem
mudança local entre as 122 entradas do working tree.

## 2. Causa, confirmada por leitura

`packages/design-system/components/ui/image-upload-input.tsx:167-217` monta a linha assim:

- `div.flex.items-center.gap-4` (linha 167) é o contêiner flex;
- filho 1: `ResponsiveImage` (linhas 169-176), com `width={64}` e `height={64}` (`PREVIEW_SIZE`, linha 12)
  e sem `className`;
- filho 2: `div.flex.flex-col.gap-2` (linha 179) com a linha de botões `flex flex-wrap` ("Trocar imagem",
  "Remover imagem") e o hint ("JPG, PNG ou WebP, até 4 MB.").

O `ResponsiveImage` (`packages/design-system/components/ui/responsive-image.tsx:40-43`) renderiza um
`div` com `relative overflow-hidden rounded-full` e `style={{ width, height }}`. Três fatos fecham a
causa:

1. O `width: 64px` inline vira o `flex-basis` do item, mas o `flex-shrink` continua no padrão `1`.
2. `overflow-hidden` faz o `min-width: auto` do item flex resolver para `0`, então nada segura a largura em
   64.
3. O filho 2 entra com `flex-basis` igual ao conteúdo sem quebra (os dois botões lado a lado, ou o hint numa
   linha). A 390 px, descontado o padding da página, a soma passa da largura disponível. O navegador reparte
   o excesso entre os itens proporcionalmente a `flex-basis × flex-shrink`, e a prévia perde cerca de 8,6
   px. A altura fica em 64 porque ela é fixa e o eixo cruzado não encolhe. Resultado: 55,4 x 64.

O texto vizinho influi no quanto a prévia encolhe. Os rótulos mudam por idioma
(`packages/internationalization/translations/apps/app/pages/common/account.ts:63-67`, `:332-336`,
`:602-606`; os mesmos valores em `entities.ts:46-50`, `:123-127`, `:200-204`): "Remover imagem" /
"Remove image" / "Quitar imagen", e o hint tem comprimentos diferentes nos 3 idiomas.

## 3. Correção

Adicionar `className="shrink-0"` na chamada do `ResponsiveImage` dentro de `image-upload-input.tsx`. O
`cn(...)` do `ResponsiveImage` (linha 41) já repassa a classe ao `div` externo.

```diff
                 {previewUrl ? (
                     <ResponsiveImage
                         alt={texts.alt}
+                        className="shrink-0"
                         height={PREVIEW_SIZE}
```

Com `flex-shrink: 0`, todo o encolhimento vai para a coluna de botões e hint. A coluna não tem
`overflow-hidden`, então o `min-width: auto` dela é o min-content: o botão mais largo (os botões do shadcn
não quebram texto) ou a palavra mais longa do hint. Os botões já são `flex-wrap` e o hint quebra linha, então
a coluna cabe em 390 px sem rolagem horizontal. É esse o ponto que o `/test` confirma medindo.

### D1. Na chamada, não dentro do `ResponsiveImage`

O `ResponsiveImage` tem outros três consumidores que não passam pelo upload:
`entities/(pages)/(home)/EntitiesListClient.tsx:65`, `admin/(pages)/users/(pages)/(home)/UsersListClient.tsx`
e `playground/page.tsx`. Pôr `shrink-0` no componente mudaria o comportamento de tabela e playground, fora
desta tarefa. A regra "corrigir na raiz" (`.claude/cycle-policy.md` §3) se cumpre no `ImageUploadInput`:
ele é o dono da linha flex e é o único lugar com o defeito. Corrigido ali, os dois call sites herdam a
correção sem workaround local.

Se a mesma elipse aparecer nas listas, o defeito é do `ResponsiveImage` e vira item de backlog, não desta
rodada.

## 4. Call sites

| Onde | Como chega ao componente | Afetado |
|------|--------------------------|---------|
| `/account`, aba perfil, painel comum | `AccountProfileForm.tsx:116` → `HookFormImageUpload` → `ImageUploadInput` | sim |
| `/admin/account` | `AdminAccountClient.tsx:5` importa o mesmo `AccountTabs` → `AccountProfileForm` | sim (mesmo código) |
| Entidade, criar e editar (`photo`) | `EntityFormFields.tsx:123` → `HookFormImageUpload` | sim |
| Playground | usa `ResponsiveImage` direto, sem `ImageUploadInput` | não |
| `HookFormImageUpload` | `packages/design-system/components/form/hookform/hookformImageUpload.tsx:54`, só repassa props | não muda |

Os dois formulários só renderizam o upload com storage ligado (`isStorageEnabled()`,
`apps/app/shared/lib/storageEnabled.ts`: bucket ou host do emulador). Sem isso aparece o campo de URL, sem
prévia. A prévia só existe com `value` preenchido (`image-upload-input.tsx:82`).

Nenhum call site passa `className` que dependa do encolhimento da prévia; a mudança não afeta outros
layouts.

## 5. Testes

O jsdom não calcula layout, então nenhum teste Vitest prova a proporção. Um teste de classe prova só que
`shrink-0` está no contêiner da prévia.

Decisão D2: escrever esse teste mesmo assim, porque custa uma dúzia de linhas e impede que alguém remova a
classe sem perceber. Ele não substitui a medição no browser.

- Nível: componente, em `packages/design-system/__tests__/imageUploadInput.test.tsx` (arquivo existente).
- Caso: renderizar com `value` e `previewSrc` preenchidos, achar a imagem por `alt` e conferir que o `div`
  pai (o contêiner do `ResponsiveImage`) tem a classe `shrink-0`. O `apps/app/__tests__/imageUploadInput.test.tsx:118-121`
  já renderiza a prévia com `next/image` no jsdom sem mock, então o mesmo setup serve.
- Sem a correção, o teste reprova.

Nenhum teste com emulador: a infra não é o objeto.

A prova real é o browser no `/test`: largura igual à altura do contêiner da prévia a 390 px.

## 6. O que o `/test` vai percorrer

Superfície de UI, uma passada com `agent-browser`. Pré-condição: storage do emulador ligado e uma imagem já
enviada em cada formulário, para a prévia existir.

| Fluxo | Viewport | Tema | Idioma |
|-------|----------|------|--------|
| `/account`, perfil com avatar | 390 | light e dark | pt-br, en, es |
| `/account`, perfil com avatar | 1280 | light e dark | pt-br |
| Entidade, editar com foto | 390 | light e dark | pt-br, en, es |
| Entidade, editar com foto | 1280 | light e dark | pt-br |

Os 3 idiomas entram no mobile porque o comprimento dos rótulos e do hint muda o quanto a coluna vizinha
empurra a prévia. Em cada célula, medir com `getBoundingClientRect()` o `div` pai da imagem da prévia
(dentro de `[data-slot="image-upload-input"]`) e registrar largura e altura (esperado 64 x 64), e confirmar
`document.documentElement.scrollWidth <= innerWidth` (sem rolagem horizontal). O `/admin/account` usa o
mesmo componente; basta uma célula (390, pt-br, light) para registrar que não diverge.

Estado de upload em andamento e de erro de arquivo não mudam com esta correção e ficam fora da passada.

## 7. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Prévia redonda no mobile**
  A 390 px, com imagem já enviada, o contêiner da prévia do upload mede 64 x 64 px no perfil da conta e no
  formulário de entidade. A medição vale nos 3 idiomas (pt-br, en, es), porque "Remover imagem", "Remove
  image" e "Quitar imagen" e os hints têm larguras diferentes. Largura menor que a altura reprova.

- [ ] **Sem rolagem horizontal**
  Com a prévia fixa em 64 px, a coluna de botões e hint absorve o aperto: os botões quebram para a linha de
  baixo e o hint quebra em várias linhas. A página não ganha rolagem horizontal a 390 px em nenhum dos 3
  idiomas, light ou dark.

- [ ] **Desktop sem mudança**
  A 1280 px, a prévia continua 64 x 64 ao lado dos botões, na mesma posição de antes da correção. Vale para
  perfil e entidade, light e dark.

- [ ] **Sem prévia, sem efeito**
  Sem imagem salva (`value` vazio), a prévia não é renderizada e o campo mostra só "Escolher imagem" e o
  hint, como antes. Com storage desligado, o campo de URL continua aparecendo sem prévia.

- [ ] **Outros usos do `ResponsiveImage` intactos**
  As miniaturas das listas de entidades e de usuários e o playground não recebem a classe nova, porque a
  correção fica na chamada dentro do `ImageUploadInput`. O diff toca só `image-upload-input.tsx` e o teste.

- [ ] **Regressão travada no Vitest**
  O teste de componente do design system reprova se `shrink-0` sair do contêiner da prévia. Ele prova só a
  presença da classe; a proporção é provada pela medição no browser.

## 8. Blueprint e ordem

Arquivos:

```
packages/design-system/components/ui/image-upload-input.tsx    (+1 linha: className="shrink-0")
packages/design-system/__tests__/imageUploadInput.test.tsx      (+1 caso)
```

Commit único: `fix(design-system): keep image upload preview from shrinking on narrow screens`, com o teste
junto. Env nova, i18n, SDK e API: nenhum.

## Perguntas em aberto

1. Corrigir também dentro do `ResponsiveImage` (afeta listas e playground)? Default: não. Só no
   `ImageUploadInput`; elipse nas listas, se aparecer, vira backlog.
2. Manter o teste de classe, sabendo que ele não mede layout? Default: sim, como trava de regressão barata.
