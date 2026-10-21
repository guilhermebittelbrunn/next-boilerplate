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
/** Same as the app-wide `staleTime` in `QueryProvider`. */
const LIST_STALE_MS = 60_000;
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

function seedList() {
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
}

function seedCache() {
    seedList();
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

function countState() {
    return queryClient.getQueryState(queryKeys.notifications.unreadCount());
}

function listIsInvalidated() {
    return queryClient.getQueryState(queryKeys.notifications.list())
        ?.isInvalidated;
}

function refetchCount() {
    return act(() =>
        queryClient.refetchQueries({
            queryKey: queryKeys.notifications.unreadCount(),
        })
    );
}

/** Count answered 2 once, then the next read failed: error status with the old data kept. */
async function renderCountThatFailedAfterSuccess() {
    const rendered = renderHook(() => useUnreadNotificationsCount(), {
        wrapper,
    });
    await waitFor(() => expect(rendered.result.current.count).toBe(2));
    unreadCountMock.mockRejectedValue(new Error("unavailable"));
    await refetchCount();
    await waitFor(() => expect(countState()?.status).toBe("error"));
    return rendered;
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

    it("carregar mais com a lista velha mantém a marca para a próxima abertura", async () => {
        listMock.mockResolvedValueOnce({
            items: [{ id: "n1", readAt: null }],
            nextCursor: "c1",
        });
        const { result } = renderHook(
            () => useListNotifications({ enabled: true }),
            { wrapper }
        );
        await waitFor(() => expect(result.current.hasNextPage).toBe(true));

        queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.list(),
            refetchType: "none",
        });
        listMock.mockResolvedValueOnce({
            items: [{ id: "n2", readAt: null }],
            nextCursor: null,
        });
        await act(() => result.current.fetchNextPage());

        expect(listMock).toHaveBeenLastCalledWith({
            limit: NOTIFICATIONS_PAGE_SIZE,
            cursor: "c1",
        });
        await waitFor(() =>
            expect(result.current.data.map((row) => row.id)).toEqual([
                "n1",
                "n2",
            ])
        );
        expect(listIsInvalidated()).toBe(true);
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

    it("esconde o número quando uma releitura falha depois de um sucesso", async () => {
        const { result } = await renderCountThatFailedAfterSuccess();

        expect(countState()?.data).toEqual({ count: 2 });
        expect(result.current.count).toBe(0);
        expect(result.current.error).toBeTruthy();
        expect(errorAlertMock).not.toHaveBeenCalled();
    });

    it("volta a mostrar o número quando a contagem se recupera", async () => {
        const { result } = await renderCountThatFailedAfterSuccess();

        unreadCountMock.mockResolvedValue({ count: FRESH_COUNT });
        await refetchCount();

        await waitFor(() => expect(result.current.count).toBe(FRESH_COUNT));
        expect(result.current.error).toBeNull();
    });

    it("marca a lista como velha quando o servidor muda a contagem", async () => {
        seedList();
        const { result } = renderHook(() => useUnreadNotificationsCount(), {
            wrapper,
        });
        await waitFor(() => expect(result.current.count).toBe(2));
        expect(listIsInvalidated()).toBe(false);

        unreadCountMock.mockResolvedValue({ count: FRESH_COUNT });
        await refetchCount();

        await waitFor(() => expect(result.current.count).toBe(FRESH_COUNT));
        expect(listIsInvalidated()).toBe(true);
        expect(listMock).not.toHaveBeenCalled();
    });

    it("não mexe na lista quando o servidor confirma o número do cache", async () => {
        seedList();
        const { result } = renderHook(() => useUnreadNotificationsCount(), {
            wrapper,
        });
        await waitFor(() => expect(result.current.count).toBe(2));

        act(() => {
            queryClient.setQueryData(queryKeys.notifications.unreadCount(), {
                count: 1,
            });
        });
        unreadCountMock.mockResolvedValue({ count: 1 });
        await refetchCount();

        await waitFor(() => expect(unreadCountMock).toHaveBeenCalledTimes(2));
        expect(result.current.count).toBe(1);
        expect(listIsInvalidated()).toBe(false);
    });

    it("reabrir sem contagem nova não relê; com contagem nova relê uma vez", async () => {
        queryClient.setQueryDefaults(queryKeys.notifications.list(), {
            staleTime: LIST_STALE_MS,
        });
        seedList();
        const count = renderHook(() => useUnreadNotificationsCount(), {
            wrapper,
        });
        await waitFor(() => expect(count.result.current.count).toBe(2));

        const firstOpening = renderHook(
            () => useListNotifications({ enabled: true }),
            { wrapper }
        );
        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
        expect(listMock).not.toHaveBeenCalled();
        firstOpening.unmount();

        unreadCountMock.mockResolvedValue({ count: FRESH_COUNT });
        await refetchCount();
        await waitFor(() =>
            expect(count.result.current.count).toBe(FRESH_COUNT)
        );

        const secondOpening = renderHook(
            () => useListNotifications({ enabled: true }),
            { wrapper }
        );
        await waitFor(() =>
            expect(secondOpening.result.current.isLoading).toBe(false)
        );
        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
        expect(listMock).toHaveBeenCalledTimes(1);
        expect(listMock).toHaveBeenCalledWith({
            limit: NOTIFICATIONS_PAGE_SIZE,
            cursor: null,
        });
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

    it("mantém a lista marcada como velha quando a pessoa marca uma como lida", async () => {
        seedCache();
        queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.list(),
            refetchType: "none",
        });
        const { result } = renderHook(() => useNotificationActions(), {
            wrapper,
        });

        markReadMock.mockResolvedValueOnce({ id: "n1", readAt: READ_AT });
        await act(() => result.current.markRead.mutateAsync("n1"));
        expect(rowInCache("n1")?.readAt).toBe(READ_AT);
        expect(listIsInvalidated()).toBe(true);

        markReadMock.mockRejectedValueOnce(new Error("403"));
        act(() => result.current.markRead.mutate("n3"));
        await waitFor(() => expect(result.current.markRead.isError).toBe(true));
        expect(rowInCache("n3")?.readAt).toBeNull();
        expect(listIsInvalidated()).toBe(true);
    });

    it("com a contagem em erro, marcar como lida não traz o número de volta", async () => {
        await renderCountThatFailedAfterSuccess();
        seedList();
        const { result } = renderHook(() => useNotificationActions(), {
            wrapper,
        });

        markReadMock.mockResolvedValueOnce({ id: "n1", readAt: READ_AT });
        await act(() => result.current.markRead.mutateAsync("n1"));
        expect(rowInCache("n1")?.readAt).toBe(READ_AT);
        expect(countState()?.status).toBe("error");

        markReadMock.mockRejectedValueOnce(new Error("403"));
        act(() => result.current.markRead.mutate("n3"));
        await waitFor(() => expect(result.current.markRead.isError).toBe(true));
        expect(rowInCache("n3")?.readAt).toBeNull();
        expect(errorAlertMock).toHaveBeenCalledTimes(1);
        expect(countState()?.status).toBe("error");
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

    it("mantém a lista marcada como velha depois de marcar todas", async () => {
        seedCache();
        queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.list(),
            refetchType: "none",
        });
        markAllReadMock.mockResolvedValue({ updated: 2 });
        const { result } = renderHook(() => useNotificationActions(), {
            wrapper,
        });

        await act(() => result.current.markAllRead.mutateAsync());

        expect(rowInCache("n1")?.readAt).not.toBeNull();
        expect(listIsInvalidated()).toBe(true);
    });

    it("com a contagem em erro, marcar todas não grava zero por cima do erro", async () => {
        await renderCountThatFailedAfterSuccess();
        seedList();
        markAllReadMock.mockResolvedValue({ updated: 2 });
        const { result } = renderHook(() => useNotificationActions(), {
            wrapper,
        });

        await act(() => result.current.markAllRead.mutateAsync());

        expect(rowInCache("n1")?.readAt).not.toBeNull();
        expect(countState()?.status).toBe("error");
    });
});
