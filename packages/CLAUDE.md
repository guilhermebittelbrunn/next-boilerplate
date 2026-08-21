# Packages (`packages/*`)

Regras de escopo para os pacotes compartilhados `@repo/*`. O Claude carrega este arquivo automaticamente ao trabalhar em `packages/`. Veja também o [`CLAUDE.md`](../CLAUDE.md) raiz e o [`AGENTS.md`](../AGENTS.md). Princípio mestre: **genérico no pacote, específico no app** — não codifique fluxos/entidades/copy de um único produto aqui, salvo pacotes de integração (`auth`, `email`, `payments`).

## Dependências

- Pacotes **não** devem depender de `apps/*`.
- Evite ciclos: se dois pacotes precisam um do outro, extraia tipos/utilitário mínimo para `@repo/shared` ou inverta a dependência.

## `@repo/sdk`

- Funções por recurso (ex.: `actions/<recurso>/...`) com tipos exportados do mesmo módulo. Registre a action no `Client` (`src/client/index.ts`).
- Sem hooks React com estado pesado aqui, salvo thin wrappers se já for padrão do repo.
- Erros: propagar de forma que o app possa mapear para toast/i18n sem acoplar strings de produto no SDK.

## `@repo/design-system`

- Componentes presentacionais; variantes via props e tokens CSS existentes. **Sem fetch, sem session** — quem compõe dados é o app.

### Inputs compostos (`components/ui/`)

- **Nomes**: `TextareaInput`, `RadioGroupInput`, `DateInput` — **sem** prefixo `Labeled`. `RadioGroupInput` exporta **`RadioOption`** (`value` + `label`) no mesmo módulo.
- **Label**: prop **`label` opcional**; renderizar `Label` só se existir (`htmlFor` + `id` quando aplicável), no mesmo espírito de `input.tsx`.
- **Validação na UI**: prop **`error`** (string), alinhada ao `Input`, **não** `errorMessage`.
- **`DateInput`**: **`Popover`** + **`Calendar`** + trigger (`Button`); valor string **`YYYY-MM-DD`**. Não usar `<input type="date">` nativo como padrão.
- **`Switch`**: prop opcional **`label`** ao lado do toggle (`Label` + `id`/`htmlFor`).

### React Hook Form (`components/form/hookform/`)

- Componentes **`HookForm*`** estendem o UI base com `Omit<…>` sobre props que o controller gere (`value`, `onChange`, `error`, …); repassar **`{...rest}`**.
- **`HookFormSwitch`**: um único **`Switch`** dentro de **`FormControl`**; **`FormLabel`** opcional ao lado; sem aninhar dois `Switch` nem `switchSlot`. **`FormDescription`** / **`FormMessage`** quando necessário.

### Barrel `components/ui/index.ts`

- Qualquer componente ou tipo novo em `components/ui/*.tsx` deve ser **reexportado** em `components/ui/index.ts`.

## `@repo/internationalization`

- Chaves estáveis (`ui.table.empty`); valores em pt-br/en/es como exemplos neutros.
- Exportar apenas o necessário para apps; não importar rotas Next.

## Novos pacotes

- `package.json` com `"private": true` se for interno.
- Estender `@repo/typescript-config` como nos demais pacotes.
- README só se for pacote publicável ou integração complexa; caso contrário, comentários breves no código bastam.
