import { UserRoleLevel } from "@repo/auth/types";
import { beforeEach, describe, expect, it } from "vitest";
import {
    ANONYMOUS_PANEL_SNAPSHOT,
    clearPanelMirror,
    IMPERSONATE_UID_COOKIE,
    isImpersonatingSnapshot,
    normalizePanelSnapshot,
    PANEL_COOKIE_MAX_AGE_SECONDS,
    PANEL_ROLE_COOKIE,
    readPanelMirror,
    shouldRenderImpersonationPicker,
    shouldRenderPanelControls,
    writePanelCookies,
    writePanelMirror,
} from "@/shared/lib/panelState";

const DAYS_IN_PANEL_COOKIE_WINDOW = 14;
const SECONDS_IN_A_DAY = 24 * 60 * 60;
const FOURTEEN_DAYS_IN_SECONDS = DAYS_IN_PANEL_COOKIE_WINDOW * SECONDS_IN_A_DAY;

function clearAllCookies() {
    for (const entry of document.cookie.split(";")) {
        const name = entry.split("=")[0]?.trim();
        if (name) {
            // biome-ignore lint/suspicious/noDocumentCookie: jsdom exposes no cookie store
            document.cookie = `${name}=; path=/; max-age=0`;
        }
    }
}

describe("normalizePanelSnapshot", () => {
    it("collapses to the anonymous snapshot when there is no profile", () => {
        expect(
            normalizePanelSnapshot({
                profileKind: null,
                panelRole: UserRoleLevel.COMMON,
                impersonatedUid: "u1",
            })
        ).toEqual(ANONYMOUS_PANEL_SNAPSHOT);
    });

    it("forces a common user into the common panel with no target", () => {
        expect(
            normalizePanelSnapshot({
                profileKind: "common",
                panelRole: UserRoleLevel.ADMIN,
                impersonatedUid: "someone-else",
            })
        ).toEqual({
            profileKind: "common",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: null,
        });
    });

    it("keeps an admin impersonating when a target is present", () => {
        expect(
            normalizePanelSnapshot({
                profileKind: "admin",
                panelRole: UserRoleLevel.COMMON,
                impersonatedUid: "target-1",
            })
        ).toEqual({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "target-1",
        });
    });

    it("collapses an admin to the admin panel when the common target is missing", () => {
        // A COMMON panel with no target is not impersonation: the API would reject every
        // request, so the snapshot must report the admin panel and let the layout bounce.
        for (const missing of [null, undefined, ""]) {
            expect(
                normalizePanelSnapshot({
                    profileKind: "admin",
                    panelRole: UserRoleLevel.COMMON,
                    impersonatedUid: missing,
                })
            ).toEqual({
                profileKind: "admin",
                panelRequestRole: UserRoleLevel.ADMIN,
                impersonatedFirebaseUid: null,
            });
        }
    });

    it("ignores a stale target while in the admin panel", () => {
        expect(
            normalizePanelSnapshot({
                profileKind: "admin",
                panelRole: UserRoleLevel.ADMIN,
                impersonatedUid: "left-over",
            }).impersonatedFirebaseUid
        ).toBeNull();
    });

    it("treats an unknown panel role as the admin panel", () => {
        expect(
            normalizePanelSnapshot({
                profileKind: "admin",
                panelRole: "garbage",
                impersonatedUid: "target-1",
            }).panelRequestRole
        ).toBe(UserRoleLevel.ADMIN);
    });
});

describe("isImpersonatingSnapshot", () => {
    it("is true only for an admin in the common panel with a target", () => {
        expect(
            isImpersonatingSnapshot({
                profileKind: "admin",
                panelRequestRole: UserRoleLevel.COMMON,
                impersonatedFirebaseUid: "target-1",
            })
        ).toBe(true);
    });

    it("is false for a common user in their own common panel", () => {
        expect(
            isImpersonatingSnapshot({
                profileKind: "common",
                panelRequestRole: UserRoleLevel.COMMON,
                impersonatedFirebaseUid: null,
            })
        ).toBe(false);
    });

    it("is false for an admin without a target", () => {
        expect(
            isImpersonatingSnapshot({
                profileKind: "admin",
                panelRequestRole: UserRoleLevel.ADMIN,
                impersonatedFirebaseUid: null,
            })
        ).toBe(false);
    });
});

/**
 * Regression guard for the reported bug: the switcher used to disappear after switching
 * the impersonated user, because visibility depended on `profileKind` arriving from an
 * async `/auth/me`. It is now derived from the server snapshot alone, so it must be
 * decidable without any network state.
 */
describe("panel control visibility (server snapshot only)", () => {
    it("renders both controls for an admin impersonating, straight from the snapshot", () => {
        const snapshot = normalizePanelSnapshot({
            profileKind: "admin",
            panelRole: UserRoleLevel.COMMON,
            impersonatedUid: "target-1",
        });

        expect(shouldRenderPanelControls(snapshot.profileKind)).toBe(true);
        expect(
            shouldRenderImpersonationPicker(
                snapshot.profileKind,
                snapshot.panelRequestRole
            )
        ).toBe(true);
    });

    it("renders the switcher but not the picker for an admin in the admin panel", () => {
        expect(shouldRenderPanelControls("admin")).toBe(true);
        expect(
            shouldRenderImpersonationPicker("admin", UserRoleLevel.ADMIN)
        ).toBe(false);
    });

    it("never renders controls for a common user", () => {
        expect(shouldRenderPanelControls("common")).toBe(false);
        expect(
            shouldRenderImpersonationPicker("common", UserRoleLevel.COMMON)
        ).toBe(false);
    });

    it("never renders controls before a profile is known", () => {
        expect(shouldRenderPanelControls(null)).toBe(false);
        expect(
            shouldRenderImpersonationPicker(null, UserRoleLevel.COMMON)
        ).toBe(false);
    });
});

describe("cookie mirror", () => {
    beforeEach(() => {
        clearAllCookies();
    });

    it("writes both cookies for an impersonating admin", () => {
        writePanelCookies({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "target-1",
        });

        expect(document.cookie).toContain(
            `${PANEL_ROLE_COOKIE}=${UserRoleLevel.COMMON}`
        );
        expect(document.cookie).toContain(`${IMPERSONATE_UID_COOKIE}=target-1`);
    });

    it("drops the target cookie when there is no impersonation", () => {
        writePanelCookies({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "target-1",
        });
        writePanelCookies({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });

        expect(document.cookie).not.toContain(IMPERSONATE_UID_COOKIE);
        expect(document.cookie).toContain(
            `${PANEL_ROLE_COOKIE}=${UserRoleLevel.ADMIN}`
        );
    });

    it("outlives the longest possible session", () => {
        // A shorter cookie would expire mid-session and silently bounce an impersonating
        // admin back to /admin. Firebase caps the session cookie at 14 days.
        expect(PANEL_COOKIE_MAX_AGE_SECONDS).toBeGreaterThanOrEqual(
            FOURTEEN_DAYS_IN_SECONDS
        );
    });
});

describe("localStorage mirror", () => {
    beforeEach(() => {
        clearPanelMirror();
    });

    it("round-trips the snapshot and the display label", () => {
        writePanelMirror({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "target-1",
            impersonatedLabel: "Ana",
        });

        expect(readPanelMirror()).toEqual({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "target-1",
            impersonatedLabel: "Ana",
        });
    });

    it("drops a label that has no target to belong to", () => {
        writePanelMirror({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
            impersonatedLabel: "Ana",
        });

        expect(readPanelMirror()?.impersonatedLabel).toBeNull();
    });

    it("returns null when nothing was stored", () => {
        expect(readPanelMirror()).toBeNull();
    });

    it("returns null instead of throwing on corrupted storage", () => {
        window.localStorage.setItem("bp:panel-state", "{not json");
        expect(readPanelMirror()).toBeNull();
    });

    it("is wiped by clearPanelMirror (sign-out)", () => {
        writePanelMirror({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "target-1",
            impersonatedLabel: "Ana",
        });
        clearPanelMirror();
        expect(readPanelMirror()).toBeNull();
    });
});
