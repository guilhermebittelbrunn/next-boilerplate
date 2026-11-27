"use client";

import useAuth from "@repo/auth/provider";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
import { MetricStrip } from "@/shared/components/ui/MetricStrip";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { ADMIN_ROUTES } from "../../paths";
import { useUserSummary } from "../(hooks)/useUserSummary";
import { BillingInsightsSection } from "./BillingInsightsSection";
import { UserActivitySection } from "./UserActivitySection";

export function AdminHomeClient() {
    const {
        data: summary,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useUserSummary();
    // No `useMyAccount` here: `GET /account` is behind the common-panel guard, so an
    // admin who is not impersonating gets a 403 from it.
    const { user } = useAuth();
    const { dictionary, locale } = getDictionary();

    const routes = ADMIN_ROUTES(dictionary, locale);
    const homePage = dictionary.apps.app.pages.admin.home;
    const summaryLoadError = error
        ? handleClientError(new FormattedError(error, locale))
        : null;

    const firstName = user?.displayName?.trim().split(" ")[0] ?? null;
    const greeting = firstName
        ? `${homePage.greeting}, ${firstName}`
        : homePage.greeting;

    const metrics = [
        {
            key: "total",
            label: homePage.metrics.total.label,
            hint: homePage.metrics.total.hint,
            value: summary?.total ?? 0,
        },
        {
            key: "admins",
            label: homePage.metrics.admins.label,
            hint: homePage.metrics.admins.hint,
            value: summary?.byType.admin ?? 0,
        },
        {
            key: "common",
            label: homePage.metrics.common.label,
            hint: homePage.metrics.common.hint,
            value: summary?.byType.common ?? 0,
        },
    ];

    const loading = isLoading || !summary;

    return (
        <>
            <Header page={routes.root.label} />
            <Container
                header={
                    <PageHeader
                        description={homePage.subtitle}
                        title={greeting}
                    />
                }
            >
                <div className="flex w-full flex-col gap-6">
                    {summaryLoadError ? (
                        <LoadErrorState
                            message={summaryLoadError}
                            onRetry={() => refetch()}
                            retrying={isFetching}
                        />
                    ) : (
                        <MetricStrip
                            className="overflow-hidden rounded-xl bg-card text-card-foreground shadow-card"
                            items={metrics}
                            loading={loading}
                            locale={locale}
                        />
                    )}
                    <UserActivitySection />
                    <BillingInsightsSection />
                </div>
            </Container>
        </>
    );
}
