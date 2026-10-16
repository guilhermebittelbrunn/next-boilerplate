const TRAILING_SLASHES = /\/+$/;

type PlanCtaInput = {
    appUrl: string | undefined;
    locale: string;
    subscriptionMode: boolean;
    priceId: string;
};

/**
 * A plan is bought from the billing tab of the app, once an account exists: the visitor
 * goes through the app's sign-up, which carries the choice in `redirect` to that tab.
 * Anywhere else the call to action keeps pointing at the app, or at the landing's own
 * sign-up without one.
 */
export function resolvePlanCtaHref({
    appUrl,
    locale,
    subscriptionMode,
    priceId,
}: PlanCtaInput): string {
    if (!appUrl) {
        return `/${locale}/sign-up`;
    }

    if (!subscriptionMode) {
        return appUrl;
    }

    const billingPath = `/${locale}/account?tab=billing&plan=${encodeURIComponent(priceId)}`;
    return `${appUrl.replace(TRAILING_SLASHES, "")}/${locale}/sign-up?redirect=${encodeURIComponent(billingPath)}`;
}
