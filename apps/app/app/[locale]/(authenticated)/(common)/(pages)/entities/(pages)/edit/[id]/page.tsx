import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { isImpersonating } from "@/lib/server/prefetch";
import { queryKeys } from "@/shared/lib/queryKeys";
import { EditEntityClient } from "./EditEntityClient";

type EditEntityPageProps = {
    params: Promise<{ id: string }>;
};

export default async function EditEntityPage({ params }: EditEntityPageProps) {
    const { id } = await params;
    const queryClient = new QueryClient();

    // Prefetch the detail so the form is populated on first paint (no waterfall).
    if (id && !(await isImpersonating())) {
        const client = await getServerApiClient("common");
        if (client) {
            await queryClient.prefetchQuery({
                queryKey: queryKeys.entities.detail(id),
                queryFn: () => client.entity.findById(id),
            });
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <EditEntityClient />
        </HydrationBoundary>
    );
}
