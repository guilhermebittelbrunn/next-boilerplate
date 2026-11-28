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

// divide-* borders the first cell of every wrapped row, so a grid that wraps draws
// each separator from the cell position instead.
const WRAPPING_LAYOUT =
    "grid-cols-2 [&>:nth-child(2n)]:border-l max-lg:[&>:nth-child(n+3)]:border-t lg:grid-cols-4 lg:[&>:nth-child(4n+3)]:border-l lg:[&>:nth-child(n+5)]:border-t";

const VALUE_TYPE = "text-2xl [overflow-wrap:anywhere] sm:text-3xl";

// With four or more cells a phone, or a desktop beside the sidebar, leaves about 120 px
// per value, and a split number reads as two numbers: keep it on one line, smaller.
const WRAPPING_VALUE_TYPE = "whitespace-nowrap text-xl xl:text-2xl";

export function MetricStrip({
    items,
    locale,
    loading = false,
    className,
}: MetricStripProps) {
    const numberFormat = new Intl.NumberFormat(locale);
    const layout = LAYOUT_BY_COUNT[items.length];

    return (
        <dl
            aria-busy={loading || undefined}
            className={cn(
                "grid divide-border",
                layout ?? WRAPPING_LAYOUT,
                className
            )}
        >
            {items.map((item) => (
                <div
                    className={cn(
                        "flex min-w-0 flex-col gap-1 py-4",
                        layout ? "px-5" : "px-4"
                    )}
                    key={item.key}
                >
                    <dt className="font-medium text-muted-foreground text-sm">
                        {item.label}
                    </dt>
                    <dd
                        className={cn(
                            "flex min-h-9 items-center font-semibold tabular-nums tracking-tight",
                            layout ? VALUE_TYPE : WRAPPING_VALUE_TYPE
                        )}
                    >
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
