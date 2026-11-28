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
                    <ul className="flex flex-col divide-y divide-border">
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
                                    className="flex items-start justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0"
                                    key={activation.subscriptionId}
                                >
                                    <div className="flex min-w-0 flex-col">
                                        <span
                                            className={
                                                subscriber
                                                    ? "font-medium [overflow-wrap:anywhere]"
                                                    : "font-medium text-muted-foreground [overflow-wrap:anywhere]"
                                            }
                                        >
                                            {who}
                                        </span>
                                        <span className="text-muted-foreground text-xs [overflow-wrap:anywhere]">
                                            {plan}
                                        </span>
                                    </div>
                                    <span className="shrink-0 whitespace-nowrap pt-0.5 text-muted-foreground text-xs tabular-nums">
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
