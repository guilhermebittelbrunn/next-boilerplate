import { UserRoleLevel } from "@repo/auth/types";
import { EntityType } from "@repo/sdk/src/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { entity: { list: (...args: unknown[]) => listMock(...args) } },
}));

const { useListEntities } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(hooks)/useListEntities"
);
const { ENTITIES_PAGE_SIZE } = await import("@/shared/lib/pagination");
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);

function entity(id: string) {
    return {
        id,
        userId: "p1",
        name: `Entity ${id}`,
        description: "",
        type: EntityType.CUSTOMER,
        photo: null,
        genre: null,
        birthdate: null,
        enabled: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
    };
}

const TOTAL_ROWS = 4;

const FIRST_PAGE = {
    items: [entity("e4"), entity("e3")],
    nextCursor: "cursor-e3",
};

const SECOND_PAGE = {
    items: [entity("e2"), entity("e1")],
    nextCursor: null,
};

let queryClient: QueryClient;
let panelStore: ReturnType<typeof createPanelStore>;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <PanelStoreContext.Provider value={panelStore}>
                {children}
            </PanelStoreContext.Provider>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    listMock.mockReset();
    listMock.mockImplementation((query: { cursor?: string | null }) =>
        Promise.resolve(query?.cursor ? SECOND_PAGE : FIRST_PAGE)
    );
    panelStore = createPanelStore({
        profileKind: "common",
        panelRequestRole: UserRoleLevel.COMMON,
        impersonatedFirebaseUid: null,
    });
    panelStore.getState().setSdkAuthorized(true);
});

describe("useListEntities", () => {
    it("asks for the first page with no cursor", async () => {
        const { result } = renderHook(() => useListEntities(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(listMock).toHaveBeenCalledWith({
            limit: ENTITIES_PAGE_SIZE,
            cursor: null,
        });
        expect(result.current.data.map((row) => row.id)).toEqual(["e4", "e3"]);
        expect(result.current.hasNextPage).toBe(true);
    });

    it("appends the next page instead of replacing the first", async () => {
        const { result } = renderHook(() => useListEntities(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.fetchNextPage();
        });

        await waitFor(() =>
            expect(result.current.data).toHaveLength(TOTAL_ROWS)
        );
        expect(result.current.data.map((row) => row.id)).toEqual([
            "e4",
            "e3",
            "e2",
            "e1",
        ]);
    });

    it("carries the cursor the previous page handed back", async () => {
        const { result } = renderHook(() => useListEntities(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.fetchNextPage();
        });

        expect(listMock).toHaveBeenLastCalledWith({
            limit: ENTITIES_PAGE_SIZE,
            cursor: "cursor-e3",
        });
    });

    it("stops offering more once the cursor comes back null", async () => {
        const { result } = renderHook(() => useListEntities(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.fetchNextPage();
        });

        await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    });

    it("never repeats an id across the page break", async () => {
        const { result } = renderHook(() => useListEntities(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.fetchNextPage();
        });

        await waitFor(() =>
            expect(result.current.data).toHaveLength(TOTAL_ROWS)
        );
        const ids = result.current.data.map((row) => row.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("waits for the SDK to carry the token before querying", async () => {
        panelStore = createPanelStore({
            profileKind: "common",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: null,
        });

        const { result, rerender } = renderHook(() => useListEntities(), {
            wrapper,
        });
        expect(listMock).not.toHaveBeenCalled();

        act(() => panelStore.getState().setSdkAuthorized(true));
        rerender();

        await waitFor(() => expect(result.current.data).toHaveLength(2));
        expect(listMock).toHaveBeenCalledTimes(1);
    });

    it("hands the failure to the caller instead of an empty list", async () => {
        listMock.mockRejectedValue(new Error("boom"));

        const { result } = renderHook(() => useListEntities(), { wrapper });

        await waitFor(() => expect(result.current.error).toBeTruthy());
        expect(result.current.data).toEqual([]);
    });
});
