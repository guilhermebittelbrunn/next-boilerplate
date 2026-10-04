"use client";

import { buttonVariants } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { getDictionary } from "@repo/internationalization/client";
import {
    type PlanAccessDenial,
    type PlanRequirement,
    planAccessDenial,
} from "@repo/sdk/src/types";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMyAccount } from "@/shared/hooks/useMyAccount";
import { withLocalePath } from "@/shared/lib/localePath";

type PlanGateProps = {
    requirement: PlanRequirement;
    children: ReactNode;
    loadingFallback?: ReactNode;
};

/**
 * Anticipates the API's plan check with the access the API itself computed. When the
 * account cannot be read the content shows anyway: the API still refuses, and the refusal
 * reaches the person as a translated error.
 *
 * The plan's features reach the profile in a provider event of their own, after the
 * subscription, so every mount reads the account again instead of trusting the cache.
 */
export function PlanGate({
    requirement,
    children,
    loadingFallback = null,
}: PlanGateProps) {
    const { data: account, isError } = useMyAccount({
        refetchOnMount: "always",
    });

    // No data and no error also covers the server render and the wait for the token,
    // when the query is disabled and reports itself as not loading.
    if (!(account || isError)) {
        return loadingFallback;
    }

    const denial = account?.planAccess
        ? planAccessDenial(account.planAccess, requirement)
        : null;

    return denial ? <PlanGateInvite denial={denial} /> : children;
}

function PlanGateInvite({ denial }: { denial: PlanAccessDenial }) {
    const { dictionary, locale } = getDictionary();
    const planGateCopy = dictionary.apps.app.shared.planGate;
    const inviteCopy =
        denial === "PLAN_FEATURE_REQUIRED"
            ? planGateCopy.featureRequired
            : planGateCopy.subscriptionRequired;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{inviteCopy.title}</CardTitle>
                <CardDescription>{inviteCopy.description}</CardDescription>
            </CardHeader>
            <CardFooter>
                <Link
                    className={buttonVariants()}
                    href={withLocalePath(locale, "/account?tab=billing")}
                >
                    {planGateCopy.viewPlans}
                </Link>
            </CardFooter>
        </Card>
    );
}
