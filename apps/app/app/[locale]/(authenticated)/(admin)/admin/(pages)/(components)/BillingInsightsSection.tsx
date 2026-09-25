"use client";

import {
    Alert,
    AlertDescription,
} from "@repo/design-system/components/ui/alert";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { getDictionary } from "@repo/internationalization/client";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import type { BillingSummaryDataDTO } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
import { useBillingSummary } from "../(hooks)/useBillingSummary";
import { BillingPlansCard } from "./BillingPlansCard";
import { BillingRevenueCard } from "./BillingRevenueCard";
import { RecentActivationsCard } from "./RecentActivationsCard";

function isWithoutAnySale(summary: BillingSummaryDataDTO): boolean {
    return (
        summary.plans.length === 0 &&
        summary.recentActivations.length === 0 &&
        summary.revenue.trackingSince === null
    );
}

export function BillingInsightsSection() {
    const { data: summary, isLoading, error } = useBillingSummary();
    const { dictionary, locale } = getDictionary();

    if (!isSubscriptionMode() || summary?.enabled === false) {
        return null;
    }

    const billingCopy = dictionary.apps.app.pages.admin.home.billing;
    const billingLoadError = error
        ? handleClientError(new FormattedError(error, locale))
        : null;

    const renderContent = () => {
        if (billingLoadError) {
            return <LoadErrorState message={billingLoadError} />;
        }

        if (isLoading || !summary?.enabled) {
            return (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
                </div>
            );
        }

        if (isWithoutAnySale(summary)) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>{billingCopy.empty.title}</CardTitle>
                        <CardDescription>
                            {billingCopy.empty.description}
                        </CardDescription>
                    </CardHeader>
                </Card>
            );
        }

        return (
            <>
                {summary.plans.length > 0 &&
                    summary.revenue.trackingSince === null && (
                        <Alert>
                            <AlertDescription>
                                {billingCopy.missingInvoiceEvent}
                            </AlertDescription>
                        </Alert>
                    )}
                <div className="grid gap-4 lg:grid-cols-2">
                    <BillingRevenueCard
                        copy={billingCopy.revenue}
                        locale={locale}
                        revenue={summary.revenue}
                    />
                    <RecentActivationsCard
                        activations={summary.recentActivations}
                        copy={billingCopy.activations}
                        intervalCopy={billingCopy.plans}
                        locale={locale}
                        unnamedPlan={billingCopy.plans.unnamed}
                    />
                    <BillingPlansCard
                        className="lg:col-span-2"
                        copy={billingCopy.plans}
                        plans={summary.plans}
                    />
                </div>
            </>
        );
    };

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="font-semibold text-lg tracking-tight">
                    {billingCopy.title}
                </h2>
                <p className="text-muted-foreground text-sm">
                    {billingCopy.description}
                </p>
            </div>
            {renderContent()}
        </section>
    );
}
