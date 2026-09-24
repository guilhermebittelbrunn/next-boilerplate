import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerApiClient } from "@/lib/server/apiServerClient";
import { resolvePendingOnboarding } from "@/lib/server/onboarding";
import { isImpersonating } from "@/lib/server/panelSnapshot";
import { resolveOnboardingDestination } from "@/shared/lib/onboarding";
import { queryKeys } from "@/shared/lib/queryKeys";
import { OnboardingClient } from "./(components)/OnboardingClient";

type OnboardingPageProps = {
    readonly params: Promise<{ locale: string }>;
    readonly searchParams: Promise<{ redirect?: string | string[] }>;
};

export const generateMetadata = async ({
    params,
}: OnboardingPageProps): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.app.pages.onboarding.meta);
};

export default async function OnboardingPage({
    params,
    searchParams,
}: OnboardingPageProps) {
    const [{ locale }, { redirect: rawRedirect }] = await Promise.all([
        params,
        searchParams,
    ]);
    const destination = resolveOnboardingDestination(
        typeof rawRedirect === "string" ? rawRedirect : null,
        locale
    );

    const pendingOnboarding = await resolvePendingOnboarding();
    if (!pendingOnboarding) {
        redirect(destination);
    }

    const queryClient = new QueryClient();
    if (!(await isImpersonating())) {
        const client = await getServerApiClient("common");
        if (client) {
            await queryClient.prefetchQuery({
                queryKey: queryKeys.account.me(),
                queryFn: () => client.account.me(),
            });
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <OnboardingClient
                destination={destination}
                initialStep={pendingOnboarding.step}
                key={pendingOnboarding.step}
            />
        </HydrationBoundary>
    );
}
