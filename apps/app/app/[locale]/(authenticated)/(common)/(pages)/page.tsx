import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { isImpersonating } from "@/lib/server/panelSnapshot";
import { queryKeys } from "@/shared/lib/queryKeys";
import { CommonHomeClient } from "./(components)/CommonHomeClient";

export default async function CommonHome() {
    const queryClient = new QueryClient();

    // Prefetch on the server so the cards paint without a client waterfall. Skipped
    // while impersonating: the prefetch only carries the Bearer token, so the API would
    // count the admin's own records and flash the wrong numbers.
    if (!(await isImpersonating())) {
        const client = await getServerApiClient("common");
        if (client) {
            await queryClient.prefetchQuery({
                queryKey: queryKeys.entities.summary(),
                queryFn: () => client.entity.summary(),
            });
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <CommonHomeClient />
        </HydrationBoundary>
    );
}
