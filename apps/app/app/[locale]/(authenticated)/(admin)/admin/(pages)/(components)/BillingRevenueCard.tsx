import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import type { BillingRevenueDTO } from "@repo/sdk/src/types";
import { formatUtcDate, formatUtcMonth } from "@/shared/lib/billingInsights";
import { formatPlanPrice } from "@/shared/lib/formatPlanPrice";

export type BillingRevenueCopy = {
    title: string;
    criteria: string;
    trackingSince: string;
    multiCurrency: string;
    none: string;
};

type BillingRevenueCardProps = {
    revenue: BillingRevenueDTO;
    copy: BillingRevenueCopy;
    locale: string;
};

export function BillingRevenueCard({
    revenue,
    copy,
    locale,
}: BillingRevenueCardProps) {
    const month = formatUtcMonth(revenue.periodStart, locale) ?? "";
    const trackingSince = revenue.trackingSince
        ? formatUtcDate(revenue.trackingSince, locale)
        : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{copy.title.replace("{month}", month)}</CardTitle>
                <CardDescription>{copy.criteria}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {revenue.byCurrency.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{copy.none}</p>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {revenue.byCurrency.map((row) => (
                            <li
                                className="break-words font-semibold text-2xl tabular-nums tracking-tight"
                                key={row.currency}
                            >
                                {formatPlanPrice(
                                    row.amountPaid,
                                    row.currency,
                                    locale
                                ) ??
                                    `${row.amountPaid} ${row.currency.toUpperCase()}`}
                            </li>
                        ))}
                    </ul>
                )}
                {revenue.byCurrency.length > 1 && (
                    <p className="text-muted-foreground text-xs">
                        {copy.multiCurrency}
                    </p>
                )}
                {trackingSince && (
                    <p className="text-muted-foreground text-xs">
                        {copy.trackingSince.replace("{date}", trackingSince)}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
