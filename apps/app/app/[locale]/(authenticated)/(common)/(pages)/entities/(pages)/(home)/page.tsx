import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { isImpersonating } from "@/lib/server/panelSnapshot";
import { ENTITIES_PAGE_SIZE } from "@/shared/lib/pagination";
import { queryKeys } from "@/shared/lib/queryKeys";
import { EntitiesListClient } from "./EntitiesListClient";

export default async function EntitiesListPage() {
    const queryClient = new QueryClient();

    // Prefetch on the server so the list paints without a client waterfall.
    // Skipped while impersonating (client refetches with the right headers).
    if (!(await isImpersonating())) {
        const client = await getServerApiClient("common");
        if (client) {
            await queryClient.prefetchInfiniteQuery({
                queryKey: queryKeys.entities.list(),
                queryFn: () =>
                    client.entity.list({ limit: ENTITIES_PAGE_SIZE }),
                initialPageParam: null as string | null,
            });
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <EntitiesListClient />
        </HydrationBoundary>
    );
}
