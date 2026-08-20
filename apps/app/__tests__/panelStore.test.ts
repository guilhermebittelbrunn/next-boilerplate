import { UserRoleLevel } from "@repo/auth/types";
import { beforeEach, describe, expect, it } from "vitest";
import {
    IMPERSONATE_UID_COOKIE,
    PANEL_ROLE_COOKIE,
    type PanelSnapshot,
    readPanelMirror,
} from "@/shared/lib/panelState";
import { createPanelStore } from "@/shared/stores/panelStore";

function readCookie(name: string): string | null {
    const match = document.cookie
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function clearCookies() {
    for (const entry of document.cookie.split(";")) {
        const name = entry.split("=")[0]?.trim();
        if (name) {
            // biome-ignore lint/suspicious/noDocumentCookie: jsdom exposes no cookie store
            document.cookie = `${name}=; path=/; max-age=0`;
        }
    }
}

const ADMIN_PANEL: PanelSnapshot = {
    profileKind: "admin",
    panelRequestRole: UserRoleLevel.ADMIN,
    impersonatedFirebaseUid: null,
};

const IMPERSONATING: PanelSnapshot = {
    profileKind: "admin",
    panelRequestRole: UserRoleLevel.COMMON,
    impersonatedFirebaseUid: "target-1",
};

const COMMON_USER: PanelSnapshot = {
    profileKind: "common",
    panelRequestRole: UserRoleLevel.COMMON,
    impersonatedFirebaseUid: null,
};

describe("createPanelStore", () => {
    beforeEach(() => {
        clearCookies();
        window.localStorage.clear();
    });

    it("is born from the server snapshot, with no async hydration", () => {
        const state = createPanelStore(IMPERSONATING).getState();

        expect(state.profileKind).toBe("admin");
        expect(state.panelRequestRole).toBe(UserRoleLevel.COMMON);
        expect(state.impersonatedFirebaseUid).toBe("target-1");
    });

    it("gives each request its own state", () => {
        const first = createPanelStore(IMPERSONATING);
        const second = createPanelStore(ADMIN_PANEL);

        first.getState().setImpersonatedUser("target-9", "Nine");

        expect(first.getState().impersonatedFirebaseUid).toBe("target-9");
        expect(second.getState().impersonatedFirebaseUid).toBeNull();
        expect(second.getState().panelRequestRole).toBe(UserRoleLevel.ADMIN);
    });

    it("enters the common panel when a target is picked from the admin panel", () => {
        const store = createPanelStore(ADMIN_PANEL);
        store.getState().setImpersonatedUser("target-2", "Bruno");

        const state = store.getState();
        expect(state.panelRequestRole).toBe(UserRoleLevel.COMMON);
        expect(state.impersonatedFirebaseUid).toBe("target-2");
        expect(state.impersonatedLabel).toBe("Bruno");
        expect(readCookie(IMPERSONATE_UID_COOKIE)).toBe("target-2");
        expect(readCookie(PANEL_ROLE_COOKIE)).toBe(UserRoleLevel.COMMON);
    });

    it("keeps the label only while there is a target", () => {
        const store = createPanelStore(IMPERSONATING);
        store.getState().setImpersonatedUser("target-2", "Bruno");
        store.getState().setImpersonatedUser(null);

        expect(store.getState().impersonatedFirebaseUid).toBeNull();
        expect(store.getState().impersonatedLabel).toBeNull();
    });

    it("clears the target when switching back to the admin panel", () => {
        const store = createPanelStore(IMPERSONATING);
        store.getState().setPanelRequestRole(UserRoleLevel.ADMIN);

        const state = store.getState();
        expect(state.panelRequestRole).toBe(UserRoleLevel.ADMIN);
        expect(state.impersonatedFirebaseUid).toBeNull();
        expect(state.impersonatedLabel).toBeNull();
        expect(readCookie(IMPERSONATE_UID_COOKIE)).toBeNull();
        expect(readCookie(PANEL_ROLE_COOKIE)).toBe(UserRoleLevel.ADMIN);
    });

    it("refuses the common panel while there is no target to act as", () => {
        const store = createPanelStore(ADMIN_PANEL);
        store.getState().setPanelRequestRole(UserRoleLevel.COMMON);

        expect(store.getState().panelRequestRole).toBe(UserRoleLevel.ADMIN);
    });

    it("never lets a common user leave their own panel", () => {
        const store = createPanelStore(COMMON_USER);
        store.getState().setPanelRequestRole(UserRoleLevel.ADMIN);
        store.getState().setImpersonatedUser("someone-else", "X");

        const state = store.getState();
        expect(state.panelRequestRole).toBe(UserRoleLevel.COMMON);
        expect(state.impersonatedFirebaseUid).toBeNull();
    });

    it("recovers the display label from the mirror after a reload", () => {
        createPanelStore(IMPERSONATING)
            .getState()
            .setImpersonatedUser("target-1", "Ana");

        // A fresh request: the server knows the uid but not the display name.
        const reloaded = createPanelStore(IMPERSONATING);
        expect(reloaded.getState().impersonatedLabel).toBeNull();

        reloaded.getState().hydrateLabelFromMirror();
        expect(reloaded.getState().impersonatedLabel).toBe("Ana");
    });

    it("wipes state, cookies and storage on sign-out", () => {
        const store = createPanelStore(IMPERSONATING);
        store.getState().setImpersonatedUser("target-1", "Ana");

        store.getState().resetPanel();

        const state = store.getState();
        expect(state.profileKind).toBeNull();
        expect(state.impersonatedFirebaseUid).toBeNull();
        expect(state.impersonatedLabel).toBeNull();
        expect(readCookie(PANEL_ROLE_COOKIE)).toBeNull();
        expect(readCookie(IMPERSONATE_UID_COOKIE)).toBeNull();
        expect(readPanelMirror()).toBeNull();
    });
});
