import { UserRoleLevel } from "@repo/auth/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { summaryMock } = vi.hoisted(() => ({ summaryMock: vi.fn() }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { payments: { summary: () => summaryMock() } },
}));

const { useBillingSummary } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(hooks)/useBillingSummary"
);
const { queryKeys } = await import("@/shared/lib/queryKeys");
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);

const SUMMARY = { enabled: false } as const;
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

beforeEach(() => {
    queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    summaryMock.mockReset();
    summaryMock.mockResolvedValue(SUMMARY);
    panelStore = createPanelStore({
        profileKind: "admin",
        panelRequestRole: UserRoleLevel.ADMIN,
        impersonatedFirebaseUid: null,
    });
    panelStore.getState().setSdkAuthorized(true);
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "subscription");
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("useBillingSummary", () => {
    it("guarda o resumo sob a chave que o prefetch do servidor escreve", async () => {
        const { result } = renderHook(() => useBillingSummary(), { wrapper });

        await waitFor(() => expect(result.current.data).toEqual(SUMMARY));
        expect(queryClient.getQueryData(queryKeys.payments.summary())).toEqual(
            SUMMARY
        );
        expect(queryKeys.payments.summary()).toEqual(["payments", "summary"]);
    });

    it("no modo simple não chama a API", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        const { result } = renderHook(() => useBillingSummary(), { wrapper });

        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
        expect(summaryMock).not.toHaveBeenCalled();
        expect(result.current.data).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
    });

    it("espera o SDK carregar o token antes de consultar", () => {
        panelStore = createPanelStore({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });

        renderHook(() => useBillingSummary(), { wrapper });

        expect(summaryMock).not.toHaveBeenCalled();
    });
});
