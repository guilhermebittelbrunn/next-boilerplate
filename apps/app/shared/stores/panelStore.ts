"use client";

import { UserRoleLevel } from "@repo/auth/types";
import { create } from "zustand";
import {
    createJSONStorage,
    persist,
    type StateStorage,
} from "zustand/middleware";
import {
    IMPERSONATE_UID_COOKIE,
    PANEL_ROLE_COOKIE,
    type ProfileKind,
} from "@/shared/lib/authRequestHeaders";

type PanelState = {
    /** Session role from `/auth/me` (server truth — not persisted). */
    profileKind: ProfileKind | null;
    /** Admin's effective panel (admin acts as common when COMMON). */
    panelRequestRole: UserRoleLevel;
    impersonatedFirebaseUid: string | null;
    /** Display label of the impersonated user, persisted so the select can render
     * the current choice instantly (before the user list finishes loading). */
    impersonatedLabel: string | null;
    /** True once `/auth/me` has resolved, so headers aren't applied too early. */
    hydrated: boolean;
    setProfileKind: (kind: ProfileKind | null) => void;
    setPanelRequestRole: (role: UserRoleLevel) => void;
    setImpersonatedFirebaseUid: (
        uid: string | null,
        label?: string | null
    ) => void;
    markHydrated: () => void;
    resetPanel: () => void;
};

/**
 * Mirror panel state into a cookie so Server Components (RSC prefetch) can resolve
 * the same effective user the client uses — including impersonation.
 */
const COOKIE_MAX_AGE = 3600;

function writePanelCookie(name: string, value: string | null): void {
    if (typeof document === "undefined") {
        return;
    }
    if (value === null || value === "") {
        // biome-ignore lint/suspicious/noDocumentCookie: sync write mirrored for SSR prefetch
        document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
        return;
    }
    // biome-ignore lint/suspicious/noDocumentCookie: sync write mirrored for SSR prefetch
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

const noopStorage: StateStorage = {
    getItem: () => null,
    // biome-ignore lint/suspicious/noEmptyBlockStatements: SSR no-op storage
    setItem: () => {},
    // biome-ignore lint/suspicious/noEmptyBlockStatements: SSR no-op storage
    removeItem: () => {},
};

export const usePanelStore = create<PanelState>()(
    persist(
        (set) => ({
            profileKind: null,
            panelRequestRole: UserRoleLevel.ADMIN,
            impersonatedFirebaseUid: null,
            impersonatedLabel: null,
            hydrated: false,
            setProfileKind: (kind) => set({ profileKind: kind }),
            setPanelRequestRole: (role) => {
                writePanelCookie(PANEL_ROLE_COOKIE, role);
                set({ panelRequestRole: role });
            },
            setImpersonatedFirebaseUid: (uid, label = null) => {
                writePanelCookie(IMPERSONATE_UID_COOKIE, uid);
                set({
                    impersonatedFirebaseUid: uid,
                    impersonatedLabel: uid ? label : null,
                });
            },
            markHydrated: () => set({ hydrated: true }),
            // Logout: clear panel + impersonation (state + mirrored cookies) so it
            // never leaks into the next user signing in on the same browser.
            resetPanel: () => {
                writePanelCookie(PANEL_ROLE_COOKIE, null);
                writePanelCookie(IMPERSONATE_UID_COOKIE, null);
                set({
                    profileKind: null,
                    panelRequestRole: UserRoleLevel.ADMIN,
                    impersonatedFirebaseUid: null,
                    impersonatedLabel: null,
                    hydrated: false,
                });
            },
        }),
        {
            name: "bp:panel-store",
            storage: createJSONStorage(() =>
                typeof window === "undefined" ? noopStorage : sessionStorage
            ),
            // Only the user's choices persist; session truth re-hydrates each load.
            partialize: (state) => ({
                panelRequestRole: state.panelRequestRole,
                impersonatedFirebaseUid: state.impersonatedFirebaseUid,
                impersonatedLabel: state.impersonatedLabel,
            }),
            // Keep cookies in sync with whatever was rehydrated from sessionStorage.
            onRehydrateStorage: () => (state) => {
                if (!state) {
                    return;
                }
                writePanelCookie(PANEL_ROLE_COOKIE, state.panelRequestRole);
                writePanelCookie(
                    IMPERSONATE_UID_COOKIE,
                    state.impersonatedFirebaseUid
                );
            },
        }
    )
);
