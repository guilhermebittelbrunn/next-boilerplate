import { UserRoleLevel } from "@repo/auth/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    listMock,
    unreadCountMock,
    markReadMock,
    markAllReadMock,
    errorAlertMock,
    pathnameMock,
} = vi.hoisted(() => ({
    listMock: vi.fn(),
    unreadCountMock: vi.fn(),
    markReadMock: vi.fn(),
    markAllReadMock: vi.fn(),
    errorAlertMock: vi.fn(),
    pathnameMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        notification: {
            list: (...args: unknown[]) => listMock(...args),
            unreadCount: (...args: unknown[]) => unreadCountMock(...args),
            markRead: (...args: unknown[]) => markReadMock(...args),
            markAllRead: (...args: unknown[]) => markAllReadMock(...args),
        },
    },
}));
vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({ successAlert: vi.fn(), errorAlert: errorAlertMock }),
}));
vi.mock("next/navigation", () => ({
    usePathname: () => pathnameMock(),
}));

const { useListNotifications } = await import(
    "@/shared/hooks/useListNotifications"
);
const { useUnreadNotificationsCount } = await import(
    "@/shared/hooks/useUnreadNotificationsCount"
);
const { useNotificationActions } = await import(
    "@/shared/hooks/useNotificationActions"
);
const { queryKeys } = await import("@/shared/lib/queryKeys");
const { NOTIFICATIONS_PAGE_SIZE, NOTIFICATIONS_POLL_INTERVAL_MS } =
    await import("@/shared/lib/pagination");
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);

type Row = { id: string; readAt: string | null };
type ListPages = { pages: { items: Row[]; nextCursor: string | null }[] };

const READ_AT = "2026-10-20T12:00:00.000Z";
const CACHED_COUNT = 5;
const FRESH_COUNT = 7;
/** Long enough for a query that was going to fire to have fired. */
const SETTLE_MS = 20;

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

function seedCache() {
    queryClient.setQueryData(queryKeys.notifications.list(), {
        pages: [
            {
                items: [
                    { id: "n1", readAt: null },
                    { id: "n2", readAt: "2026-10-01T00:00:00.000Z" },
                ],
                nextCursor: "c1",
            },
            { items: [{ id: "n3", readAt: null }], nextCursor: null },
        ],
        pageParams: [null, "c1"],
    });
    queryClient.setQueryData(queryKeys.notifications.unreadCount(), {
        count: CACHED_COUNT,
    });
}

function rowInCache(id: string) {
    return queryClient
        .getQueryData<ListPages>(queryKeys.notifications.list())
        ?.pages.flatMap((page) => page.items)
        .find((row) => row.id === id);
}

function countInCache() {
    return queryClient.getQueryData<{ count: number }>(
        queryKeys.notifications.unreadCount()
    )?.count;
}

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    panelStore = createPanelStore({
        profileKind: "common",
        panelRequestRole: UserRoleLevel.COMMON,
        impersonatedFirebaseUid: null,
    });
    panelStore.getState().setSdkAuthorized(true);
    pathnameMock.mockReturnValue("/pt-br");
    listMock.mockResolvedValue({ items: [], nextCursor: null });
    unreadCountMock.mockResolvedValue({ count: 2 });
});

describe("queryKeys.notifications", () => {
    it("pendura lista e contador sob o mesmo prefixo", () => {
        expect(queryKeys.notifications.list()).toEqual([
            "notifications",
            "list",
        ]);
        expect(queryKeys.notifications.unreadCount()).toEqual([
            "notifications",
            "unreadCount",
        ]);
    });
});

describe("useListNotifications", () => {
    it("não lê a lista enquanto o popover está fechado", async () => {
        renderHook(() => useListNotifications({ enabled: false }), { wrapper });

        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
        expect(listMock).not.toHaveBeenCalled();
    });

    it("lê a primeira página de 10 quando aberto", async () => {
        const { result } = renderHook(
            () => useListNotifications({ enabled: true }),
            { wrapper }
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(listMock).toHaveBeenCalledWith({
            limit: NOTIFICATIONS_PAGE_SIZE,
            cursor: null,
        });
    });
});

describe("useUnreadNotificationsCount", () => {
    it("consulta a contagem com o intervalo e as travas de aba", async () => {
        const { result } = renderHook(() => useUnreadNotificationsCount(), {
            wrapper,
        });

        await waitFor(() => expect(result.current.count).toBe(2));
        const query = queryClient
            .getQueryCache()
            .find({ queryKey: queryKeys.notifications.unreadCount() });
        const options = query?.observers[0]?.options;
        expect(options?.refetchInterval).toBe(NOTIFICATIONS_POLL_INTERVAL_MS);
        expect(options?.refetchIntervalInBackground).toBe(false);
        expect(options?.refetchOnWindowFocus).toBe(true);
    });

    it("refaz a contagem ao navegar quando o número está velho", async () => {
        const { result, rerender } = renderHook(
            () => useUnreadNotificationsCount(),
            { wrapper }
        );
        await waitFor(() => expect(result.current.count).toBe(2));
        expect(unreadCountMock).toHaveBeenCalledTimes(1);

        queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.unreadCount(),
            refetchType: "none",
        });
        unreadCountMock.mockResolvedValue({ count: FRESH_COUNT });
        pathnameMock.mockReturnValue("/pt-br/entities");
        rerender();

        await waitFor(() => expect(result.current.count).toBe(FRESH_COUNT));
        expect(unreadCountMock).toHaveBeenCalledTimes(2);
    });

    it("não refaz ao navegar quando o número é recente", async () => {
        const { result, rerender } = renderHook(
            () => useUnreadNotificationsCount(),
            { wrapper }
        );
        await waitFor(() => expect(result.current.count).toBe(2));

        pathnameMock.mockReturnValue("/pt-br/entities");
        rerender();

        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
        expect(unreadCountMock).toHaveBeenCalledTimes(1);
    });

    it("devolve zero sem avisar quando a contagem falha", async () => {
        unreadCountMock.mockRejectedValue(new Error("unavailable"));

        const { result } = renderHook(() => useUnreadNotificationsCount(), {
            wrapper,
        });

        await waitFor(() => expect(result.current.error).toBeTruthy());
        expect(result.current.count).toBe(0);
        expect(errorAlertMock).not.toHaveBeenCalled();
    });
});

describe("useNotificationActions · markRead", () => {
    it("marca na hora e desconta 1 do contador, sem invalidar nada", async () => {
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        seedCache();
        markReadMock.mockResolvedValue({ id: "n3", readAt: READ_AT });
        const { result } = renderHook(() => useNotificationActions(), {
            wrapper,
        });

        act(() => result.current.markRead.mutate("n3"));

        await waitFor(() =>
            expect(result.current.markRead.isSuccess).toBe(true)
        );
        expect(rowInCache("n3")?.readAt).toBe(READ_AT);
        expect(rowInCache("n1")?.readAt).toBeNull();
        expect(countInCache()).toBe(CACHED_COUNT - 1);
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("não desconta o contador ao marcar uma que já estava lida", async () => {
        seedCache();
        markReadMock.mockResolvedValue({ id: "n2", readAt: READ_AT });
        const { result } = renderHook(() => useNotificationActions(), {
            wrapper,
        });

        act(() => result.current.markRead.mutate("n2"));

        await waitFor(() =>
            expect(result.current.markRead.isSuccess).toBe(true)
        );
        expect(countInCache()).toBe(CACHED_COUNT);
    });

    it("desfaz e avisa quando a API recusa", async () => {
        seedCache();
        markReadMock.mockRejectedValue(new Error("403"));
        const { result } = renderHook(() => useNotificationActions(), {
            wrapper,
        });

        act(() => result.current.markRead.mutate("n1"));

        await waitFor(() => expect(result.current.markRead.isError).toBe(true));
        expect(rowInCache("n1")?.readAt).toBeNull();
        expect(countInCache()).toBe(CACHED_COUNT);
        expect(errorAlertMock).toHaveBeenCalledTimes(1);
    });
});

describe("useNotificationActions · markAllRead", () => {
    it("zera o contador e marca tudo o que está carregado, em todas as páginas", async () => {
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        seedCache();
        markAllReadMock.mockResolvedValue({ updated: CACHED_COUNT });
        const { result } = renderHook(() => useNotificationActions(), {
            wrapper,
        });

        act(() => result.current.markAllRead.mutate());

        await waitFor(() =>
            expect(result.current.markAllRead.isSuccess).toBe(true)
        );
        expect(countInCache()).toBe(0);
        expect(rowInCache("n1")?.readAt).not.toBeNull();
        expect(rowInCache("n3")?.readAt).not.toBeNull();
        expect(rowInCache("n2")?.readAt).toBe("2026-10-01T00:00:00.000Z");
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("volta o estado anterior e avisa quando falha", async () => {
        seedCache();
        markAllReadMock.mockRejectedValue(new Error("503"));
        const { result } = renderHook(() => useNotificationActions(), {
            wrapper,
        });

        act(() => result.current.markAllRead.mutate());

        await waitFor(() =>
            expect(result.current.markAllRead.isError).toBe(true)
        );
        expect(countInCache()).toBe(CACHED_COUNT);
        expect(rowInCache("n1")?.readAt).toBeNull();
        expect(errorAlertMock).toHaveBeenCalledTimes(1);
    });
});
