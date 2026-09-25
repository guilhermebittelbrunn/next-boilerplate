import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import type { BillingActivationDTO } from "@repo/sdk/src/types";
import {
    describePlanInterval,
    formatUtcDate,
    type PlanIntervalCopy,
} from "@/shared/lib/billingInsights";

export type RecentActivationsCopy = {
    title: string;
    description: string;
    empty: string;
    removedUser: string;
};

type RecentActivationsCardProps = {
    activations: BillingActivationDTO[];
    copy: RecentActivationsCopy;
    intervalCopy: PlanIntervalCopy;
    unnamedPlan: string;
    locale: string;
};

export function RecentActivationsCard({
    activations,
    copy,
    intervalCopy,
    unnamedPlan,
    locale,
}: RecentActivationsCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{copy.title}</CardTitle>
                <CardDescription>{copy.description}</CardDescription>
            </CardHeader>
            <CardContent>
                {activations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        {copy.empty}
                    </p>
                ) : (
                    <ul className="flex flex-col divide-y">
                        {activations.map((activation) => {
                            const subscriber = activation.subscriber;
                            const who =
                                subscriber?.displayName ??
                                subscriber?.email ??
                                copy.removedUser;
                            const plan = [
                                activation.planName ?? unnamedPlan,
                                describePlanInterval(
                                    intervalCopy,
                                    activation.interval,
                                    activation.intervalCount
                                ),
                            ]
                                .filter(Boolean)
                                .join(" · ");

                            return (
                                <li
                                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm first:pt-0 last:pb-0"
                                    key={activation.subscriptionId}
                                >
                                    <div className="flex min-w-0 flex-col">
                                        <span
                                            className={
                                                subscriber
                                                    ? "break-words font-medium"
                                                    : "break-words font-medium text-muted-foreground"
                                            }
                                        >
                                            {who}
                                        </span>
                                        <span className="break-words text-muted-foreground text-xs">
                                            {plan}
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                                        {formatUtcDate(
                                            activation.activatedAt,
                                            locale
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
