import { isSubscriptionMode } from "@repo/next-config/product-mode";
import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { isImpersonating } from "@/lib/server/panelSnapshot";
import { queryKeys } from "@/shared/lib/queryKeys";
import { AdminHomeClient } from "./(components)/AdminHomeClient";

export default async function AdminHome() {
    const queryClient = new QueryClient();

    if (!(await isImpersonating())) {
        const client = await getServerApiClient("admin");
        if (client) {
            await Promise.all([
                queryClient.prefetchQuery({
                    queryKey: queryKeys.users.summary(),
                    queryFn: () => client.user.summary(),
                }),
                queryClient.prefetchQuery({
                    queryKey: queryKeys.users.activitySummary(),
                    queryFn: () => client.user.activitySummary(),
                }),
                ...(isSubscriptionMode()
                    ? [
                          queryClient.prefetchQuery({
                              queryKey: queryKeys.payments.summary(),
                              queryFn: () => client.payments.summary(),
                          }),
                      ]
                    : []),
            ]);
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <AdminHomeClient />
        </HydrationBoundary>
    );
}
