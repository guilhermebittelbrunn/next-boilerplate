import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { audit: { list: (...args: unknown[]) => listMock(...args) } },
}));

const { useListAuditEvents } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(hooks)/useListAuditEvents"
);
const { AUDIT_EVENTS_PAGE_SIZE } = await import("@/shared/lib/pagination");
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);

function auditEvent(id: string) {
    return {
        id,
        action: AuditAction.USER_DELETE,
        actorUserId: "p1",
        actorUid: "auth-admin",
        actorLabel: "admin@example.com",
        onBehalfOfUserId: null,
        targetType: AuditTargetType.USER,
        targetUserId: "p2",
        targetLabel: "removed@example.com",
        changedFields: [],
        involvedUserIds: ["p1", "p2"],
        requestId: "req-1",
        windowEndsAt: null,
        createdAt: "2026-09-16T14:00:03.117Z",
        updatedAt: "2026-09-16T14:00:03.117Z",
        deletedAt: null,
    };
}

const TOTAL_ROWS = 4;

const FIRST_PAGE = {
    items: [auditEvent("e4"), auditEvent("e3")],
    nextCursor: "cursor-e3",
};

const SECOND_PAGE = {
    items: [auditEvent("e2"), auditEvent("e1")],
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
        profileKind: "admin",
        panelRequestRole: UserRoleLevel.ADMIN,
        impersonatedFirebaseUid: null,
    });
    panelStore.getState().setSdkAuthorized(true);
});

describe("useListAuditEvents paging", () => {
    it("asks for the first page with no cursor and no filter", async () => {
        const { result } = renderHook(() => useListAuditEvents(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(listMock).toHaveBeenCalledWith({
            limit: AUDIT_EVENTS_PAGE_SIZE,
            cursor: null,
        });
        expect(result.current.data.map((row) => row.id)).toEqual(["e4", "e3"]);
        expect(result.current.hasNextPage).toBe(true);
    });

    it("carries the cursor the previous page handed back", async () => {
        const { result } = renderHook(() => useListAuditEvents(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.fetchNextPage();
        });

        expect(listMock).toHaveBeenLastCalledWith({
            limit: AUDIT_EVENTS_PAGE_SIZE,
            cursor: "cursor-e3",
        });
    });

    it("appends the next page without repeating an id", async () => {
        const { result } = renderHook(() => useListAuditEvents(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.fetchNextPage();
        });

        await waitFor(() =>
            expect(result.current.data).toHaveLength(TOTAL_ROWS)
        );
        const ids = result.current.data.map((row) => row.id);
        expect(ids).toEqual(["e4", "e3", "e2", "e1"]);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("stops offering more once the cursor comes back null", async () => {
        const { result } = renderHook(() => useListAuditEvents(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.fetchNextPage();
        });

        await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    });

    it("waits for the SDK to carry the token before querying", async () => {
        panelStore = createPanelStore({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });

        const { result, rerender } = renderHook(() => useListAuditEvents(), {
            wrapper,
        });
        expect(listMock).not.toHaveBeenCalled();

        act(() => panelStore.getState().setSdkAuthorized(true));
        rerender();

        await waitFor(() => expect(result.current.data).toHaveLength(2));
    });

    it("hands the failure to the caller instead of an empty list", async () => {
        listMock.mockRejectedValue(new Error("boom"));

        const { result } = renderHook(() => useListAuditEvents(), { wrapper });

        await waitFor(() => expect(result.current.error).toBeTruthy());
        expect(result.current.data).toEqual([]);
    });
});

describe("useListAuditEvents filters", () => {
    it("sends the user and the period to the API", async () => {
        const { result } = renderHook(
            () =>
                useListAuditEvents({
                    userId: "p2",
                    from: "2026-09-01",
                    to: "2026-09-16",
                }),
            { wrapper }
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(listMock).toHaveBeenCalledWith({
            limit: AUDIT_EVENTS_PAGE_SIZE,
            cursor: null,
            userId: "p2",
            from: "2026-09-01",
            to: "2026-09-16",
        });
    });

    it("fetches again when the filter changes instead of reusing the cache", async () => {
        const { result, rerender } = renderHook(
            ({ userId }: { userId?: string }) =>
                useListAuditEvents(userId ? { userId } : undefined),
            { wrapper, initialProps: {} as { userId?: string } }
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(listMock).toHaveBeenCalledTimes(1);

        rerender({ userId: "p2" });

        await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    });

    it("paints from the cache, without a loading state, when the filter goes back", async () => {
        const { result, rerender } = renderHook(
            ({ userId }: { userId?: string }) =>
                useListAuditEvents(userId ? { userId } : undefined),
            { wrapper, initialProps: {} as { userId?: string } }
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        rerender({ userId: "p2" });
        await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));

        rerender({});

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data.map((row) => row.id)).toEqual(["e4", "e3"]);
    });

    it("shows a loading state for a filter it has never fetched", async () => {
        const { result, rerender } = renderHook(
            ({ userId }: { userId?: string }) =>
                useListAuditEvents(userId ? { userId } : undefined),
            { wrapper, initialProps: {} as { userId?: string } }
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        rerender({ userId: "p2" });

        expect(result.current.isLoading).toBe(true);
    });
});
