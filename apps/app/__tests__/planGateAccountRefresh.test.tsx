import { globalTranslations } from "@repo/internationalization/translations/global";
import type { AccountDTO, PlanAccessDTO } from "@repo/sdk/src/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/shared/lib/queryKeys";

const { meMock, sdkAuthorizedState } = vi.hoisted(() => ({
    meMock: vi.fn(),
    sdkAuthorizedState: { value: true },
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { account: { me: () => meMock() } },
}));

vi.mock("@/shared/stores/panelStore", () => ({
    usePanelState: (selector: (state: { sdkAuthorized: boolean }) => unknown) =>
        selector({ sdkAuthorized: sdkAuthorizedState.value }),
}));

const { PlanGate } = await import("@/shared/components/ui/PlanGate");

const planGateCopy = globalTranslations["pt-br"].apps.app.shared.planGate;
const FEATURE = "advanced-reports";
const APP_STALE_TIME_MS = 60_000;

function account(planAccess: PlanAccessDTO): AccountDTO {
    return { planAccess } as unknown as AccountDTO;
}

function renderGate(client: QueryClient) {
    return render(
        <QueryClientProvider client={client}>
            <PlanGate
                loadingFallback={<p>carregando</p>}
                requirement={{ feature: FEATURE }}
            >
                <p>conteúdo protegido</p>
            </PlanGate>
        </QueryClientProvider>
    );
}

function queryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: APP_STALE_TIME_MS,
                retry: false,
                refetchOnWindowFocus: false,
            },
        },
    });
}

beforeEach(() => {
    meMock.mockReset();
    sdkAuthorizedState.value = true;
});

afterEach(cleanup);

describe("PlanGate with the real account query", () => {
    it("rereads a cached account on mount, so features granted after it was cached unlock the content", async () => {
        const client = queryClient();
        client.setQueryData(
            queryKeys.account.me(),
            account({ enforced: true, subscribed: true, features: [] })
        );
        meMock.mockResolvedValue(
            account({ enforced: true, subscribed: true, features: [FEATURE] })
        );

        renderGate(client);

        expect(
            screen.getByText(planGateCopy.featureRequired.title)
        ).toBeTruthy();
        await waitFor(() =>
            expect(screen.getByText("conteúdo protegido")).toBeTruthy()
        );
        expect(meMock).toHaveBeenCalledTimes(1);
    });

    it("keeps the content out while the query waits for the token", () => {
        sdkAuthorizedState.value = false;

        renderGate(queryClient());

        expect(screen.getByText("carregando")).toBeTruthy();
        expect(screen.queryByText("conteúdo protegido")).toBeNull();
        expect(meMock).not.toHaveBeenCalled();
    });
});
