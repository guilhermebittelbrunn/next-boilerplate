import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { isImpersonating } from "@/lib/server/prefetch";
import { queryKeys } from "@/shared/lib/queryKeys";
import { UsersListClient } from "./UsersListClient";

export default async function UsersPage() {
    const queryClient = new QueryClient();

    // The users panel is admin-only (never impersonated), so prefetch is safe.
    if (!(await isImpersonating())) {
        const client = await getServerApiClient("admin");
        if (client) {
            await queryClient.prefetchQuery({
                queryKey: queryKeys.users.list(),
                queryFn: () => client.user.list(),
            });
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <UsersListClient />
        </HydrationBoundary>
    );
}
