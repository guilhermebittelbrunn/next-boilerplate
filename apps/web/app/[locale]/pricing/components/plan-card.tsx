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
import { Check, MoveRight } from "lucide-react";
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
            <CardHeader>
                <CardTitle>
                    <h2 className="text-xl">{plan.name}</h2>
                </CardTitle>
                {plan.description ? (
                    <CardDescription>{plan.description}</CardDescription>
                ) : null}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
                {priceLabel ? (
                    <p className="font-semibold text-2xl tracking-tight">
                        {priceLabel}
                    </p>
                ) : null}
                {plan.features.length > 0 ? (
                    <ul className="flex flex-col gap-2 text-muted-foreground text-sm">
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
                    className={cn(buttonVariants(), "w-full gap-2")}
                    href={ctaHref}
                >
                    {ctaLabel}
                    <MoveRight aria-hidden />
                </Link>
            </CardFooter>
        </Card>
    );
}
