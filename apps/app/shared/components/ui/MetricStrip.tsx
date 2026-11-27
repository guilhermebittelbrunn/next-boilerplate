import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { cn } from "@repo/design-system/lib/utils";

export type MetricStripItem = {
    key: string;
    label: string;
    value: number;
    hint?: string;
};

type MetricStripProps = {
    items: MetricStripItem[];
    locale: string;
    loading?: boolean;
    className?: string;
};

const LAYOUT_BY_COUNT: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2 divide-x",
    3: "grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0",
};

export function MetricStrip({
    items,
    locale,
    loading = false,
    className,
}: MetricStripProps) {
    const numberFormat = new Intl.NumberFormat(locale);

    return (
        <dl
            aria-busy={loading || undefined}
            className={cn(
                "grid divide-border",
                LAYOUT_BY_COUNT[items.length] ?? LAYOUT_BY_COUNT[3],
                className
            )}
        >
            {items.map((item) => (
                <div
                    className="flex min-w-0 flex-col gap-1 px-5 py-4"
                    key={item.key}
                >
                    <dt className="font-medium text-muted-foreground text-sm">
                        {item.label}
                    </dt>
                    <dd className="flex min-h-9 items-center font-semibold text-2xl tabular-nums tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
                        {loading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            numberFormat.format(item.value)
                        )}
                    </dd>
                    {item.hint ? (
                        <dd className="text-pretty text-muted-foreground text-xs">
                            {item.hint}
                        </dd>
                    ) : null}
                </div>
            ))}
        </dl>
    );
}
