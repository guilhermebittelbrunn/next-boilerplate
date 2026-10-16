"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import type { PlanDTO } from "@repo/sdk/src/types";
import { describePlanPrice } from "@repo/shared/utils/helpers/formatPlanPrice";
import { CheckIcon } from "lucide-react";

type BillingPlanCardProps = {
    plan: PlanDTO;
    highlighted?: boolean;
    disabled: boolean;
    loading: boolean;
    onSubscribe: (priceId: string) => void;
};

export function BillingPlanCard({
    plan,
    highlighted = false,
    disabled,
    loading,
    onSubscribe,
}: BillingPlanCardProps) {
    const { dictionary, locale } = getDictionary();
    const billingCopy = dictionary.apps.app.pages.common.account.billing;
    const priceLabel = describePlanPrice(billingCopy, plan, locale);

    return (
        <Card
            className={cn(
                "h-full",
                highlighted && "border-primary ring-2 ring-primary"
            )}
        >
            <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                {highlighted ? (
                    <CardAction>
                        <Badge>{billingCopy.chosenPlan}</Badge>
                    </CardAction>
                ) : null}
                {plan.description ? (
                    <CardDescription>{plan.description}</CardDescription>
                ) : null}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
                {priceLabel ? (
                    <p className="font-semibold text-lg">{priceLabel}</p>
                ) : null}
                {plan.features.length > 0 ? (
                    <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
                        {plan.features.map((feature) => (
                            <li
                                className="flex items-start gap-2"
                                key={feature}
                            >
                                <CheckIcon
                                    aria-hidden
                                    className="mt-0.5 size-4 shrink-0 text-primary"
                                />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full"
                    disabled={disabled}
                    loading={loading}
                    onClick={() => onSubscribe(plan.priceId)}
                    type="button"
                >
                    {billingCopy.subscribe}
                </Button>
            </CardFooter>
        </Card>
    );
}
