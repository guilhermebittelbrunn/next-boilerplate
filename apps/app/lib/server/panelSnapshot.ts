import { cookies } from "next/headers";
import { cache } from "react";
import { getAppSessionUser } from "@/lib/server/authSession";
import { mapMeTypeToProfileKind } from "@/shared/lib/authRequestHeaders";
import {
    IMPERSONATE_UID_COOKIE,
    isImpersonatingSnapshot,
    normalizePanelSnapshot,
    PANEL_ROLE_COOKIE,
    type PanelSnapshot,
} from "@/shared/lib/panelState";

/**
 * Resolves the authoritative panel state on the server, from the session and the
 * mirrored cookies.
 *
 * This is what makes the panel correct on the **first paint**: the client no longer has
 * to discover its own context over the network (`/auth/me`) before it can render the
 * switcher, so the controls can't disappear mid-reload.
 *
 * `cache` dedupes it across the layout, the pages and the prefetch of a single request.
 */
export const resolvePanelSnapshot = cache(async (): Promise<PanelSnapshot> => {
    const [user, cookieStore] = await Promise.all([
        getAppSessionUser(),
        cookies(),
    ]);

    return normalizePanelSnapshot({
        // An authenticated session always has a panel. Least privilege: anything that is
        // not explicitly admin counts as common, so a profile with a missing or unknown
        // `type` still gets its auth-request headers instead of silently resolving as
        // anonymous and sending none.
        profileKind: user ? mapMeTypeToProfileKind(user.type) : null,
        panelRole: cookieStore.get(PANEL_ROLE_COOKIE)?.value,
        impersonatedUid: cookieStore.get(IMPERSONATE_UID_COOKIE)?.value,
    });
});

/**
 * Whether an admin is currently acting as a common user.
 *
 * RSC prefetch only carries the Bearer token (the API would resolve the actor as
 * themselves), so while impersonation is active we skip prefetch and let the client
 * fetch with the impersonation headers — avoiding a wrong-user flash.
 */
export async function isImpersonating(): Promise<boolean> {
    return isImpersonatingSnapshot(await resolvePanelSnapshot());
}
