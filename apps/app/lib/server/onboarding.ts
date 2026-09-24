import type { OnboardingStateDTO } from "@repo/sdk/src/types";
import { headers } from "next/headers";
import { env } from "@/env";
import { getAppSessionUser } from "@/lib/server/authSession";
import { resolvePanelSnapshot } from "@/lib/server/panelSnapshot";
import {
    APP_PATH_HEADER,
    buildOnboardingPath,
    isOnboardingEnabled,
    readOnboardingState,
} from "@/shared/lib/onboarding";

/**
 * The onboarding still owed by the signed-in user, or `null` when there is none to show.
 * An admin never has one, impersonating or not: `/auth/me` resolves the actor, so the
 * snapshot reads as admin while someone else's panel is on screen.
 */
export async function resolvePendingOnboarding(): Promise<OnboardingStateDTO | null> {
    if (!isOnboardingEnabled(env.ONBOARDING_ENABLED)) {
        return null;
    }

    const snapshot = await resolvePanelSnapshot();
    if (snapshot.profileKind !== "common") {
        return null;
    }

    const state = readOnboardingState((await getAppSessionUser())?.onboarding);
    return state?.completedAt === null ? state : null;
}

export async function resolveOnboardingRedirect(
    locale: string
): Promise<string | null> {
    if (!(await resolvePendingOnboarding())) {
        return null;
    }

    const requestedPath = (await headers()).get(APP_PATH_HEADER);
    return buildOnboardingPath(locale, requestedPath);
}
