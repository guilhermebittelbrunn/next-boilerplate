import { buttonVariants } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import type { PlanDTO } from "@repo/sdk/src/types";
import {
    describePlanPrice,
    type PlanPriceCopy,
} from "@repo/shared/utils/helpers/formatPlanPrice";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

type PlanCardProps = {
    plan: PlanDTO;
    locale: string;
    priceCopy: PlanPriceCopy;
    ctaHref: string;
    ctaLabel: string;
};

export function PlanCard({
    plan,
    locale,
    priceCopy,
    ctaHref,
    ctaLabel,
}: PlanCardProps) {
    const priceLabel = describePlanPrice(priceCopy, plan, locale);

    return (
        <Card className="h-full">
            <CardHeader className="gap-2">
                <CardTitle>
                    <h2 className="font-semibold text-lg tracking-tight">
                        {plan.name}
                    </h2>
                </CardTitle>
                {plan.description ? (
                    <CardDescription>{plan.description}</CardDescription>
                ) : null}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
                {priceLabel ? (
                    <p className="font-semibold text-3xl tabular-nums tracking-tight">
                        {priceLabel}
                    </p>
                ) : null}
                {plan.features.length > 0 ? (
                    <ul className="flex flex-col gap-2.5 text-sm">
                        {plan.features.map((feature) => (
                            <li
                                className="flex items-start gap-2"
                                key={feature}
                            >
                                <Check
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
                <Link
                    className={cn(
                        buttonVariants({ size: "lg", variant: "outline" }),
                        "w-full"
                    )}
                    href={ctaHref}
                >
                    {ctaLabel}
                    <ArrowRight aria-hidden />
                </Link>
            </CardFooter>
        </Card>
    );
}
