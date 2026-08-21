import { canSwitchPanelEnvironment, UserRoleLevel } from "@repo/auth/types";
import type { ProfileKind } from "./authRequestHeaders";

/**
 * Panel state = which environment an admin is operating (admin or common) and, when
 * common, which common user they are acting as.
 *
 * Two mirrors, one authority:
 * - **cookies** are the authority — Server Components read them to decide routing and
 *   RSC prefetch, so the first paint is already correct;
 * - **localStorage** keeps the display label the cookies cannot carry, so the picker can
 *   paint the current choice before the user list loads. It never overrides the server
 *   snapshot: on every load the snapshot wins and the mirror is rewritten from it.
 *
 * Neither grants access. The API re-validates the target on every request, so these are
 * preferences, not credentials.
 */
export const PANEL_ROLE_COOKIE = "bp:panel-request-role";
export const IMPERSONATE_UID_COOKIE = "bp:impersonate-firebase-uid";
export const PANEL_STORAGE_KEY = "bp:panel-state";

/** What the server can resolve by itself, from the session and the cookies. */
export type PanelSnapshot = {
    profileKind: ProfileKind | null;
    panelRequestRole: UserRoleLevel;
    impersonatedFirebaseUid: string | null;
};

/** The snapshot plus the client-only display label. */
export type PanelMirror = PanelSnapshot & {
    impersonatedLabel: string | null;
};

const SECONDS_PER_DAY = 86_400;
/** Firebase caps a session cookie at 14 days, so the panel cookie matches that ceiling. */
const MAX_SESSION_DAYS = 14;

/**
 * The panel cookie must never expire before the session: if it does, the server stops
 * seeing the admin's COMMON panel and bounces them back to /admin mid-session.
 */
export const PANEL_COOKIE_MAX_AGE_SECONDS = MAX_SESSION_DAYS * SECONDS_PER_DAY;

export const ANONYMOUS_PANEL_SNAPSHOT: PanelSnapshot = {
    profileKind: null,
    panelRequestRole: UserRoleLevel.COMMON,
    impersonatedFirebaseUid: null,
};

export function parsePanelRole(
    value: string | null | undefined
): UserRoleLevel {
    return value === UserRoleLevel.COMMON
        ? UserRoleLevel.COMMON
        : UserRoleLevel.ADMIN;
}

/**
 * Normalizes a raw (session, cookies) pair into a coherent snapshot.
 *
 * Shared by the server resolver and the client recovery path so both agree on the
 * invariants: only admins have a panel choice, and a COMMON panel without a target is
 * not impersonation — it collapses back to the admin panel.
 */
export function normalizePanelSnapshot(input: {
    profileKind: ProfileKind | null;
    panelRole: string | null | undefined;
    impersonatedUid: string | null | undefined;
}): PanelSnapshot {
    const { profileKind, panelRole, impersonatedUid } = input;

    if (profileKind === null) {
        return ANONYMOUS_PANEL_SNAPSHOT;
    }

    if (profileKind === "common") {
        return {
            profileKind: "common",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: null,
        };
    }

    const requestedRole = parsePanelRole(panelRole);
    const target = impersonatedUid || null;
    const impersonating =
        requestedRole === UserRoleLevel.COMMON && target !== null;

    return {
        profileKind: "admin",
        panelRequestRole: impersonating
            ? UserRoleLevel.COMMON
            : UserRoleLevel.ADMIN,
        impersonatedFirebaseUid: impersonating ? target : null,
    };
}

export function isImpersonatingSnapshot(snapshot: PanelSnapshot): boolean {
    return (
        snapshot.profileKind === "admin" &&
        snapshot.panelRequestRole === UserRoleLevel.COMMON &&
        snapshot.impersonatedFirebaseUid !== null
    );
}

/**
 * Whether the environment switcher renders. Pure and driven by the snapshot alone, so
 * the controls survive the first paint after a reload instead of waiting on `/auth/me`.
 */
export function shouldRenderPanelControls(
    profileKind: ProfileKind | null
): boolean {
    if (profileKind === null) {
        return false;
    }
    return canSwitchPanelEnvironment(
        profileKind === "admin" ? UserRoleLevel.ADMIN : UserRoleLevel.COMMON
    );
}

/** Whether the "acting as" user picker renders next to the switcher. */
export function shouldRenderImpersonationPicker(
    profileKind: ProfileKind | null,
    panelRequestRole: UserRoleLevel
): boolean {
    return (
        shouldRenderPanelControls(profileKind) &&
        panelRequestRole === UserRoleLevel.COMMON
    );
}

function writeCookie(name: string, value: string | null): void {
    if (typeof document === "undefined") {
        return;
    }
    if (value === null || value === "") {
        // biome-ignore lint/suspicious/noDocumentCookie: mirrored synchronously for SSR
        document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
        return;
    }
    // biome-ignore lint/suspicious/noDocumentCookie: mirrored synchronously for SSR
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${PANEL_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

/** Mirrors the snapshot into the cookies the server reads. */
export function writePanelCookies(snapshot: PanelSnapshot): void {
    writeCookie(PANEL_ROLE_COOKIE, snapshot.panelRequestRole);
    writeCookie(IMPERSONATE_UID_COOKIE, snapshot.impersonatedFirebaseUid);
}

export function clearPanelCookies(): void {
    writeCookie(PANEL_ROLE_COOKIE, null);
    writeCookie(IMPERSONATE_UID_COOKIE, null);
}

export function readPanelMirror(): PanelMirror | null {
    if (typeof window === "undefined") {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(PANEL_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as Partial<PanelMirror>;
        const snapshot = normalizePanelSnapshot({
            profileKind: parsed.profileKind ?? null,
            panelRole: parsed.panelRequestRole,
            impersonatedUid: parsed.impersonatedFirebaseUid,
        });
        return {
            ...snapshot,
            impersonatedLabel: snapshot.impersonatedFirebaseUid
                ? (parsed.impersonatedLabel ?? null)
                : null,
        };
    } catch {
        return null;
    }
}

export function writePanelMirror(mirror: PanelMirror): void {
    if (typeof window === "undefined") {
        return;
    }
    try {
        window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(mirror));
    } catch {
        // Storage can be unavailable (private mode, quota). Cookies still carry the state.
    }
}

export function clearPanelMirror(): void {
    if (typeof window === "undefined") {
        return;
    }
    try {
        window.localStorage.removeItem(PANEL_STORAGE_KEY);
    } catch {
        // Nothing to recover from — the cookies are cleared separately.
    }
}
