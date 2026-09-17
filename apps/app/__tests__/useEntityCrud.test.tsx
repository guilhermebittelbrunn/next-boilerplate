import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEntityCrud } from "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(hooks)/useEntityCrud";
import { queryKeys } from "@/shared/lib/queryKeys";

const { updateMock, deleteMock } = vi.hoisted(() => ({
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        entity: {
            update: (...args: unknown[]) => updateMock(...args),
            delete: (...args: unknown[]) => deleteMock(...args),
        },
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
type ListPages = { pages: { items: Row[]; nextCursor: string | null }[] };
type Summary = {
    total: number;
    enabled: number;
    byType: Record<string, number>;
};

const SUMMARY: Summary = {
    total: 2,
    enabled: 2,
    byType: { franchise: 1, customer: 1, collaborator: 0 },
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

function rowInCache(id: string) {
    return queryClient
        .getQueryData<ListPages>(queryKeys.entities.list())
        ?.pages.flatMap((page) => page.items)
        .find((row) => row.id === id);
}

beforeEach(() => {
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    // Two pages, because the optimistic write has to reach rows the user paged into —
    // a cache walker that only looks at the first page fails silently here.
    queryClient.setQueryData(queryKeys.entities.list(), {
        pages: [
            { items: [{ id: "1", enabled: true }], nextCursor: "cursor-1" },
            { items: [{ id: "2", enabled: true }], nextCursor: null },
        ],
        pageParams: [null, "cursor-1"],
    });
    queryClient.setQueryData(queryKeys.entities.summary(), SUMMARY);
    updateMock.mockReset();
    deleteMock.mockReset();
});

function summaryInCache() {
    return queryClient.getQueryData<Summary>(queryKeys.entities.summary());
}

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
        expect(rowInCache("1")?.enabled).toBe(false);
        expect(rowInCache("2")?.enabled).toBe(true);
    });

    it("reaches a row that came from a later page", async () => {
        updateMock.mockResolvedValue({ id: "2" });
        const { result } = renderHook(() => useEntityCrud(), { wrapper });

        result.current.toggleEntityStatusMutation.mutate({
            id: "2",
            enabled: false,
        });

        await waitFor(() =>
            expect(result.current.toggleEntityStatusMutation.isSuccess).toBe(
                true
            )
        );
        expect(rowInCache("2")?.enabled).toBe(false);
        expect(rowInCache("1")?.enabled).toBe(true);
    });

    it("keeps the page boundaries intact while writing optimistically", async () => {
        updateMock.mockResolvedValue({ id: "2" });
        const { result } = renderHook(() => useEntityCrud(), { wrapper });

        result.current.toggleEntityStatusMutation.mutate({
            id: "2",
            enabled: false,
        });

        await waitFor(() =>
            expect(result.current.toggleEntityStatusMutation.isSuccess).toBe(
                true
            )
        );
        const cached = queryClient.getQueryData<ListPages>(
            queryKeys.entities.list()
        );
        expect(cached?.pages.map((page) => page.nextCursor)).toEqual([
            "cursor-1",
            null,
        ]);
    });

    it("rolls back the cache on error", async () => {
        updateMock.mockRejectedValue(new Error("boom"));
        const { result } = renderHook(() => useEntityCrud(), { wrapper });

        result.current.toggleEntityStatusMutation.mutate({
            id: "2",
            enabled: false,
        });

        await waitFor(() =>
            expect(result.current.toggleEntityStatusMutation.isError).toBe(true)
        );
        expect(rowInCache("2")?.enabled).toBe(true);
    });
});

describe("useEntityCrud · the summary the home reads", () => {
    it("moves the active count with the toggle, without refetching it", async () => {
        updateMock.mockResolvedValue({ id: "1" });
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
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
        expect(summaryInCache()?.enabled).toBe(1);
        expect(summaryInCache()?.total).toBe(SUMMARY.total);
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("gives the active count back when the toggle fails", async () => {
        updateMock.mockRejectedValue(new Error("boom"));
        const { result } = renderHook(() => useEntityCrud(), { wrapper });

        result.current.toggleEntityStatusMutation.mutate({
            id: "1",
            enabled: false,
        });

        await waitFor(() =>
            expect(result.current.toggleEntityStatusMutation.isError).toBe(true)
        );
        expect(summaryInCache()?.enabled).toBe(SUMMARY.enabled);
    });

    it("invalidates the summary after a delete, so the home stops showing a stale total", async () => {
        deleteMock.mockResolvedValue(undefined);
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useEntityCrud(), { wrapper });

        result.current.deleteEntityMutation.mutate("1");

        await waitFor(() =>
            expect(result.current.deleteEntityMutation.isSuccess).toBe(true)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.entities.summary(),
        });
    });
});
