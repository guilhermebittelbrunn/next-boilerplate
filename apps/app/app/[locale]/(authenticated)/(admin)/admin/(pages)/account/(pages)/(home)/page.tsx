import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { panelPageMetadata } from "@/lib/server/panelMetadata";
import { isImpersonating } from "@/lib/server/panelSnapshot";
import { queryKeys } from "@/shared/lib/queryKeys";
import { AdminAccountClient } from "./AdminAccountClient";

export const generateMetadata = panelPageMetadata("/admin/account");

export default async function AdminAccountPage() {
    const queryClient = new QueryClient();

    if (!(await isImpersonating())) {
        const client = await getServerApiClient("admin");
        if (client) {
            await queryClient.prefetchQuery({
                queryKey: queryKeys.account.me(),
                queryFn: () => client.account.me(),
            });
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <AdminAccountClient />
        </HydrationBoundary>
    );
}
