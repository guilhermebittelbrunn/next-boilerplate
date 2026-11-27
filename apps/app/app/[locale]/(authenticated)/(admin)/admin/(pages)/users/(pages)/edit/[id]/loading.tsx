import { FormSkeleton } from "@/shared/components/ui/FormSkeleton";
import { FormSurface } from "@/shared/components/ui/FormSurface";
import { PageSkeleton } from "@/shared/components/ui/PageSkeleton";

export default function Loading() {
    return (
        <PageSkeleton width="narrow">
            <FormSurface>
                <FormSkeleton />
            </FormSurface>
        </PageSkeleton>
    );
}
