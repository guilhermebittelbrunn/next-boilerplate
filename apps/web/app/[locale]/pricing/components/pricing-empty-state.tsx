import { CreditCard } from "lucide-react";

type PricingEmptyStateProps = {
    title: string;
    description: string;
};

export function PricingEmptyState({
    title,
    description,
}: PricingEmptyStateProps) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-border border-dashed p-10 text-center md:col-span-1 xl:col-span-2">
            <CreditCard aria-hidden className="size-8 text-muted-foreground" />
            <h2 className="font-medium">{title}</h2>
            <p className="max-w-sm text-muted-foreground text-sm">
                {description}
            </p>
        </div>
    );
}
