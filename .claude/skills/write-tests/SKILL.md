---
name: write-tests
description: Escreve testes Vitest neste monorepo (next-forge fork) seguindo o setup do repo — schemas Zod, mappers, handlers de rota da API, hooks de dados (React Query) e componentes RHF, com mocks de SDK/Firebase. Use quando o usuário pedir "escrever testes", "adicionar testes para X", "cobrir com testes", "testar essa rota/hook/componente". Roda com Vitest (jsdom) + @testing-library/react.
---

# Escrever testes (Vitest)

Padrões de teste alinhados ao setup do repo. Cada app/pacote testável tem `vitest.config.mts` (environment `jsdom`, aliases `@` e `@repo`) e script `test: vitest run`. Testes ficam em `__tests__/` ou colocados ao lado (`*.test.ts(x)`). Rode: `pnpm --filter <workspace> test` ou `pnpm test` (todos).

## Ordem de prioridade (maior ROI primeiro)
1. **Funções puras** — mappers (`toDTO`/`toPersistence`), Zod (`parseCreateX`/`parseUpdateX`), utils de `@repo/shared`. Sem mocks, rápidas, alto valor.
2. **Handlers de rota** — lógica de validação/posse/erro, com deps mockadas.
3. **Hooks de dados** — `useListX`/`useFindXById` e mutations, com `apiClient` mockado.
4. **Componentes** — smoke render + interações-chave, com SDK/dictionary mockados.

## 1. Funções puras (sem mock)

```ts
import { describe, expect, it } from "vitest";
import { parseCreateEntity } from "@/(shared)/validation/entity.schema";
import { entityMapper } from "@/(shared)/mappers/entity.mapper";

describe("entity.schema", () => {
  it("rejeita name vazio", () => {
    const r = parseCreateEntity({ name: "", description: "x", type: "PERSON" });
    expect(r.ok).toBe(false);
  });
});

describe("entityMapper.toDTO", () => {
  it("normaliza Timestamp e opcionais", () => {
    const dto = entityMapper.toDTO({ id: "1", userId: "u1", name: "A", description: "", type: "PERSON", enabled: true, createdAt: new Date(0), updatedAt: new Date(0) });
    expect(dto.id).toBe("1");
    expect(typeof dto.createdAt).toBe("string"); // ISO
  });
});
```

## 2. Handler de rota da API

Handlers puros (sem guard) chamam-se direto, como `apps/api/__tests__/health.test.ts`. Para rotas com **guard** ou repositório, mocke as dependências com `vi.mock` **antes** de importar o handler:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/(shared)/repositories/entity.repository", () => ({
  entityRepository: { listByUserId: vi.fn().mockResolvedValue([]) },
}));
// Mocke o guard para injetar um ctx falso e apenas executar o handler:
vi.mock("@/app/(guards)/common-panel", () => ({
  requireCommonPanelApi: (h: any) => (req: any) =>
    h(req, { subjectProfile: { id: "u1" } }),
}));

const { GET } = await import("@/app/(routes)/entities/route");

describe("GET /entities", () => {
  it("retorna { data } do usuário em contexto", async () => {
    const res = await GET(new Request("http://t/entities") as any, {} as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [] });
  });
});
```

> Teste também os 404 de posse (`row.userId !== ctx.subjectProfile.id`) e o 400 de validação.

## 3. Hook de dados (React Query)

Mocke o `apiClient` e envolva com um `QueryClientProvider`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/client", () => ({
  apiClient: { entity: { list: vi.fn().mockResolvedValue([{ id: "1" }]) } },
}));
const { useListEntities } = await import("../useListEntities");

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useListEntities", () => {
  it("carrega a lista via SDK", async () => {
    const { result } = renderHook(() => useListEntities(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
});
```

## 4. Componente (smoke + interação)

Smoke render como `apps/app/__tests__/sign-in.test.tsx`; para componentes que usam dictionary/SDK, mocke-os:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/internationalization/client", () => ({
  getDictionary: () => ({ locale: "en", dictionary: { /* fatia mínima usada */ } }),
}));

describe("EntityFormFields", () => {
  it("renderiza os campos", () => {
    render(/* <EntityFormFields ... /> com control mock do RHF */);
    expect(screen.getByText(/name/i)).toBeDefined();
  });
});
```

## Convenções
- **Não** teste implementação de libs (RHF, React Query) — teste o comportamento do **seu** código (validação, mapeamento, posse, estados de erro/sucesso).
- Mocke nas **bordas**: `@/shared/lib/client` (SDK), `@repo/auth/server`, `firebase/*`. Evite mockar tudo.
- `vi.mock` é içado: para controlar o retorno por teste, use `vi.fn()` no factory e ajuste com `mockResolvedValueOnce` dentro do `it`.
- Importe o módulo sob teste com `await import(...)` **depois** dos `vi.mock` quando o mock precisa valer na carga.
- Nomeie o arquivo `*.test.ts(x)`; rode `pnpm --filter <workspace> test` e garanta verde antes de concluir.

## Onde rodar
`pnpm test` (turbo, todos) · `pnpm --filter app test` · `pnpm --filter api test` · `pnpm --filter @repo/internationalization test` (inclui a paridade i18n).
