import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest";
import { useCheckoutConfirmation } from "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useCheckoutConfirmation";
import { queryKeys } from "@/shared/lib/queryKeys";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 10;
const WELL_PAST_THE_LIMIT = 15;
const A_FEW_TICKS = 3;

let queryClient: QueryClient;
let invalidate: MockInstance<QueryClient["invalidateQueries"]>;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient();
    invalidate = vi
        .spyOn(queryClient, "invalidateQueries")
        .mockResolvedValue(undefined);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("useCheckoutConfirmation", () => {
    it("relê a conta a cada 3 s enquanto espera", () => {
        renderHook(() => useCheckoutConfirmation(true), { wrapper });

        vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);

        expect(invalidate).toHaveBeenCalledTimes(2);
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: queryKeys.account.me(),
        });
    });

    it("desiste depois de dez tentativas", () => {
        renderHook(() => useCheckoutConfirmation(true), { wrapper });

        vi.advanceTimersByTime(POLL_INTERVAL_MS * WELL_PAST_THE_LIMIT);

        expect(invalidate).toHaveBeenCalledTimes(POLL_MAX_ATTEMPTS);
    });

    it("não relê nada quando não está esperando", () => {
        renderHook(() => useCheckoutConfirmation(false), { wrapper });

        vi.advanceTimersByTime(POLL_INTERVAL_MS * A_FEW_TICKS);

        expect(invalidate).not.toHaveBeenCalled();
    });

    it("para assim que a assinatura aparece", () => {
        const { rerender } = renderHook(
            ({ waiting }) => useCheckoutConfirmation(waiting),
            { wrapper, initialProps: { waiting: true } }
        );

        vi.advanceTimersByTime(POLL_INTERVAL_MS);
        rerender({ waiting: false });
        vi.advanceTimersByTime(POLL_INTERVAL_MS * A_FEW_TICKS);

        expect(invalidate).toHaveBeenCalledTimes(1);
    });
});
