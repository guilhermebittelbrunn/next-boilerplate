"use client";

import useAuth from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
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
import { LayersIcon, PowerIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
import { MetricCard } from "@/shared/components/ui/MetricCard";
import { useMyAccount } from "@/shared/hooks/useMyAccount";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { COMMON_ROUTES } from "../../paths";
import { useEntitySummary } from "../(hooks)/useEntitySummary";

// Deferred so the cards paint without waiting for recharts, which does not tree-shake
// and would otherwise land whole in the chunk of the most visited screen of the panel.
const EntityTypeChart = dynamic(
    () => import("./EntityTypeChart").then((mod) => mod.EntityTypeChart),
    {
        ssr: false,
        loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
    }
);

export function CommonHomeClient() {
    const { data: summary, isLoading, error } = useEntitySummary();
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

    const displayName = account?.displayName ?? user?.displayName ?? null;
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

    const renderContent = () => {
        if (summaryLoadError) {
            return <LoadErrorState message={summaryLoadError} />;
        }

        if (isLoading || !summary) {
            return (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <MetricCard
                            hint={homePage.metrics.total.hint}
                            label={homePage.metrics.total.label}
                            loading
                            value={0}
                        />
                        <MetricCard
                            hint={homePage.metrics.enabled.hint}
                            label={homePage.metrics.enabled.label}
                            loading
                            value={0}
                        />
                    </div>
                    <Skeleton className="h-64 w-full rounded-xl" />
                </>
            );
        }

        if (hasNoEntities) {
            return (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <LayersIcon />
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
            <>
                <div className="grid gap-4 sm:grid-cols-2">
                    <MetricCard
                        hint={homePage.metrics.total.hint}
                        icon={<LayersIcon className="size-4" />}
                        label={homePage.metrics.total.label}
                        value={summary.total}
                    />
                    <MetricCard
                        hint={homePage.metrics.enabled.hint}
                        icon={<PowerIcon className="size-4" />}
                        label={homePage.metrics.enabled.label}
                        value={summary.enabled}
                    />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>{homePage.chart.title}</CardTitle>
                        <CardDescription>
                            {homePage.chart.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {hasTypedEntities ? (
                            <EntityTypeChart byType={summary.byType} />
                        ) : (
                            <p className="py-8 text-center text-muted-foreground text-sm">
                                {homePage.chart.empty}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </>
        );
    };

    return (
        <>
            <Header page={routes.root.label} />
            <Container>
                <div className="mx-auto flex w-full flex-col gap-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="font-semibold text-2xl tracking-tight">
                            {greeting}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {homePage.subtitle}
                        </p>
                    </div>
                    {renderContent()}
                </div>
            </Container>
        </>
    );
}
