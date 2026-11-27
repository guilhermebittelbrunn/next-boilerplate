"use client";

import {
    Alert,
    AlertDescription,
} from "@repo/design-system/components/ui/alert";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { getDictionary } from "@repo/internationalization/client";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import type { BillingSummaryDataDTO } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { CreditCardIcon, TriangleAlertIcon } from "lucide-react";
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
    const {
        data: summary,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useBillingSummary();
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
            return (
                <LoadErrorState
                    message={billingLoadError}
                    onRetry={() => refetch()}
                    retrying={isFetching}
                />
            );
        }

        if (isLoading || !summary?.enabled) {
            return (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-44 w-full rounded-xl" />
                    <Skeleton className="h-44 w-full rounded-xl" />
                    <Skeleton className="h-96 w-full rounded-xl lg:col-span-2" />
                </div>
            );
        }

        if (isWithoutAnySale(summary)) {
            return (
                <Empty className="rounded-xl border">
                    <EmptyHeader className="max-w-md">
                        <EmptyMedia variant="icon">
                            <CreditCardIcon aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>{billingCopy.empty.title}</EmptyTitle>
                        <EmptyDescription className="text-pretty">
                            {billingCopy.empty.description}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            );
        }

        return (
            <>
                {summary.plans.length > 0 &&
                    summary.revenue.trackingSince === null && (
                        <Alert>
                            <TriangleAlertIcon
                                aria-hidden="true"
                                className="text-warning"
                            />
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
        <section
            aria-labelledby="admin-billing-title"
            className="flex flex-col gap-4"
        >
            <div className="flex flex-col gap-1">
                <h2
                    className="font-semibold text-lg tracking-tight"
                    id="admin-billing-title"
                >
                    {billingCopy.title}
                </h2>
                <p className="max-w-[65ch] text-pretty text-muted-foreground text-sm">
                    {billingCopy.description}
                </p>
            </div>
            {renderContent()}
        </section>
    );
}
