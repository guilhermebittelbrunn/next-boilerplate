import { isSubscriptionMode } from "@repo/next-config/product-mode";

const allAccountTabValues = [
    "profile",
    "security",
    "preferences",
    "billing",
    "privacy",
] as const;

export type AccountTabValue = (typeof allAccountTabValues)[number];

// A product without subscriptions has nothing to bill, so the section is not offered
// and a link to `?tab=billing` lands on the profile.
export const accountTabValues: readonly AccountTabValue[] = isSubscriptionMode()
    ? allAccountTabValues
    : allAccountTabValues.filter((value) => value !== "billing");

export const resolveAccountTab = (raw: string | null): AccountTabValue =>
    accountTabValues.includes(raw as AccountTabValue)
        ? (raw as AccountTabValue)
        : "profile";

export const accountTabHref = (
    pathname: string,
    searchParams: Pick<URLSearchParams, "toString">,
    tab: AccountTabValue
): string => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `${pathname}?${params.toString()}`;
};
