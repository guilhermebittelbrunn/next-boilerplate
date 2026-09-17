import { UserRoleLevel } from "@repo/auth/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { summaryMock } = vi.hoisted(() => ({ summaryMock: vi.fn() }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { entity: { summary: () => summaryMock() } },
}));

const { useEntitySummary } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/(hooks)/useEntitySummary"
);
const { queryKeys } = await import("@/shared/lib/queryKeys");
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);

const SUMMARY = {
    total: 4,
    enabled: 3,
    byType: { franchise: 2, customer: 1, collaborator: 1 },
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
    summaryMock.mockReset();
    summaryMock.mockResolvedValue(SUMMARY);
    panelStore = createPanelStore({
        profileKind: "common",
        panelRequestRole: UserRoleLevel.COMMON,
        impersonatedFirebaseUid: null,
    });
    panelStore.getState().setSdkAuthorized(true);
});

describe("useEntitySummary", () => {
    it("caches the counts under the key the RSC prefetch writes to", async () => {
        const { result } = renderHook(() => useEntitySummary(), { wrapper });

        await waitFor(() => expect(result.current.data).toEqual(SUMMARY));
        expect(queryClient.getQueryData(queryKeys.entities.summary())).toEqual(
            SUMMARY
        );
    });

    it("waits for the SDK to carry the token before querying", async () => {
        panelStore = createPanelStore({
            profileKind: "common",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: null,
        });

        const { result, rerender } = renderHook(() => useEntitySummary(), {
            wrapper,
        });
        expect(summaryMock).not.toHaveBeenCalled();

        act(() => panelStore.getState().setSdkAuthorized(true));
        rerender();

        await waitFor(() => expect(result.current.data).toEqual(SUMMARY));
        expect(summaryMock).toHaveBeenCalledTimes(1);
    });

    it("hands the failure to the caller instead of zeros", async () => {
        summaryMock.mockRejectedValue(new Error("boom"));

        const { result } = renderHook(() => useEntitySummary(), { wrapper });

        await waitFor(() => expect(result.current.error).toBeTruthy());
        expect(result.current.data).toBeUndefined();
    });
});
