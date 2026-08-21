import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/shared/lib/queryKeys";

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { user: { list: (...args: unknown[]) => listMock(...args) } },
}));

const { useListUsers } = await import("@/shared/hooks/useListUsers");
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);

const allUsers = [
    { id: "1", type: UserType.ADMIN },
    { id: "2", type: UserType.COMMON },
    { id: "3", type: UserType.COMMON },
];

const commonUsers = allUsers.filter((user) => user.type === UserType.COMMON);

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
    // An admin in the admin panel is the context in which the unscoped listing is
    // legitimate, and the SDK already carries the token.
    panelStore = createPanelStore({
        profileKind: "admin",
        panelRequestRole: UserRoleLevel.ADMIN,
        impersonatedFirebaseUid: null,
    });
    panelStore.getState().setSdkAuthorized(true);
});

describe("useListUsers", () => {
    it("asks the API for every user when no type is passed", async () => {
        listMock.mockResolvedValue(allUsers);
        const { result } = renderHook(() => useListUsers(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(listMock).toHaveBeenCalledWith(undefined);
        expect(result.current.data).toEqual(allUsers);
    });

    it("forwards the type filter to the API instead of filtering in memory", async () => {
        listMock.mockResolvedValue(commonUsers);
        const { result } = renderHook(
            () => useListUsers({ type: UserType.COMMON }),
            { wrapper }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(listMock).toHaveBeenCalledWith({ type: UserType.COMMON });
        expect(result.current.data).toEqual(commonUsers);
    });

    it("caches each scope under its own key", async () => {
        listMock.mockImplementation((params?: { type?: UserType }) =>
            Promise.resolve(params?.type ? commonUsers : allUsers)
        );

        const unscoped = renderHook(() => useListUsers(), { wrapper });
        const scoped = renderHook(
            () => useListUsers({ type: UserType.COMMON }),
            {
                wrapper,
            }
        );

        await waitFor(() =>
            expect(unscoped.result.current.isSuccess).toBe(true)
        );
        await waitFor(() => expect(scoped.result.current.isSuccess).toBe(true));

        expect(queryClient.getQueryData(queryKeys.users.list())).toEqual(
            allUsers
        );
        expect(
            queryClient.getQueryData(queryKeys.users.list(UserType.COMMON))
        ).toEqual(commonUsers);
        expect(listMock).toHaveBeenCalledTimes(2);
    });

    it("does not call the API while disabled", () => {
        listMock.mockResolvedValue(allUsers);
        const { result } = renderHook(
            () => useListUsers({ enabled: false, type: UserType.COMMON }),
            { wrapper }
        );

        expect(listMock).not.toHaveBeenCalled();
        expect(result.current.isPending).toBe(true);
    });

    /**
     * A request that leaves before the bearer token is applied comes back 401, and React
     * Query caches that failure — which left the impersonation picker permanently empty
     * and therefore permanently disabled.
     */
    it("waits for the SDK to carry the token before querying", async () => {
        listMock.mockResolvedValue(allUsers);
        panelStore = createPanelStore({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });

        const { result, rerender } = renderHook(() => useListUsers(), {
            wrapper,
        });
        expect(listMock).not.toHaveBeenCalled();

        act(() => panelStore.getState().setSdkAuthorized(true));
        rerender();

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(listMock).toHaveBeenCalledTimes(1);
    });

    it("narrows to common users while impersonating, whatever was asked for", async () => {
        listMock.mockResolvedValue(commonUsers);
        panelStore = createPanelStore({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "target-1",
        });
        panelStore.getState().setSdkAuthorized(true);

        const { result } = renderHook(() => useListUsers(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(listMock).toHaveBeenCalledWith({ type: UserType.COMMON });
        expect(
            queryClient.getQueryData(queryKeys.users.list(UserType.COMMON))
        ).toEqual(commonUsers);
    });
});
