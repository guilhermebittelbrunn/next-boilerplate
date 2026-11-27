"use client";

import useAuth from "@repo/auth/provider";
import {
    Button,
    buttonVariants,
} from "@repo/design-system/components/ui/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { ArrowRightIcon, LayersIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
import { MetricStrip } from "@/shared/components/ui/MetricStrip";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { useMyAccount } from "@/shared/hooks/useMyAccount";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { COMMON_ROUTES } from "../../paths";
import { useEntitySummary } from "../(hooks)/useEntitySummary";

const CHART_HEIGHT_CLASS = "h-60";

// Deferred so the counts paint without waiting for recharts, which does not tree-shake
// and would otherwise land whole in the chunk of the most visited screen of the panel.
const EntityTypeChart = dynamic(
    () => import("./EntityTypeChart").then((mod) => mod.EntityTypeChart),
    {
        ssr: false,
        loading: () => (
            <Skeleton className={`${CHART_HEIGHT_CLASS} w-full rounded-lg`} />
        ),
    }
);

export function CommonHomeClient() {
    const {
        data: summary,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useEntitySummary();
    const { user } = useAuth();
    const { data: account } = useMyAccount();
    const { isImpersonating } = useAuthRequestPanel();
    const router = useRouter();
    const { dictionary, locale } = getDictionary();

    const routes = COMMON_ROUTES(dictionary, locale);
    const homePage = dictionary.apps.app.pages.common.home;
    const summaryLoadError = error
        ? handleClientError(new FormattedError(error, locale))
        : null;

    // While impersonating, the Firebase client user is the admin, never the account on screen.
    const fallbackUser = isImpersonating ? null : user;
    const displayName =
        account?.displayName ?? fallbackUser?.displayName ?? null;
    const firstName = displayName?.trim().split(" ")[0] ?? null;
    const greeting = firstName
        ? `${homePage.greeting}, ${firstName}`
        : homePage.greeting;

    const hasNoEntities = summary?.total === 0;
    // A record saved outside the API can reach Firestore without `type`, and it is
    // counted in the total while falling out of every per-type count. The chart says so
    // instead of drawing three empty columns.
    const hasTypedEntities = summary
        ? Object.values(summary.byType).some((count) => count > 0)
        : false;
    const loading = isLoading || !summary;

    const metrics = [
        {
            key: "total",
            label: homePage.metrics.total.label,
            hint: homePage.metrics.total.hint,
            value: summary?.total ?? 0,
        },
        {
            key: "enabled",
            label: homePage.metrics.enabled.label,
            hint: homePage.metrics.enabled.hint,
            value: summary?.enabled ?? 0,
        },
    ];

    const renderChart = () => {
        if (loading) {
            return (
                <Skeleton
                    className={`${CHART_HEIGHT_CLASS} w-full rounded-lg`}
                />
            );
        }
        if (hasTypedEntities) {
            return <EntityTypeChart byType={summary.byType} />;
        }
        return (
            <p
                className={`flex ${CHART_HEIGHT_CLASS} items-center justify-center text-pretty text-center text-muted-foreground text-sm`}
            >
                {homePage.chart.empty}
            </p>
        );
    };

    const renderContent = () => {
        if (summaryLoadError) {
            return (
                <LoadErrorState
                    message={summaryLoadError}
                    onRetry={() => refetch()}
                    retrying={isFetching}
                />
            );
        }

        if (hasNoEntities) {
            return (
                <Empty className="rounded-xl border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <LayersIcon aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>{homePage.empty.title}</EmptyTitle>
                        <EmptyDescription>
                            {homePage.empty.description}
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button
                            disabled={isImpersonating}
                            onClick={() =>
                                router.push(routes.entities.create.url)
                            }
                            type="button"
                        >
                            {homePage.empty.action}
                        </Button>
                    </EmptyContent>
                </Empty>
            );
        }

        return (
            <section
                aria-labelledby="common-home-chart-title"
                className="overflow-hidden rounded-xl bg-card text-card-foreground shadow-card"
            >
                <MetricStrip
                    items={metrics}
                    loading={loading}
                    locale={locale}
                />
                <div className="flex flex-col gap-4 border-border border-t px-5 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="flex min-w-0 flex-col gap-1">
                            <h2
                                className="font-semibold text-base tracking-tight"
                                id="common-home-chart-title"
                            >
                                {homePage.chart.title}
                            </h2>
                            <p className="text-pretty text-muted-foreground text-sm">
                                {homePage.chart.description}
                            </p>
                        </div>
                        <Link
                            className={buttonVariants({
                                size: "sm",
                                variant: "ghost",
                                className: "shrink-0 text-muted-foreground",
                            })}
                            href={routes.entities.list.url}
                        >
                            {homePage.chart.viewAll}
                            <ArrowRightIcon aria-hidden="true" />
                        </Link>
                    </div>
                    {renderChart()}
                </div>
            </section>
        );
    };

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
                    {renderContent()}
                </div>
            </Container>
        </>
    );
}
