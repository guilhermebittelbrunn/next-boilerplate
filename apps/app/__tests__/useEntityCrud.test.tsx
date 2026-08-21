import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEntityCrud } from "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(hooks)/useEntityCrud";
import { queryKeys } from "@/shared/lib/queryKeys";

const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn() }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        entity: { update: (...args: unknown[]) => updateMock(...args) },
    },
}));
vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({ successAlert: vi.fn(), errorAlert: vi.fn() }),
}));
vi.mock("@repo/internationalization/client", () => ({
    getDictionary: () => ({
        locale: "pt-br",
        dictionary: {
            apps: {
                app: {
                    pages: {
                        common: {
                            entities: {
                                messages: {
                                    created: "c",
                                    updated: "u",
                                    deleted: "d",
                                },
                            },
                        },
                    },
                },
            },
        },
    }),
}));
vi.mock("@repo/shared/utils/helpers/formattedError", () => ({
    default: class FormattedError {
        error: unknown;
        constructor(error: unknown) {
            this.error = error;
        }
    },
}));
vi.mock("@repo/shared/utils/helpers/handleClientError", () => ({
    handleClientError: () => "error",
}));

type Row = { id: string; enabled: boolean };

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

function listData() {
    return queryClient.getQueryData<Row[]>(queryKeys.entities.list());
}

beforeEach(() => {
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    queryClient.setQueryData(queryKeys.entities.list(), [
        { id: "1", enabled: true },
        { id: "2", enabled: true },
    ]);
    updateMock.mockReset();
});

describe("useEntityCrud · toggleEntityStatusMutation", () => {
    it("optimistically updates the cache and keeps it on success", async () => {
        updateMock.mockResolvedValue({ id: "1" });
        const { result } = renderHook(() => useEntityCrud(), { wrapper });

        result.current.toggleEntityStatusMutation.mutate({
            id: "1",
            enabled: false,
        });

        await waitFor(() =>
            expect(result.current.toggleEntityStatusMutation.isSuccess).toBe(
                true
            )
        );
        expect(listData()?.find((r) => r.id === "1")?.enabled).toBe(false);
        expect(listData()?.find((r) => r.id === "2")?.enabled).toBe(true);
    });

    it("rolls back the cache on error", async () => {
        updateMock.mockRejectedValue(new Error("boom"));
        const { result } = renderHook(() => useEntityCrud(), { wrapper });

        result.current.toggleEntityStatusMutation.mutate({
            id: "1",
            enabled: false,
        });

        await waitFor(() =>
            expect(result.current.toggleEntityStatusMutation.isError).toBe(true)
        );
        expect(listData()?.find((r) => r.id === "1")?.enabled).toBe(true);
    });
});
