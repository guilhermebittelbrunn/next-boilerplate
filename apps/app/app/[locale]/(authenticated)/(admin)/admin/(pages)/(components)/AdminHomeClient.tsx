"use client";

import useAuth from "@repo/auth/provider";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { ShieldIcon, UserIcon, UsersIcon } from "lucide-react";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
import { MetricCard } from "@/shared/components/ui/MetricCard";
import { ADMIN_ROUTES } from "../../paths";
import { useUserSummary } from "../(hooks)/useUserSummary";

export function AdminHomeClient() {
    const { data: summary, isLoading, error } = useUserSummary();
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
            icon: <UsersIcon className="size-4" />,
            label: homePage.metrics.total.label,
            hint: homePage.metrics.total.hint,
            value: summary?.total ?? 0,
        },
        {
            key: "admins",
            icon: <ShieldIcon className="size-4" />,
            label: homePage.metrics.admins.label,
            hint: homePage.metrics.admins.hint,
            value: summary?.byType.admin ?? 0,
        },
        {
            key: "common",
            icon: <UserIcon className="size-4" />,
            label: homePage.metrics.common.label,
            hint: homePage.metrics.common.hint,
            value: summary?.byType.common ?? 0,
        },
    ];

    const loading = isLoading || !summary;

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
                    {summaryLoadError ? (
                        <LoadErrorState message={summaryLoadError} />
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {metrics.map((metric) => (
                                <MetricCard
                                    hint={metric.hint}
                                    icon={loading ? undefined : metric.icon}
                                    key={metric.key}
                                    label={metric.label}
                                    loading={loading}
                                    value={metric.value}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </Container>
        </>
    );
}
