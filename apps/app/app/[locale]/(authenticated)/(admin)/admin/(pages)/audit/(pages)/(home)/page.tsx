import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { isImpersonating } from "@/lib/server/panelSnapshot";
import { AUDIT_EVENTS_PAGE_SIZE } from "@/shared/lib/pagination";
import { queryKeys } from "@/shared/lib/queryKeys";
import { AuditListClient } from "./AuditListClient";

export default async function AuditTrailPage() {
    const queryClient = new QueryClient();

    // Prefetch on the server so the list paints without a client waterfall.
    // Skipped while impersonating (the admin area redirects out of it anyway).
    if (!(await isImpersonating())) {
        const client = await getServerApiClient("admin");
        if (client) {
            await queryClient.prefetchInfiniteQuery({
                queryKey: queryKeys.auditEvents.list(),
                queryFn: () =>
                    client.audit.list({ limit: AUDIT_EVENTS_PAGE_SIZE }),
                initialPageParam: null as string | null,
            });
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <AuditListClient />
        </HydrationBoundary>
    );
}
