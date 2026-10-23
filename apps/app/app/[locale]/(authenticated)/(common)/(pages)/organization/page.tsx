import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { isImpersonating } from "@/lib/server/panelSnapshot";
import { isOrganizationMembersEnabled } from "@/shared/lib/organizationMembersEnabled";
import { queryKeys } from "@/shared/lib/queryKeys";
import { OrganizationClient } from "./OrganizationClient";

export default async function OrganizationPage() {
    if (!isOrganizationMembersEnabled()) {
        notFound();
    }

    const queryClient = new QueryClient();

    // Skipped while impersonating: the client refetches with the impersonation headers.
    if (!(await isImpersonating())) {
        const client = await getServerApiClient("common");
        if (client) {
            await Promise.all([
                queryClient.prefetchQuery({
                    queryKey: queryKeys.organization.detail(),
                    queryFn: () => client.organization.get(),
                }),
                queryClient.prefetchQuery({
                    queryKey: queryKeys.organization.members(),
                    queryFn: () => client.organization.listMembers(),
                }),
            ]);
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <OrganizationClient />
        </HydrationBoundary>
    );
}
