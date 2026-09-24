import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/shared/lib/queryKeys";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 10;

/**
 * Stripe redirects back before its webhook has reached the API, so the account is read
 * again for a while until the subscription shows up, then left alone.
 */
export function useCheckoutConfirmation(waiting: boolean): void {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!waiting) {
            return;
        }

        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts += 1;
            queryClient.invalidateQueries({ queryKey: queryKeys.account.me() });
            if (attempts >= POLL_MAX_ATTEMPTS) {
                window.clearInterval(timer);
            }
        }, POLL_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [waiting, queryClient]);
}
