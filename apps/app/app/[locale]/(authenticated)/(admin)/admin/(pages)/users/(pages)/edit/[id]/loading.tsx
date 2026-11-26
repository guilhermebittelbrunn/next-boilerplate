import { FormSkeleton } from "@/shared/components/ui/FormSkeleton";
import { PageSkeleton } from "@/shared/components/ui/PageSkeleton";

export default function Loading() {
    return (
        <PageSkeleton width="narrow">
            <div className="rounded-xl bg-muted/50 p-4">
                <FormSkeleton />
            </div>
        </PageSkeleton>
    );
}
