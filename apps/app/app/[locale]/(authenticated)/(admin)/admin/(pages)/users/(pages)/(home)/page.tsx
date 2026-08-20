import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { isImpersonating } from "@/lib/server/panelSnapshot";
import { queryKeys } from "@/shared/lib/queryKeys";
import { UsersListClient } from "./UsersListClient";

export default async function UsersPage() {
    const queryClient = new QueryClient();

    // Prefetch only carries the Bearer token, so the API would answer as the admin
    // themselves — unscoped. While a common panel is active the listing is narrowed to
    // common users, and hydrating the unscoped cache under that key would flash the
    // wrong rows, so the client fetches it instead.
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
