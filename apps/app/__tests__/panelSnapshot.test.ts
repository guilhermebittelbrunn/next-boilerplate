import { UserRoleLevel } from "@repo/auth/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    IMPERSONATE_UID_COOKIE,
    PANEL_ROLE_COOKIE,
} from "@/shared/lib/panelState";

const { cookiesMock, getAppSessionUserMock } = vi.hoisted(() => ({
    cookiesMock: vi.fn(),
    getAppSessionUserMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: () => cookiesMock() }));
vi.mock("@/lib/server/authSession", () => ({
    getAppSessionUser: () => getAppSessionUserMock(),
}));

function givenCookies(values: Record<string, string>) {
    cookiesMock.mockReturnValue({
        get: (name: string) =>
            name in values ? { value: values[name] } : undefined,
    });
}

/**
 * `resolvePanelSnapshot` is wrapped in React `cache`: a fresh module per case guarantees
 * the snapshot is recomputed instead of served from a memo.
 */
async function loadPanelSnapshot() {
    vi.resetModules();
    return await import("@/lib/server/panelSnapshot");
}

beforeEach(() => {
    cookiesMock.mockReset();
    getAppSessionUserMock.mockReset();
    givenCookies({});
});

describe("resolvePanelSnapshot", () => {
    it("resolves the anonymous snapshot when there is no session", async () => {
        getAppSessionUserMock.mockResolvedValue(null);
        givenCookies({
            [PANEL_ROLE_COOKIE]: UserRoleLevel.COMMON,
            [IMPERSONATE_UID_COOKIE]: "uid-alice",
        });

        const { resolvePanelSnapshot, isImpersonating } =
            await loadPanelSnapshot();

        expect(await resolvePanelSnapshot()).toEqual({
            profileKind: null,
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: null,
        });
        expect(await isImpersonating()).toBe(false);
    });

    it("ignores the panel cookies for a common user", async () => {
        getAppSessionUserMock.mockResolvedValue({
            uid: "uid-alice",
            type: "common",
        });
        givenCookies({
            [PANEL_ROLE_COOKIE]: UserRoleLevel.ADMIN,
            [IMPERSONATE_UID_COOKIE]: "uid-bruno",
        });

        const { resolvePanelSnapshot, isImpersonating } =
            await loadPanelSnapshot();

        expect(await resolvePanelSnapshot()).toEqual({
            profileKind: "common",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: null,
        });
        expect(await isImpersonating()).toBe(false);
    });

    it("puts an admin without panel cookies in the admin panel", async () => {
        getAppSessionUserMock.mockResolvedValue({
            uid: "uid-root",
            type: "admin",
        });

        const { resolvePanelSnapshot, isImpersonating } =
            await loadPanelSnapshot();

        expect(await resolvePanelSnapshot()).toEqual({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });
        expect(await isImpersonating()).toBe(false);
    });

    it("resolves impersonation for an admin with the common panel and a target", async () => {
        getAppSessionUserMock.mockResolvedValue({
            uid: "uid-root",
            type: "admin",
        });
        givenCookies({
            [PANEL_ROLE_COOKIE]: UserRoleLevel.COMMON,
            [IMPERSONATE_UID_COOKIE]: "uid-alice",
        });

        const { resolvePanelSnapshot, isImpersonating } =
            await loadPanelSnapshot();

        expect(await resolvePanelSnapshot()).toEqual({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.COMMON,
            impersonatedFirebaseUid: "uid-alice",
        });
        expect(await isImpersonating()).toBe(true);
    });

    it("collapses to the admin panel when the common panel has no target", async () => {
        getAppSessionUserMock.mockResolvedValue({
            uid: "uid-root",
            type: "admin",
        });
        givenCookies({ [PANEL_ROLE_COOKIE]: UserRoleLevel.COMMON });

        const { resolvePanelSnapshot, isImpersonating } =
            await loadPanelSnapshot();

        expect(await resolvePanelSnapshot()).toEqual({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });
        expect(await isImpersonating()).toBe(false);
    });

    it("treats an empty impersonation cookie as no target", async () => {
        getAppSessionUserMock.mockResolvedValue({
            uid: "uid-root",
            type: "admin",
        });
        givenCookies({
            [PANEL_ROLE_COOKIE]: UserRoleLevel.COMMON,
            [IMPERSONATE_UID_COOKIE]: "",
        });

        const { resolvePanelSnapshot, isImpersonating } =
            await loadPanelSnapshot();

        expect(await resolvePanelSnapshot()).toEqual({
            profileKind: "admin",
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
        });
        expect(await isImpersonating()).toBe(false);
    });
});
