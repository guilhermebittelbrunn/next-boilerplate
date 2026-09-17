import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import type { ReactNode } from "react";

export type MetricCardProps = {
    label: string;
    value: number;
    hint?: string;
    loading?: boolean;
    icon?: ReactNode;
};

export function MetricCard({
    label,
    value,
    hint,
    loading,
    icon,
}: MetricCardProps) {
    return (
        <Card className="gap-3 py-5">
            <CardHeader className="px-5">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                    {label}
                </CardTitle>
                {icon && (
                    <CardAction className="text-muted-foreground">
                        {icon}
                    </CardAction>
                )}
            </CardHeader>
            <CardContent className="px-5">
                {loading ? (
                    <Skeleton className="h-9 w-20" />
                ) : (
                    // Printed raw: `toLocaleString()` resolves a different separator on
                    // the Node default locale than in the visitor's browser, and the
                    // number would change between the server HTML and hydration.
                    <span className="font-semibold text-3xl tabular-nums">
                        {value}
                    </span>
                )}
                {hint && (
                    <p className="mt-1 text-muted-foreground text-xs">{hint}</p>
                )}
            </CardContent>
        </Card>
    );
}
