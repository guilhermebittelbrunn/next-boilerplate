import { UserRoleLevel } from "@repo/auth/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, refreshMock } = vi.hoisted(() => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        changeToAdminContext: vi.fn(),
        changeToCommonContext: vi.fn(),
        setAuthRequestContext: vi.fn(),
        clearAuthRequestContext: vi.fn(),
    },
}));

const { useAuthRequestPanel } = await import(
    "@/shared/providers/AuthRequestPanelContext"
);
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);

const STALE_KEY = ["entities", "list"];

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
    pushMock.mockReset();
    refreshMock.mockReset();
    queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    // Data fetched for the subject that is about to be replaced.
    queryClient.setQueryData(STALE_KEY, [{ id: "entity-of-previous-user" }]);
    panelStore = createPanelStore({
        profileKind: "admin",
        panelRequestRole: UserRoleLevel.COMMON,
        impersonatedFirebaseUid: "target-1",
    });
});

/**
 * Every cached query belongs to the subject active when it was fetched. Switching subject
 * without dropping the cache leaves the previous user's rows on screen until a manual
 * refresh — which is exactly the bug this guards against.
 */
describe("useAuthRequestPanel", () => {
    /**
     * The read-only UI hangs off this flag, so it has to track the store instead of being
     * recombined by each consumer.
     */
    it("exposes impersonation while an admin acts as a common user", () => {
        const { result } = renderHook(() => useAuthRequestPanel(), { wrapper });

        expect(result.current.isImpersonating).toBe(true);
    });

    it("does not report impersonation in the admin panel", () => {
        panelStore = createPanelStore({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });
        const { result } = renderHook(() => useAuthRequestPanel(), { wrapper });

        expect(result.current.isImpersonating).toBe(false);
    });

    it("does not report impersonation for a common user", () => {
        panelStore = createPanelStore({
            profileKind: "common",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: null,
        });
        const { result } = renderHook(() => useAuthRequestPanel(), { wrapper });

        expect(result.current.isImpersonating).toBe(false);
    });

    it("drops cached data when the impersonated user changes", () => {
        const { result } = renderHook(() => useAuthRequestPanel(), { wrapper });

        result.current.setImpersonatedUser("target-2", "Bruno");

        expect(queryClient.getQueryData(STALE_KEY)).toBeUndefined();
        expect(refreshMock).toHaveBeenCalled();
    });

    it("drops cached data when leaving the common panel", () => {
        const { result } = renderHook(() => useAuthRequestPanel(), { wrapper });

        result.current.setPanelEnvironment(UserRoleLevel.ADMIN);

        expect(queryClient.getQueryData(STALE_KEY)).toBeUndefined();
        expect(panelStore.getState().impersonatedFirebaseUid).toBeNull();
        expect(pushMock).toHaveBeenCalledWith("/pt-br/admin");
        // A refresh fired in the same tick cancels the push and the route never changes.
        expect(refreshMock).not.toHaveBeenCalled();
    });

    it("drops cached data when entering the common panel as a user", () => {
        panelStore = createPanelStore({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });
        const { result } = renderHook(() => useAuthRequestPanel(), { wrapper });

        result.current.setPanelEnvironment(UserRoleLevel.COMMON, {
            uid: "target-9",
            label: "Nine",
        });

        expect(queryClient.getQueryData(STALE_KEY)).toBeUndefined();
        expect(panelStore.getState().impersonatedFirebaseUid).toBe("target-9");
        expect(pushMock).toHaveBeenCalledWith("/pt-br");
        expect(refreshMock).not.toHaveBeenCalled();
    });

    it("keeps the cache when the common panel has no user to act as", () => {
        panelStore = createPanelStore({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });
        const { result } = renderHook(() => useAuthRequestPanel(), { wrapper });

        result.current.setPanelEnvironment(UserRoleLevel.COMMON);

        expect(queryClient.getQueryData(STALE_KEY)).toBeDefined();
        expect(pushMock).not.toHaveBeenCalled();
    });
});
