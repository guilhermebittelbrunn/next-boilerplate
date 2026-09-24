const TRAILING_SLASHES = /\/+$/;

type PlanCtaInput = {
    appUrl: string | undefined;
    locale: string;
    subscriptionMode: boolean;
};

/**
 * In subscription mode a plan is bought from the billing tab of the app. Anywhere else the
 * call to action keeps pointing at the app, or at the landing's own sign-up without one.
 */
export function resolvePlanCtaHref({
    appUrl,
    locale,
    subscriptionMode,
}: PlanCtaInput): string {
    if (!appUrl) {
        return `/${locale}/sign-up`;
    }

    if (!subscriptionMode) {
        return appUrl;
    }

    return `${appUrl.replace(TRAILING_SLASHES, "")}/${locale}/account?tab=billing`;
}
