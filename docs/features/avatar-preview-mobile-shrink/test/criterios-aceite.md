# Critérios de Aceite (Checklist)

Status medido na passada do `/test` de 2026-11-26. Os números de cada célula estão em `test/report.md`.

- [x] **Prévia redonda no mobile**
  A 390 px, com imagem já enviada, o contêiner da prévia do upload mede 64 x 64 px no perfil da conta e no
  formulário de edição de entidade, em pt-br, en e es, light e dark. Largura menor que a altura reprova.
  Medido com `getBoundingClientRect()` do pai do `img` dentro de `[data-slot="image-upload-input"]`: 12 de
  12 células deram 64 x 64.

- [x] **O instrumento detecta o defeito antigo**
  Na mesma página, removendo `shrink-0` do contêiner pelo DOM e medindo de novo a 390 px, a largura cai
  abaixo de 64 e a prévia vira elipse. Medido: perfil 56,14 / 59,34 / 58,22 x 64 (pt-br / en / es) e
  entidade 56,5 / 59,72 / 58,59 x 64. Sem esse controle, um 64 x 64 poderia ser só sobra de largura.

- [x] **Sem rolagem horizontal**
  Com a prévia fixa em 64 px, a coluna de botões e hint absorve o aperto. A 390 px, nos 3 idiomas, light e
  dark, `document.documentElement.scrollWidth` é igual a `innerWidth` (390). Uma célula extra a 320 px em
  es também ficou sem rolagem (320 = 320), com a prévia em 64 x 64 e a coluna em 174 px.

- [x] **Desktop sem mudança**
  A 1280 px, a prévia continua 64 x 64 ao lado dos botões, light e dark: no perfil em x = 593,5 e na
  entidade em x = 352,5, os mesmos valores nos dois temas.

- [x] **Área admin igual à comum**
  Em `/admin/account`, 390 px, pt-br, light, a prévia mede 64 x 64 sem rolagem horizontal, com os mesmos
  números do `/account` (linha de 324 px, coluna de 244 px).

- [x] **Sem prévia, sem efeito**
  Na criação de entidade (`/entities/create`), sem `value`, o campo existe (`[data-slot="image-upload-input"]`
  presente) e não tem nenhum `img`. O texto do campo é só "Foto", "Escolher imagem" e o hint "JPG, PNG ou
  WebP, até 4 MB.".

- [ ] **Storage desligado mostra o campo de URL** (🔒 não verificado no browser)
  Com storage desligado, o formulário mostra o campo de URL e não renderiza o `ImageUploadInput`. A passada
  subiu o stack com o storage do emulador ligado, então este caminho não foi percorrido. O diff não toca nele:
  a classe nova fica dentro do ramo `previewUrl ? ... : ...` do componente.

- [x] **Outros usos do `ResponsiveImage` intactos**
  As miniaturas das listas de entidades e de usuários não recebem a classe nova. Em `packages/design-system`
  só mudaram `image-upload-input.tsx` e o teste, e `responsive-image.tsx` não contém `shrink-0`.

- [x] **Regressão travada no Vitest**
  O caso `keeps the preview from shrinking when the row runs out of width` em
  `packages/design-system/__tests__/imageUploadInput.test.tsx` confere a classe `shrink-0` no contêiner.
  Ele prova só a presença da classe; a proporção vem da medição no browser.
