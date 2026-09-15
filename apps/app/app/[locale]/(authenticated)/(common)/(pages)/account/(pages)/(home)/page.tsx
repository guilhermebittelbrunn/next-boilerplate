import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { isImpersonating } from "@/lib/server/panelSnapshot";
import { queryKeys } from "@/shared/lib/queryKeys";
import { AccountClient } from "./AccountClient";

export default async function AccountPage() {
    const queryClient = new QueryClient();

    // Prefetch on the server so the page paints without a client waterfall.
    // Skipped while impersonating (client refetches with the right headers).
    if (!(await isImpersonating())) {
        const client = await getServerApiClient("common");
        if (client) {
            await queryClient.prefetchQuery({
                queryKey: queryKeys.account.me(),
                queryFn: () => client.account.me(),
            });
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <AccountClient />
        </HydrationBoundary>
    );
}
