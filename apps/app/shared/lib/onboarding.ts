import { postAuthRedirectTarget } from "@repo/auth/redirect";
import { locales } from "@repo/internationalization/utils";
import {
    ONBOARDING_STEPS,
    type OnboardingStateDTO,
    type OnboardingStepId,
} from "@repo/sdk/src/types";

/** Written by the proxy on every request it lets through; any value the browser sent is replaced. */
export const APP_PATH_HEADER = "x-app-path";

const ONBOARDING_APP_PATH = "/onboarding";
const QUERY_OR_HASH = /[?#]/;

export function onboardingStepIndex(step: unknown): number {
    const index = ONBOARDING_STEPS.findIndex(({ id }) => id === step);
    return index === -1 ? 0 : index;
}

/**
 * `null` means "nothing to do": the field is absent on profiles that predate the flow, and
 * a malformed one is let through rather than holding the user on a screen that cannot
 * render. A stored step that is no longer in the list reads as the first one.
 */
export function readOnboardingState(raw: unknown): OnboardingStateDTO | null {
    if (typeof raw !== "object" || raw === null) {
        return null;
    }

    const { step, completedAt } = raw as {
        step?: unknown;
        completedAt?: unknown;
    };
    const normalizedStep: OnboardingStepId =
        ONBOARDING_STEPS[onboardingStepIndex(step)].id;

    if (completedAt === null) {
        return { step: normalizedStep, completedAt: null };
    }
    if (
        typeof completedAt === "string" &&
        !Number.isNaN(Date.parse(completedAt))
    ) {
        return { step: normalizedStep, completedAt };
    }
    return null;
}

export function isOnboardingPending(raw: unknown): boolean {
    return readOnboardingState(raw)?.completedAt === null;
}

/** Empty or absent keeps the flow on; only an explicit "false" turns it off. */
export function isOnboardingEnabled(rawFlag: string | undefined): boolean {
    return rawFlag?.trim().toLowerCase() !== "false";
}

function splitLocale(path: string): { locale: string; rest: string } | null {
    const [, first = "", ...rest] = path.split("/");
    if (!locales.includes(first as (typeof locales)[number])) {
        return null;
    }
    return { locale: first, rest: rest.length ? `/${rest.join("/")}` : "" };
}

function isOnboardingPath(path: string): boolean {
    const [pathname = ""] = path.split(QUERY_OR_HASH);
    const appPath = splitLocale(pathname)?.rest ?? pathname;
    return (
        appPath === ONBOARDING_APP_PATH ||
        appPath.startsWith(`${ONBOARDING_APP_PATH}/`)
    );
}

function isLocaleHome(path: string): boolean {
    const split = splitLocale(path);
    return split !== null && (split.rest === "" || split.rest === "/");
}

/**
 * Sanitized like every other post-auth destination, plus one refusal of its own: a
 * destination pointing back at the onboarding would send a finished user to a page that
 * immediately sends them to the destination again.
 */
export function resolveOnboardingDestination(
    rawRedirect: string | null | undefined,
    locale: string
): string {
    const fallback = `/${locale}`;
    const target = postAuthRedirectTarget(rawRedirect ?? null, fallback);
    return isOnboardingPath(target) ? fallback : target;
}

export function buildOnboardingPath(
    locale: string,
    requestedPath: string | null | undefined
): string {
    const onboardingPath = `/${locale}${ONBOARDING_APP_PATH}`;
    const destination = resolveOnboardingDestination(requestedPath, locale);

    if (isLocaleHome(destination)) {
        return onboardingPath;
    }
    return `${onboardingPath}?redirect=${encodeURIComponent(destination)}`;
}

/** Swaps the locale segment of an already sanitized, locale-prefixed destination. */
export function withDestinationLocale(
    destination: string,
    locale: string
): string {
    const split = splitLocale(destination);
    if (!split) {
        return destination;
    }
    return `/${locale}${split.rest}`;
}
